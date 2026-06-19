import { z } from 'zod';

export const SessionStatusSchema = z.enum([
  'init',
  'permissions_granted',
  'active',
  'processing',
  'offered',
  'accepted',
  'rejected',
  'failed',
]);

export const EmploymentTypeSchema = z.enum([
  'salaried',
  'self_employed',
  'business_owner',
  'unemployed',
  'retired',
]);

export const FormDataSchema = z.object({
  name: z.string().nullable(),
  employment_type: EmploymentTypeSchema.nullable(),
  monthly_income: z.number().nullable(),
  loan_amount_requested: z.number().nullable(),
  purpose: z.string().nullable(),
  declared_age: z.number().nullable().optional(),
});

export const CVSignalSchema = z.object({
  session_id: z.string(),
  timestamp: z.string(),
  age_estimate: z.number().nullable(),
  age_confidence: z.number().min(0).max(1),
  liveness_score: z.number().min(0).max(1),
  face_present: z.boolean(),
  blink_count_window: z.number(),
  head_pose_delta: z.number(),
});

export const TranscriptTurnSchema = z.object({
  turn_idx: z.number(),
  speaker: z.enum(['agent', 'customer']),
  text: z.string(),
  confidence: z.number().min(0).max(1),
  timestamp: z.string(),
  question_id: z.string().optional(),
});

export const RiskScoreInputSchema = z.object({
  session_id: z.string(),
  form_data: FormDataSchema,
  cv_signals_summary: z.object({
    avg_age_estimate: z.number().nullable(),
    avg_liveness: z.number(),
    min_liveness: z.number(),
    face_present_ratio: z.number(),
  }),
  geo: z.object({ lat: z.number(), lng: z.number() }).optional(),
  bureau_mock: z.object({
    cibil_score_proxy: z.number(),
    existing_loans: z.number(),
    default_history: z.boolean(),
  }).optional(),
});

export const RiskScoreOutputSchema = z.object({
  risk_band: z.enum(['low', 'medium', 'high']),
  risk_score: z.number().min(0).max(1),
  feature_importance: z.record(z.number()),
});

export const PersonaClassificationOutputSchema = z.object({
  persona: z.enum(['salaried_prime', 'self_employed_thin_file', 'high_aspiration', 'cautious_saver', 'risky']),
  confidence: z.number().min(0).max(1),
  context_notes: z.array(z.string()),
});

export const OfferSchema = z.object({
  session_id: z.string(),
  eligible: z.boolean(),
  amount: z.number().nullable(),
  interest_rate: z.number().nullable(),
  tenure_months: z.number().nullable(),
  emi: z.number().nullable(),
  risk_band: z.enum(['low', 'medium', 'high']),
  persona: z.string(),
  reason_codes: z.array(z.object({
    code: z.string(),
    label: z.string(),
    weight: z.number(),
  })),
  rejection_reason: z.string().nullable(),
  generated_at: z.string(),
});
