# LoanWizard: Reviewer and Judge Q&A

A straight-talking set of questions we expect, with honest answers. Grouped by theme.

---

## Product and problem

**What problem are you solving?**
Personal loan origination in India is still slow and manual: branch visits, photocopied documents, hand-keyed forms, and multi-day waits. Video-KYC made remote onboarding legal but most products just bolt a video call onto the old paper process. We make the interview itself the application and return an explainable decision in under two minutes.

**Who is the user?**
Two users. The borrower, who applies by talking to their camera. And the lender or compliance team, who needs every decision to be auditable, explainable and fair.

**Why video instead of a normal web form?**
Video gives you identity verification (liveness plus document match), fraud signals, and a natural way to fill the form by voice, all in one continuous flow. It also satisfies RBI Video-KYC, which a plain form cannot.

**What is genuinely novel here?**
The decision pipeline is real and explainable end to end, the interview drives the form by voice, and the whole thing is wrapped in an auditable, replayable record. The landing page is an Operator Console that shows the machine working rather than describing it.

---

## The machine learning

**Is the ML real or mocked?**
Real. A `POST /offer` runs a Keras risk MLP, a Keras fraud MLP, a rules-based persona classifier, a policy engine, a bureau merge step and a reason narrator, then writes an audit row and a frozen snapshot. Models are pre-trained and committed under `apps/ml-service/app/models/`. The bureau pull is mocked because we do not have live CIBIL or Experian credentials, but it sits behind an adapter so a real pull is a drop-in.

**How were the models trained?**
On synthetic data that we generate (`scripts/generate_synthetic_data.py`) and train with `scripts/train_risk_model.py` and `scripts/train_fraud_model.py`. The synthetic set and training scripts are in the repo, so the models are reproducible.

**How is the rate actually decided?**
The policy engine applies hard eligibility rules first. The risk MLP produces a risk band, the offer builder maps band plus policy to amount, rate, tenure and EMI, and soft flags (thin file, high LTV) add small rate adjustments. The output includes weighted reason codes.

**Why should anyone trust a black-box model for lending?**
We do not ship a black box. Every offer carries weighted reason codes and a plain-language narrative. The exact input snapshot is frozen, so the decision can be replayed on the same features. The admin console exposes fairness across cohorts and feature drift over time.

**What about model bias and fair lending?**
There is a fairness report in the admin dashboard that evaluates outcomes across a cohort file, and a drift tracker that compares live feature distributions against the training baseline. These are the hooks a risk team would use to monitor for disparate impact.

---

## Fraud and security

**How do you stop someone holding up a photo or a video of another person?**
Passive liveness combines blink detection, head-pose movement and a texture score. The fraud MLP also factors device fingerprint and behavioural signals. The contract includes an optional texture score field specifically for anti-deepfake scoring.

**What stops form tampering or replay?**
The form is filled from perception events tied to a server session, and the offer is computed server-side from persisted data, not from anything the client submits directly. Decisions are written with model versions and a frozen snapshot.

**How is user data protected?**
Connections are local in the demo. In production, recordings are encrypted and retained per RBI rules, consent is captured explicitly under DPDP 2023, and there is a right-to-forget endpoint that deletes a session record.

---

## Compliance

**Is this actually RBI Video-KYC compliant?**
It is built to that playbook: a live video interview, liveness checks, a recording retention notice, and an auditable decision trail. A production rollout would still need the lender's own regulatory sign-off, but the building blocks are here.

**What about DPDP 2023?**
There is a consent banner, disclosed data usage, and a right-to-forget endpoint. Consent events are captured as part of the session.

**What is the cool-off period?**
A 3-day cool-off is surfaced on the accepted screen, per RBI digital lending guidelines, during which the applicant can cancel without penalty. A Key Fact Statement is downloadable.

---

## Architecture and engineering

**Why a three-service monorepo?**
We split the work into three streams (perception, ML, web) against a frozen shared contract package, so each could be built independently and integrated through typed events and a single offer API. It also mirrors how a real org would own these surfaces.

**Why two databases technologies, Prisma and SQLAlchemy?**
One Postgres database, two ORMs. The web app uses Prisma for its session and audit tables; the ML service uses SQLAlchemy for its decisions and snapshot tables. They share the same database.

**What is mocked versus real?**
Real: the full ML decision pipeline, the policy engine, the audit and snapshot writes, the session state machine, the web UI and admin. Mocked or optional: the bureau pull (behind an adapter), the LLM narration (template by default, Gemini/Gemma optional), and perception can run on canned events for a no-camera demo.

**How does the frontend stay this distinctive?**
Tailwind v4 with CSS-variable design tokens (a pine, brass and bone palette), a Fraunces and Space Grotesk and JetBrains Mono type system, and a single-screen Operator Console layout instead of the usual scrolling marketing template. Tenant theming and dark mode come from the same tokens.

**Does it scale?**
The ML service is stateless per request and horizontally scalable behind a load balancer. Perception runs in the browser, so the heavy CV work is on the client. Postgres is the shared state. Nothing in the request path holds session state in memory in production.

---

## Demo and operations

**How do I run it?**
See the README. `docker compose up -d` for Postgres and the ML service, `prisma db push` for the web tables, then `pnpm --filter @loan-wizard/web dev`. There is also a native path if Docker is unavailable.

**What if the camera is blocked or unavailable?**
Set `USE_MOCK_PERCEPTION=true` to drive the flow from canned perception events, which is how we demo without a webcam.

**What broke during the build and how did you handle it?**
The most instructive one: a full disk caused Docker to corrupt its metadata and Python installs to fail. We diagnosed it to the root cause (disk space), freed it, and pivoted the ML service to run natively. We also fixed a class of invisible buttons caused by referencing a Tailwind color token that did not exist in the v4 setup.

---

## What is next

- Live bureau integrations behind the existing adapter.
- Stronger deepfake-resistant liveness using the texture model.
- Server-side speech-to-text fallback for low-end devices.
- A lender console for human review on borderline decisions.
