// ============ Session ============
export type SessionStatus =
  | 'init'
  | 'permissions_granted'
  | 'active'
  | 'processing'
  | 'offered'
  | 'accepted'
  | 'rejected'
  | 'failed';

export interface SessionMeta {
  session_id: string;
  created_at: string; // ISO timestamp
  campaign_source: 'sms' | 'whatsapp' | 'email' | 'direct';
  device_user_agent: string;
  ip_address?: string;
  geo_lat?: number;
  geo_lng?: number;
}

// ============ Transcript ============
export interface TranscriptTurn {
  turn_idx: number;
  speaker: 'agent' | 'customer';
  text: string;
  confidence: number; // 0-1
  timestamp: string; // ISO
  question_id?: string; // 'name' | 'employment' | 'income' | 'purpose' | 'consent' | 'acceptance'
}

// ============ CV Signals ============
export interface CVSignal {
  session_id: string;
  timestamp: string;
  age_estimate: number | null;
  age_confidence: number; // 0-1
  liveness_score: number; // 0-1
  face_present: boolean;
  blink_count_window: number; // blinks in last 5 sec
  head_pose_delta: number; // degrees moved since last frame
  texture_score?: number | null; // 0-1, anti-deepfake Laplacian sharpness
}

// ============ Form Data ============
export type EmploymentType = 'salaried' | 'self_employed' | 'business_owner' | 'unemployed' | 'retired';

export interface FormData {
  name: string | null;
  employment_type: EmploymentType | null;
  monthly_income: number | null; // INR
  loan_amount_requested: number | null; // INR
  purpose: string | null;
  declared_age?: number | null;
}

// ============ Device Fingerprint ============
export interface DeviceFingerprint {
  ua: string;
  canvas_hash: string;
  timezone: string;
  session_age_sec?: number;
  form_mutations?: number;
  transcript_length?: number;
  canvas_hash_cohort_size?: number;
}

// ============ ML Inputs & Outputs ============
export interface RiskScoreInput {
  session_id: string;
  tenant_id?: string;
  form_data: FormData;
  cv_signals_summary: {
    avg_age_estimate: number | null;
    avg_liveness: number;
    min_liveness: number;
    face_present_ratio: number;
    texture_score_avg?: number;
  };
  geo?: { lat: number; lng: number };
  bureau_mock?: {
    cibil_score_proxy: number;
    existing_loans: number;
    default_history: boolean;
  };
  device_fingerprint?: DeviceFingerprint;
  transcript_snippets?: string[];
}

export interface RiskScoreOutput {
  risk_band: 'low' | 'medium' | 'high';
  risk_score: number; // 0-1
  feature_importance: Record<string, number>;
}

export interface PersonaClassificationOutput {
  persona: 'salaried_prime' | 'self_employed_thin_file' | 'high_aspiration' | 'cautious_saver' | 'risky';
  confidence: number;
  context_notes: string[];
}

// ============ Policy ============
export interface PolicyResult {
  passed: boolean;
  failed_rules: string[]; // e.g. ['age_below_21', 'income_below_minimum']
  passed_rules: string[];
}

// ============ Offer ============
export interface Offer {
  session_id: string;
  eligible: boolean;
  amount: number | null; // INR
  interest_rate: number | null; // annual, percent
  tenure_months: number | null;
  emi: number | null; // INR
  risk_band: 'low' | 'medium' | 'high';
  persona: string;
  reason_codes: Array<{ code: string; label: string; weight: number }>;
  rejection_reason: string | null;
  generated_at: string; // ISO
  // v4 additions
  fraud_score?: number | null;
  reason_narrative?: string | null;
  model_versions?: { risk: string; fraud: string; persona_rules: string } | null;
}

// ============ Consent & Audit ============
export interface ConsentRecord {
  session_id: string;
  consent_type: 'data_processing' | 'recording' | 'offer_acceptance';
  verbal_text: string;
  audio_ref: string | null;
  timestamp: string;
}

export interface AuditDecision {
  session_id: string;
  policy_result: PolicyResult;
  risk_output: RiskScoreOutput;
  persona_output: PersonaClassificationOutput;
  final_offer: Offer;
  decision_timestamp: string;
}

// ============ Perception Event Bus (Stream A to Stream C) ============
export type PerceptionEvent =
  | { type: 'permission_granted'; payload: { camera: boolean; mic: boolean; geo: boolean } }
  | { type: 'transcript_turn'; payload: TranscriptTurn }
  | { type: 'cv_signal'; payload: CVSignal }
  | { type: 'form_field_extracted'; payload: { field: keyof FormData; value: any; confidence: number } }
  | { type: 'question_asked'; payload: { question_id: string; text: string } }
  | { type: 'session_ended'; payload: { reason: 'complete' | 'user_abort' | 'error' } }
  | { type: 'error'; payload: { code: string; message: string } }
  // v4 additions
  | { type: 'language_detected'; payload: { lang: 'en' | 'hi' } }
  | { type: 'device_fingerprint'; payload: {
      ua: string;
      screen: { w: number; h: number; dpr: number };
      canvas_hash: string;
      timezone: string;
      lang: string;
    };
  }
  | { type: 'document_capture_started'; payload: { doc_type: 'aadhaar' | 'pan' } }
  | { type: 'document_captured'; payload: {
      doc_type: 'aadhaar' | 'pan';
      ocr: Record<string, string>;
      image_hash: string;
      confidence: number;
    };
  }
  | { type: 'challenge_requested'; payload: { challenge: 'yaw'; instruction: string } }
  | { type: 'challenge_completed'; payload: { challenge: 'yaw'; passed: boolean } }
  | { type: 'consent_captured'; payload: {
      consent_type: 'video_kyc' | 'data_processing' | 'credit_pull';
      verbal_text: string;
      audio_ref: string | null;
      text_hash: string;
    };
  };
