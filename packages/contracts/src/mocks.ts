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
  { turn_idx: 2, speaker: 'agent', text: 'What is your current employment?', confidence: 1, timestamp: new Date().toISOString(), question_id: 'employment' },
  { turn_idx: 3, speaker: 'customer', text: 'I work as a software engineer, salaried job', confidence: 0.89, timestamp: new Date().toISOString(), question_id: 'employment' },
];

export const MOCK_PERCEPTION_EVENT_SEQUENCE: PerceptionEvent[] = [
  { type: 'permission_granted', payload: { camera: true, mic: true, geo: true } },
  { type: 'question_asked', payload: { question_id: 'name', text: 'What is your full name?' } },
  { type: 'transcript_turn', payload: MOCK_TRANSCRIPT[1] },
  { type: 'form_field_extracted', payload: { field: 'name', value: 'Rahul Sharma', confidence: 0.92 } },
  { type: 'cv_signal', payload: MOCK_CV_SIGNAL },
  { type: 'session_ended', payload: { reason: 'complete' } },
];
