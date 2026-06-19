export interface STTResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

export class WebSpeechSTT {
  private recognition: SpeechRecognition | null = null;
  private onResult: (r: STTResult) => void;
  private lang: string;

  constructor(onResult: (r: STTResult) => void, lang = 'en-IN') {
    this.onResult = onResult;
    this.lang = lang;
  }

  start(): void {
    const SpeechRecognition =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) throw new Error('Web Speech API not available');

    const rec = new SpeechRecognition() as SpeechRecognition;
    this.recognition = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = this.lang;
    rec.maxAlternatives = 1;

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const r = event.results[event.resultIndex];
      const alt = r[0];
      this.onResult({
        text: alt.transcript.trim(),
        confidence: alt.confidence ?? 0.8,
        isFinal: r.isFinal,
      });
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.warn('[STT] Web Speech error:', e.error);
      }
    };

    rec.start();
  }

  stop(): void {
    this.recognition?.stop();
    this.recognition = null;
  }
}
