export interface TTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  // Prefer an exact locale match, fall back to language prefix
  return (
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(lang.split('-')[0])) ??
    null
  );
}

export function speak(text: string, opts: TTSOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const targetLang = opts.lang ?? 'en-IN';
    utter.lang = targetLang;
    utter.rate = opts.rate ?? 0.9;
    utter.pitch = opts.pitch ?? 1.0;

    // Assign best available voice — without this some browsers ignore utter.lang
    const voice = pickVoice(targetLang);
    if (voice) utter.voice = voice;

    utter.onend = () => resolve();
    // Don't hard-reject on TTS error — just resolve so the script keeps moving
    utter.onerror = () => resolve();
    synth.speak(utter);

    // Fallback: if speechSynthesis never fires onend (known Chrome bug on Windows)
    const watchdog = setTimeout(() => resolve(), Math.max(3000, text.length * 80));
    utter.onend = () => { clearTimeout(watchdog); resolve(); };
  });
}
