'use client';
import { useEffect } from 'react';
import type { PerceptionEvent } from '@loan-wizard/contracts';
import { MOCK_PERCEPTION_EVENT_SEQUENCE } from '@loan-wizard/contracts';

export function useMockPerception(onEvent: (e: PerceptionEvent) => void) {
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < MOCK_PERCEPTION_EVENT_SEQUENCE.length) {
        onEvent(MOCK_PERCEPTION_EVENT_SEQUENCE[i++]);
      } else {
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [onEvent]);
}
