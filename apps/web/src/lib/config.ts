export const config = {
  mlServiceUrl: process.env.ML_SERVICE_URL ?? 'http://localhost:8000',
  mlMode: process.env.NEXT_PUBLIC_ML_MODE ?? 'mock',
  useMockPerception: process.env.NEXT_PUBLIC_USE_MOCK_PERCEPTION !== 'false',
  databaseUrl: process.env.DATABASE_URL ?? '',
};
