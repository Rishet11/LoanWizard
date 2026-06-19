import type { PerceptionEvent, FormData, CVSignal } from '@loan-wizard/contracts';
import { requestMedia, stopStream, attachStreamToVideo } from './media/webrtc';
import { captureGeo } from './media/geo';
import { speak } from './tts/browser-tts';
import { WebSpeechSTT } from './stt/web-speech';
import { STTRouter } from './stt/router';
import { detectFaces } from './cv/face-detector';
import { LivenessTracker } from './cv/liveness';
import { AgeEstimator } from './cv/age-estimator';
import { captureDocument as runDocCapture, isDocumentReady } from './cv/doc-capture';
import { buildFingerprint } from './fingerprint';
import { buildConsentEvidence } from './consent';
import { detectLang, langToSTTLocale, langToTTSLocale } from './stt/lang-detect';
import { DEFAULT_SCRIPT, type AgentScript } from './script';
import type { PerceptionConfig } from './index';

const CV_INTERVAL_MS = 500; // 2 Hz
// Trigger yaw challenge after the 2nd question (index 2)
const YAW_CHALLENGE_AFTER_Q = 2;

export class PerceptionEngine {
  private config: PerceptionConfig;
  private script: AgentScript;
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private sttRouter: STTRouter;
  private webSpeech: WebSpeechSTT | null = null;
  private liveness = new LivenessTracker();
  private ageEstimator: AgeEstimator;
  private cvLoopId: ReturnType<typeof setInterval> | null = null;
  private turnIdx = 0;
  private questionIdx = 0;
  private isRunning = false;
  private formData: Partial<FormData> = {};
  private currentLang: 'en' | 'hi';
  private langDetected = false;
  private yawChallengeTriggered = false;

  constructor(config: PerceptionConfig) {
    this.config = config;
    this.script = config.script ?? DEFAULT_SCRIPT;
    this.currentLang = config.language ?? 'en';
    this.sttRouter = new STTRouter({
      sttFallbackUrl: config.sttFallbackUrl,
      sttConfidenceThreshold: config.sttConfidenceThreshold,
    });
    this.ageEstimator = new AgeEstimator(config.ageModelUrl);
  }

  attachVideo(el: HTMLVideoElement): void {
    this.videoEl = el;
    if (this.stream) attachStreamToVideo(this.stream, el);
  }

  setLanguage(lang: 'en' | 'hi'): void {
    this.currentLang = lang;
  }

