import type { PerceptionEvent, FormData } from '@loan-wizard/contracts';
import type { RefObject } from 'react';
import type { AgentScript } from './script';

export type { AgentScript };
export type { FormData };

// ─── Public config & handle ──────────────────────────────────────────────────

export interface PerceptionConfig {
  sessionId: string;
  sttFallbackUrl?: string;
  sttConfidenceThreshold?: number;
  ageModelUrl?: string;
  onEvent: (event: PerceptionEvent) => void;
  script?: AgentScript;
  // v4 additions (all optional, backward-compatible)
  language?: 'en' | 'hi';
  enableDocCapture?: boolean;
  enableYawChallenge?: boolean;
}

export interface PerceptionHandle {
  status: 'idle' | 'requesting_permissions' | 'ready' | 'running' | 'ended' | 'error';
  videoRef: RefObject<HTMLVideoElement>;
  start: () => Promise<void>;
  stop: () => void;
  error: string | null;
  // v4 additions
  setLanguage: (lang: 'en' | 'hi') => void;
  captureDocument: (docType: 'aadhaar' | 'pan') => Promise<void>;
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export { usePerception } from './hook';
export { PerceptionEngine } from './engine';
export { DEFAULT_SCRIPT } from './script';
