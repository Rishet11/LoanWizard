export const config = {
  mlServiceUrl: process.env.ML_SERVICE_URL ?? 'http://localhost:8000',
  mlMode: process.env.NEXT_PUBLIC_ML_MODE ?? 'mock',
  useMockPerception: process.env.NEXT_PUBLIC_USE_MOCK_PERCEPTION !== 'false',
  databaseUrl: process.env.DATABASE_URL ?? '',
  // Server-side Whisper STT fallback endpoint for the browser perception layer.
  // Empty = disabled (Web Speech API only). Set to the ML service's /transcribe.
  transcribeUrl: process.env.NEXT_PUBLIC_TRANSCRIBE_URL ?? '',
};