  async captureDocument(docType: 'aadhaar' | 'pan'): Promise<void> {
    if (!this.videoEl) return;
    this.emit({ type: 'document_capture_started', payload: { doc_type: docType } });

    // Wait up to 5s for the frame to look ready (variance check)
    let waited = 0;
    while (!isDocumentReady(this.videoEl) && waited < 5000) {
      await new Promise((r) => setTimeout(r, 300));
      waited += 300;
    }

    const result = await runDocCapture(this.videoEl, docType);
    this.emit({
      type: 'document_captured',
      payload: {
        doc_type: docType,
        ocr: result.fields,
        image_hash: result.imageHash,
        confidence: result.confidence,
      },
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // 1. Brief pause so Windows camera driver releases after PermissionGate
      await new Promise((r) => setTimeout(r, 250));
      if (!this.isRunning) return;

      // 2. Request camera + mic stream
      const media = await requestMedia();
      if (!this.isRunning) { stopStream(media.stream); return; }
      this.stream = media.stream;
      if (this.videoEl) attachStreamToVideo(this.stream, this.videoEl);

      // 3. Emit permission_granted
      this.emit({ type: 'permission_granted', payload: { camera: true, mic: true, geo: false } });

      // 4. Emit device fingerprint (one-shot, non-blocking)
      buildFingerprint().then((fp) => {
        this.emit({ type: 'device_fingerprint', payload: fp });
      }).catch(() => {});

      // 5. Start audio capture
      this.sttRouter.startAudioCapture(this.stream!);

      // 6. Load TF.js models (non-blocking)
      this.ageEstimator.load().catch(() => {});

      // 7. Start CV loop
      this.startCVLoop();

      // 8. Geo in background
      captureGeo().catch(() => {});

      // 9. Run scripted agent flow
      await this.runScript();

    } catch (err) {
      if (this.isRunning) {
        this.emit({ type: 'error', payload: { code: 'START_FAILED', message: String(err) } });
        this.stop();
      }
    }
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.webSpeech?.stop();
    this.sttRouter.stopAudioCapture();
    this.stopCVLoop();
    if (this.stream) { stopStream(this.stream); this.stream = null; }
    this.liveness.reset();
    this.ageEstimator.reset();
    this.emit({ type: 'session_ended', payload: { reason: 'complete' } });
  }

  private emit(event: PerceptionEvent): void {
    this.config.onEvent(event);
  }

  private ttsLang(): string {
    return langToTTSLocale(this.currentLang);
  }

  // ─── scripted flow ──────────────────────────────────────────────────────────

  private async runScript(): Promise<void> {
    for (this.questionIdx = 0; this.questionIdx < this.script.questions.length; this.questionIdx++) {
      if (!this.isRunning) break;
      const q = this.script.questions[this.questionIdx];

      // Trigger yaw challenge once, after a set question
      if (
        this.questionIdx === YAW_CHALLENGE_AFTER_Q &&
        !this.yawChallengeTriggered &&
        (this.config.enableYawChallenge ?? true)
      ) {
        this.yawChallengeTriggered = true;
        await this.runYawChallenge();
        if (!this.isRunning) break;
      }

      this.emit({ type: 'question_asked', payload: { question_id: q.id, text: q.text } });
      await speak(q.text, { lang: this.ttsLang() });

      const answer = await this.listenForAnswer(12000);
      if (!answer) continue;

      // Auto-detect language on first customer response
      if (!this.langDetected) {
        const detected = detectLang(answer.text, answer.confidence);
        if (detected && detected !== this.currentLang) {
          this.currentLang = detected;
          this.emit({ type: 'language_detected', payload: { lang: detected } });
        }
        this.langDetected = true;
      }

      const customerTurn = {
        turn_idx: this.turnIdx++,
        speaker: 'customer' as const,
        text: answer.text,
        confidence: answer.confidence,
        timestamp: new Date().toISOString(),
        question_id: q.id,
      };
      this.emit({ type: 'transcript_turn', payload: customerTurn });

      // Capture consent evidence for the kyc_consent question
      if (q.id === 'kyc_consent') {
        const audioBlob = this.sttRouter.getLastAudioBlob?.() ?? null;
        buildConsentEvidence('video_kyc', answer.text, audioBlob).then((ev) => {
          this.emit({ type: 'consent_captured', payload: ev });
        }).catch(() => {});
        buildConsentEvidence('data_processing', answer.text, null).then((ev) => {
          this.emit({ type: 'consent_captured', payload: ev });
        }).catch(() => {});
        buildConsentEvidence('credit_pull', answer.text, null).then((ev) => {
          this.emit({ type: 'consent_captured', payload: ev });
        }).catch(() => {});
        continue; // consent question doesn't extract a form field
      }

      const extracted = q.extractor(answer.text);
      if (extracted) {
        this.emit({
          type: 'form_field_extracted',
          payload: { field: q.expectedField, value: extracted.value, confidence: extracted.confidence },
        });
        (this.formData as any)[q.expectedField] = extracted.value;
      }
    }

    if (this.isRunning) this.stop();
  }

  private runYawChallenge(): Promise<void> {
    return new Promise((resolve) => {
      const instruction = 'For security, please slowly look to your left, then back to your right.';
      this.emit({ type: 'challenge_requested', payload: { challenge: 'yaw', instruction } });

      speak(instruction, { lang: this.ttsLang() }).then(() => {
        const frameW = this.videoEl?.videoWidth ?? 640;
        this.liveness.startYawChallenge(frameW, (passed) => {
          this.emit({ type: 'challenge_completed', payload: { challenge: 'yaw', passed } });
          resolve();
        });
        // Timeout safety: resolve after 6s regardless
        setTimeout(resolve, 6000);
      });
    });
  }

  private listenForAnswer(timeoutMs: number): Promise<{ text: string; confidence: number } | null> {
    return new Promise((resolve) => {
      let settled = false;
      const settle = (r: { text: string; confidence: number } | null) => {
        if (settled) return;
        settled = true;
        this.webSpeech?.stop();
        this.webSpeech = null;
        resolve(r);
      };

      const timer = setTimeout(() => settle(null), timeoutMs);
      const locale = langToSTTLocale(this.currentLang);

      this.webSpeech = new WebSpeechSTT(async (result) => {
        if (!result.isFinal) return;
        clearTimeout(timer);
        const resolved = await this.sttRouter.resolve(result);
        settle({ text: resolved.text, confidence: resolved.confidence });
      }, locale);

      try {
        this.webSpeech.start();
      } catch {
        clearTimeout(timer);
        settle(null);
      }
    });
  }

  // ─── CV loop ────────────────────────────────────────────────────────────────

  private startCVLoop(): void {
    this.cvLoopId = setInterval(async () => {
      if (!this.videoEl || !this.isRunning) return;
      try {
        const faces = await detectFaces(this.videoEl);
        const facePresent = faces.length > 0;
        const now = Date.now();

        let ageEstimate: number | null = null;
        let ageConfidence = 0;
        let livenessScore = 0;
        let blinkCount = 0;
        let headPoseDelta = 0;
        let textureScore: number | null = null;

        if (facePresent) {
          const face = faces[0];
          const lv = this.liveness.update(face, now, this.videoEl);
          blinkCount = lv.blinkCount;
          headPoseDelta = lv.headPoseDelta;
          textureScore = lv.textureScore;
          livenessScore = this.liveness.getLivenessScore(now);

          const age = await this.ageEstimator.estimate(this.videoEl);
          if (age) { ageEstimate = age.age; ageConfidence = age.confidence; }
        }

        const signal: CVSignal = {
          session_id: this.config.sessionId,
          timestamp: new Date(now).toISOString(),
          age_estimate: ageEstimate,
          age_confidence: ageConfidence,
          liveness_score: livenessScore,
          face_present: facePresent,
          blink_count_window: blinkCount,
          head_pose_delta: headPoseDelta,
          texture_score: textureScore,
        };
        this.emit({ type: 'cv_signal', payload: signal });
      } catch {
        // non-fatal
      }
    }, CV_INTERVAL_MS);
  }

  private stopCVLoop(): void {
    if (this.cvLoopId !== null) { clearInterval(this.cvLoopId); this.cvLoopId = null; }
  }
}
