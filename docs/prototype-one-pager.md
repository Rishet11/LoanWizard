# LoanWizard - Prototype One-Pager

## What It Is

LoanWizard is an AI video loan-origination prototype for Indian digital lending.
The customer opens a web link, answers a short spoken interview, and receives an
instant explainable loan offer. The system combines browser perception, a
FastAPI/Keras risk service, and a Postgres audit trail.

## What Judges Can Verify

- Public HF web demo with scripted perception for a reliable end-to-end flow.
- Live HF ML service with real `/health`, `/docs`, `/offer`, `/fairness/report`,
  and `/drift/*` endpoints.
- Local real-camera mode using browser camera, speech, TF.js liveness, OCR hooks,
  and the real Keras scoring service.
- Admin console with session timeline, evidence, fairness, drift, and decision
  replay.

## Real Engineering

- Keras risk MLP and fraud MLP with committed model weights.
- Browser-side TensorFlow.js liveness, document-capture, speech, and device
  fingerprinting pipeline.
- Prisma and SQLAlchemy audit tables with frozen decision snapshots.
- Reason codes, model versions, and plain-language offer explanations.
- English/Hindi-ready interview flow and compliance-oriented KFS output.

## Demo Honesty

The hosted public link uses scripted perception and a mock offer for reliability.
The real ML service is live separately and the real camera path is used locally
for the recorded demo. This separates judging reliability from model
verifiability.

## Stack

Next.js 14, React, Tailwind, FastAPI, TensorFlow/Keras, TensorFlow.js, Prisma,
SQLAlchemy, PostgreSQL, pnpm, Turborepo, Hugging Face Spaces, and Neon.
