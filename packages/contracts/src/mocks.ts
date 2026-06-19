import type {
  FormData,
  CVSignal,
  Offer,
  RiskScoreOutput,
  PersonaClassificationOutput,
  PerceptionEvent,
  TranscriptTurn,
} from './types';

export const MOCK_FORM_DATA: FormData = {
  name: 'Rahul Sharma',
  employment_type: 'salaried',
  monthly_income: 75000,
  loan_amount_requested: 500000,
  purpose: 'home renovation',
  declared_age: 28,
};

export const MOCK_CV_SIGNAL: CVSignal = {
  session_id: 'mock-session-001',
  timestamp: new Date().toISOString(),
  age_estimate: 29,
  age_confidence: 0.82,
  liveness_score: 0.95,
  face_present: true,
  blink_count_window: 3,
  head_pose_delta: 4.2,
};

export const MOCK_RISK_OUTPUT: RiskScoreOutput = {
  risk_band: 'low',
  risk_score: 0.18,
  feature_importance: {
    monthly_income: 0.35,
    cibil_score_proxy: 0.28,
    employment_type: 0.15,
    loan_to_income_ratio: 0.12,
    age: 0.10,
  },
};

export const MOCK_PERSONA: PersonaClassificationOutput = {
  persona: 'salaried_prime',
  confidence: 0.88,
  context_notes: ['consistent employment signals', 'reasonable loan-to-income ratio'],
};

export const MOCK_OFFER: Offer = {
  session_id: 'mock-session-001',
  eligible: true,
  amount: 500000,
  interest_rate: 13.5,
  tenure_months: 36,
  emi: 16961,
  risk_band: 'low',
  persona: 'salaried_prime',
  reason_codes: [
    { code: 'STABLE_INCOME', label: 'Stable monthly income', weight: 0.35 },
    { code: 'GOOD_CREDIT', label: 'Strong credit profile', weight: 0.28 },
    { code: 'LOW_LTV', label: 'Healthy loan-to-income ratio', weight: 0.22 },
  ],
  rejection_reason: null,
  generated_at: new Date().toISOString(),
  fraud_score: 0.05,
  reason_narrative: 'Stable income with a clean credit profile makes this a low-risk applicant.',
  model_versions: { risk: '1.2.0', fraud: '0.1.0', persona_rules: '1.0.0' },
};

export const MOCK_TRANSCRIPT: TranscriptTurn[] = [
  { turn_idx: 0, speaker: 'agent', text: 'Hi, may I know your full name please?', confidence: 1, timestamp: new Date().toISOString(), question_id: 'name' },
  { turn_idx: 1, speaker: 'customer', text: 'Rahul Sharma', confidence: 0.92, timestamp: new Date().toISOString(), question_id: 'name' },
  { turn_idx: 2, speaker: 'agent', text: 'What is your age?', confidence: 1, timestamp: new Date().toISOString(), question_id: 'age' },
  { turn_idx: 3, speaker: 'customer', text: 'I am 28 years old', confidence: 0.94, timestamp: new Date().toISOString(), question_id: 'age' },
  { turn_idx: 4, speaker: 'agent', text: 'What is your current employment?', confidence: 1, timestamp: new Date().toISOString(), question_id: 'employment' },
  { turn_idx: 5, speaker: 'customer', text: 'I work as a software engineer, salaried job', confidence: 0.89, timestamp: new Date().toISOString(), question_id: 'employment' },
  { turn_idx: 6, speaker: 'agent', text: 'What is your monthly income?', confidence: 1, timestamp: new Date().toISOString(), question_id: 'income' },
  { turn_idx: 7, speaker: 'customer', text: 'My monthly salary is 75 thousand rupees', confidence: 0.91, timestamp: new Date().toISOString(), question_id: 'income' },
  { turn_idx: 8, speaker: 'agent', text: 'What is the loan purpose?', confidence: 1, timestamp: new Date().toISOString(), question_id: 'purpose' },
  { turn_idx: 9, speaker: 'customer', text: 'Home renovation', confidence: 0.9, timestamp: new Date().toISOString(), question_id: 'purpose' },
  { turn_idx: 10, speaker: 'agent', text: 'How much would you like to borrow?', confidence: 1, timestamp: new Date().toISOString(), question_id: 'loan_amount' },
  { turn_idx: 11, speaker: 'customer', text: 'Five lakh rupees', confidence: 0.93, timestamp: new Date().toISOString(), question_id: 'loan_amount' },
  { turn_idx: 12, speaker: 'agent', text: 'Do you consent to video KYC and credit bureau checks?', confidence: 1, timestamp: new Date().toISOString(), question_id: 'kyc_consent' },
  { turn_idx: 13, speaker: 'customer', text: 'Yes, I consent to video KYC and credit checks', confidence: 0.95, timestamp: new Date().toISOString(), question_id: 'kyc_consent' },
];

