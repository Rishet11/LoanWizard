export interface STTResult {
  text: string;
  confidence: number;
  isFinal: boolean;
}

interface BrowserSpeechAlternative {
  transcript: string;
  confidence?: number;
}

interface BrowserSpeechResult {
  readonly isFinal: boolean;
  readonly [index: number]: BrowserSpeechAlternative;
}

interface BrowserSpeechResultList {
  readonly [index: number]: BrowserSpeechResult;
}

interface BrowserSpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: BrowserSpeechResultList;
}

interface BrowserSpeechRecognitionErrorEvent {
  readonly error: string;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

export class WebSpeechSTT {
  private recognition: BrowserSpeechRecognition | null = null;
  private onResult: (r: STTResult) => void;
  private lang: string;

  constructor(onResult: (r: STTResult) => void, lang = 'en-IN') {
    this.onResult = onResult;
    this.lang = lang;
  }

  start(): void {
    const SpeechRecognitionCtor =
      (window as WindowWithSpeechRecognition).SpeechRecognition ??
      (window as WindowWithSpeechRecognition).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) throw new Error('Web Speech API not available');

    const rec = new SpeechRecognitionCtor();
    this.recognition = rec;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = this.lang;
    rec.maxAlternatives = 1;

    rec.onresult = (event: BrowserSpeechRecognitionEvent) => {
      const r = event.results[event.resultIndex];
      const alt = r[0];
      this.onResult({
        text: alt.transcript.trim(),
        confidence: alt.confidence ?? 0.8,
        isFinal: r.isFinal,
      });
    };

    rec.onerror = (e: BrowserSpeechRecognitionErrorEvent) => {
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