export const MOCK_PERCEPTION_EVENT_SEQUENCE: PerceptionEvent[] = [
  { type: 'permission_granted', payload: { camera: true, mic: true, geo: true } },
  { type: 'device_fingerprint', payload: { ua: 'LoanWizard public demo', screen: { w: 1440, h: 900, dpr: 2 }, canvas_hash: 'demo_canvas_hash_9f42', timezone: 'Asia/Kolkata', lang: 'en-IN' } },
  { type: 'question_asked', payload: { question_id: 'name', text: 'What is your full name?' } },
  { type: 'transcript_turn', payload: MOCK_TRANSCRIPT[1] },
  { type: 'form_field_extracted', payload: { field: 'name', value: 'Rahul Sharma', confidence: 0.92 } },
  { type: 'cv_signal', payload: { ...MOCK_CV_SIGNAL, liveness_score: 0.91, blink_count_window: 1, head_pose_delta: 2.4, texture_score: 0.84 } },
  { type: 'question_asked', payload: { question_id: 'age', text: 'What is your age?' } },
  { type: 'transcript_turn', payload: MOCK_TRANSCRIPT[3] },
  { type: 'form_field_extracted', payload: { field: 'declared_age', value: 28, confidence: 0.94 } },
  { type: 'challenge_requested', payload: { challenge: 'yaw', instruction: 'Please slowly look left, then right.' } },
  { type: 'challenge_completed', payload: { challenge: 'yaw', passed: true } },
  { type: 'question_asked', payload: { question_id: 'employment', text: 'What is your current employment?' } },
  { type: 'transcript_turn', payload: MOCK_TRANSCRIPT[5] },
  { type: 'form_field_extracted', payload: { field: 'employment_type', value: 'salaried', confidence: 0.89 } },
  { type: 'question_asked', payload: { question_id: 'income', text: 'What is your monthly income?' } },
  { type: 'transcript_turn', payload: MOCK_TRANSCRIPT[7] },
  { type: 'form_field_extracted', payload: { field: 'monthly_income', value: 75000, confidence: 0.91 } },
  { type: 'cv_signal', payload: { ...MOCK_CV_SIGNAL, liveness_score: 0.96, blink_count_window: 3, head_pose_delta: 5.1, texture_score: 0.88 } },
  { type: 'question_asked', payload: { question_id: 'purpose', text: 'What is the loan purpose?' } },
  { type: 'transcript_turn', payload: MOCK_TRANSCRIPT[9] },
  { type: 'form_field_extracted', payload: { field: 'purpose', value: 'home renovation', confidence: 0.9 } },
  { type: 'question_asked', payload: { question_id: 'loan_amount', text: 'How much would you like to borrow?' } },
  { type: 'transcript_turn', payload: MOCK_TRANSCRIPT[11] },
  { type: 'form_field_extracted', payload: { field: 'loan_amount_requested', value: 500000, confidence: 0.93 } },
  { type: 'document_capture_started', payload: { doc_type: 'pan' } },
  { type: 'document_captured', payload: { doc_type: 'pan', ocr: { name: 'RAHUL SHARMA', pan: 'ABCDE1234F' }, image_hash: 'demo_pan_hash_7b2', confidence: 0.93 } },
  { type: 'question_asked', payload: { question_id: 'kyc_consent', text: 'Do you consent to video KYC and credit bureau checks?' } },
  { type: 'transcript_turn', payload: MOCK_TRANSCRIPT[13] },
  { type: 'consent_captured', payload: { consent_type: 'video_kyc', verbal_text: 'Yes, I consent to video KYC and credit checks', audio_ref: null, text_hash: 'demo_video_kyc_consent_hash' } },
  { type: 'consent_captured', payload: { consent_type: 'data_processing', verbal_text: 'Yes, I consent to video KYC and credit checks', audio_ref: null, text_hash: 'demo_data_processing_consent_hash' } },
  { type: 'consent_captured', payload: { consent_type: 'credit_pull', verbal_text: 'Yes, I consent to video KYC and credit checks', audio_ref: null, text_hash: 'demo_credit_pull_consent_hash' } },
  { type: 'session_ended', payload: { reason: 'complete' } },
];
