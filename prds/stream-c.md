# Stream C: Platform UI

**Owner:** one independent build stream
**Path:** `apps/web/`
**Duration:** ~24-28 hrs
**Prereq:** Contract bump landed (see `prds/README.md`). Streams A and B can be mocked via the existing `@loan-wizard/contracts` mocks until they integrate.

**Do not touch:**
- `packages/contracts/` (READ-ONLY)
- `packages/perception/` (consume through `usePerception`)
- `apps/ml-service/` (consume through HTTP)
- Root `package.json`, `turbo.json`, `tsconfig.base.json`

---

## Your Job

The web app today is a functional prototype: landing → permission gate → call UI → processing → offer. To turn it into a platform that an NBFC would actually buy, it needs to look and feel like one: **tenant-themeable, multi-lingual, accessible, with an Agent Co-pilot for review, an Admin dashboard, and a consent/audit experience that passes compliance review**.

Do not expand scope beyond this PRD. No backend changes beyond the new API routes listed below.

---

## Deliverables

1. **Design system refresh**: proper Tailwind design tokens, semantic color names, consistent spacing, typography scale, dark mode support.
2. **Tenant theming**: CSS-variables-driven, swappable by route segment (`/t/[tenant]/...`) or header; ships with 2 themes (NBFC Alpha navy, NBFC Beta emerald).
3. **Landing page v2**: modern copy, localized, clearer trust signals, visible language switcher.
4. **Session flow polish**: smooth transitions, a persistent progress indicator (1/5 to 5/5), new document-capture overlay driven by Stream A's event, yaw-challenge UI.
5. **Agent Co-pilot panel** (`/session/[id]/copilot`): real-time view of an in-progress session for a human agent: live transcript, extracted form, CV signals + confidence, fraud score ticking, buttons to flag/interject.
6. **Offer screen v2**: rich offer card with LLM-narrated reason, highlighted risk factors, accept/decline, mock e-sign modal, download offer PDF.
7. **Admin dashboard** (`/admin`): session list with filters, session detail with full timeline, decision replay UI, audit export, drift + fairness widgets.
8. **Consent manager** (`/session/[id]/consent`): shows every consent captured with verbal text + hash + timestamp, includes a "Right to be forgotten" request flow.
9. **i18n**: English + Hindi with `next-intl` or equivalent, language state persisted, all user-facing strings extracted.
10. **Real-time updates**: SSE stream (`/api/session/[id]/stream`) so the Agent Co-pilot and Admin session detail update live without polling.
11. **Responsive + a11y**: mobile flow works end-to-end; Lighthouse a11y score ≥ 95 on landing and offer screens.
12. **Demo seed script**: populates a handful of historical sessions for the Admin dashboard to have content on first load.

---

## New routes & API surface

### App routes (Next.js App Router)

```
/                                     landing (refreshed)
/t/[tenant]                           tenant-themed landing
/session/[id]                         permission gate + call UI
/session/[id]/copilot                 Agent Co-pilot (agent-only)
/session/[id]/processing              processing spinner
/session/[id]/offer                   offer screen v2
/session/[id]/accepted                post-accept + mock e-sign
/session/[id]/consent                 consent manager
/admin                                dashboard home
/admin/sessions                       sessions list with filters
/admin/sessions/[id]                  session detail (timeline, replay, audit)
/admin/drift                          drift stats view
/admin/fairness                       fairness report view
```

### API routes (Next.js route handlers)

Existing:
- `POST /api/session/start`
- `POST /api/session/[id]/event`
- `POST /api/session/[id]/offer`
- `GET  /api/session/[id]/offer`
- `POST /api/session/[id]/end`

New:
- `GET  /api/session/[id]/stream`: SSE emitting every persisted event for this session; used by Co-pilot and Admin session detail.
- `GET  /api/admin/sessions?status=&tenant=&from=&to=`: paginated list.
- `GET  /api/admin/sessions/[id]`: session detail + decision record.
- `POST /api/admin/sessions/[id]/replay`: proxies to ML service `POST /decisions/{id}/replay`.
- `GET  /api/admin/drift/[feature]`: proxies to ML service.
- `GET  /api/admin/fairness`: proxies to ML service.
- `POST /api/consent/[sessionId]/forget`: marks session for deletion (soft delete + scheduler hook).
- `POST /api/session/[id]/accept`: records customer acceptance + mock e-sign.

**Auth:** gate `/admin/*` and `/session/[id]/copilot` behind a simple cookie-based guard with a shared-secret admin password for the demo. Document the var (`ADMIN_PASSWORD`) in `.env.local.example`. This is demo-grade, not production.

---

## Feature specs

### 1. Design system

- Replace hard-coded hex values with **Tailwind CSS variables** in `tailwind.config.ts`:
  ```
  --color-brand, --color-brand-fg, --color-bg, --color-surface, --color-fg,
  --color-muted, --color-success, --color-warn, --color-danger
  ```
- Typography: Inter display, JetBrains Mono for data chips.
- Spacing: 4-point grid; `spacing` scale only (no ad-hoc px).
- Components (in `src/components/ui/`):
  - `Button` (variants: primary, secondary, ghost, danger; sizes: sm, md, lg)
  - `Card`, `Badge`, `Chip`, `Timeline`, `DataTable`, `Dialog`, `Tabs`, `Tooltip`, `Spinner`, `Alert`, `Separator`
  - Use Radix primitives as the a11y foundation.
- Replace existing one-off styled divs across landing, call UI, offer screen with these primitives.

### 2. Tenant theming

- Two themes ship: `alpha` (navy + gold) and `beta` (emerald + slate), defined as CSS-variable sets in `src/themes/`.
- Theme source of truth: middleware reads `/t/[tenant]` segment, sets a `tenant` cookie; root layout reads cookie and applies `data-theme="..."` on `<html>`.
- Any component using design tokens updates automatically.
- Admin tenant switcher in the header for quick demo.

### 3. Landing v2

Keep the existing trust copy but:
- Tighter hero ("Your loan offer in under 2 minutes: video, voice, no paperwork").
- Language switcher top-right (EN | हिन्दी).
- Replace the feature rows with 4 tight cards.
- Replace the consent box with a compact callout + link to `/legal/privacy`.
- "How it works" 3-step visual strip.
- Footer with tenant attribution and regulatory badges.

### 4. Session flow polish

- Persistent top bar during the call: step indicator (Permissions → Questions → Documents → Consent → Processing).
- When Stream A emits `document_capture_started`, show a full-screen overlay with a card-shaped frame, live edge feedback, and an auto-advance once captured.
- When Stream A emits `challenge_requested` (yaw challenge), show a friendly "Look left → now right" animation with a progress arc.
- Replace harsh transitions with `framer-motion` fade/slide.
- Connection quality chip (based on `cv_signal` face_present_ratio over the last 5 s).

### 5. Agent Co-pilot panel

Route: `/session/[id]/copilot` (admin-gated).

Layout (desktop 3-column, stacks on mobile):

```
┌───────────────────────────────┬───────────────────────────┬──────────────────────────┐
│  Video replay (live)          │  Live Transcript (RTL    │  Live Decision Signals   │
│  + face/liveness overlay      │   list, newest bottom,    │  • fraud_score           │
│                               │   speaker chips)          │  • min_liveness          │
│                               │                           │  • face_present_ratio    │
│                               │  Typing indicator when    │  • texture_score         │
│                               │  customer is speaking     │  • declared vs cv age    │
├───────────────────────────────┼───────────────────────────┼──────────────────────────┤
│  Extracted Form (live-        │  Recent Events log        │  Agent Actions           │
│  updating as fields come in)  │  (cv + form + doc)        │  [Flag], [Interject],   │
│                               │                           │  [End call], [Notes]     │
└───────────────────────────────┴───────────────────────────┴──────────────────────────┘
```

Data source: SSE at `/api/session/[id]/stream`.

Buttons:
- **Flag**: writes a `flag` event to the session (extends Event API with a flag event type, server-side only, no contract bump).
- **Interject**: posts a text the customer-facing TTS should speak. (Stretch: leave a button stub if time-constrained.)
- **Notes**: freeform textarea, saved to `session.agent_notes`.

### 6. Offer screen v2

- Hero card with amount/rate/tenure/EMI prominent.
- "Why this offer" section rendering `offer.reason_narrative` with the underlying reason codes as chips below.
- Risk band indicator (low/medium/high) with color semantics.
- Fraud score expressed as a trust meter (0–100% trust = 1 - fraud_score).
- Two CTAs: **Accept** (opens e-sign modal), **Decline** (reason dropdown, submits, ends).
- E-sign modal (demo-grade): shows agreement preview, Aadhaar-OTP-style 6-digit input (any 6 digits accepts), spinner, success screen.
- "Download offer summary" button → generates PDF client-side via `@react-pdf/renderer` or an HTML → print route.

### 7. Admin dashboard

`/admin` landing: 4 KPI cards (sessions today, approval rate, avg decision latency, fraud alerts) + mini drift chart.

`/admin/sessions`:
- Filters: status, tenant, date range, risk band, text search.
- Columns: id, created, tenant, customer name, status, risk, decision, actions.
- Pagination, keyboard-navigable.

`/admin/sessions/[id]`:
- **Tab 1: Timeline**: unified chronological view of transcripts, form extractions, CV signals, documents, consents, decisions. Filterable by event type.
- **Tab 2: Decision**: full decision record: risk_band, risk_score, fraud_score, persona, policy pass/fail, reason narrative, model versions. "Replay with overrides" button opens a form that lets the operator edit a couple of feature values and see the diff.
- **Tab 3: Evidence**: consent records with hashes, video blob ref (mock download link), device fingerprint snapshot.
- **Tab 4: Audit Export**: "Download Audit Pack" button that bundles decision JSON + events + consent hashes into a ZIP via `jszip`.

`/admin/drift`:
- Dropdown: feature selector.
- Two histograms: baseline (from ML service) vs rolling production.
- Quick-glance KL divergence or PSI value.

`/admin/fairness`:
- Renders `GET /api/admin/fairness` as grouped bar charts (by employment, by age bucket).
- Red banner if disparate_impact_ratio < 0.8.

### 8. Consent manager

- Entered during session by the customer at `/session/[id]/consent`.
- Post-session it's the "Right to be forgotten" endpoint for the customer.
- UI:
  - List of captured consents (type, timestamp, excerpt of verbal text, hash).
  - "Download my data" button (client-side JSON bundle).
  - "Request deletion" button (POST `/api/consent/[sessionId]/forget`).
- Deletion: soft-delete, flip `deletedAt` on Session + cascade to Transcript/CvSignal/etc. Add a Prisma migration for the column.

### 9. i18n

- Use `next-intl`.
- Extract every string from landing, permission gate, call UI, offer screen.
- Hindi translations via `messages/hi.json`, English via `messages/en.json`.
- Language switcher in header, persisted in cookie, also propagated to `usePerception` via `setLanguage`.
- The admin dashboard stays English-only (ops language).

### 10. Real-time updates (SSE)

- `GET /api/session/[id]/stream` returns `text/event-stream`.
- Every event that lands via `POST /api/session/[id]/event` is also broadcast to subscribers of this SSE stream (in-memory pub/sub Map keyed by sessionId; cleared on session end).
- Admin session detail + Co-pilot subscribe.
- Handle reconnect gracefully client-side with `EventSource`.

### 11. Responsive + a11y

- All routes tested at 375px, 768px, 1280px, 1920px widths.
- Keyboard navigation: Tab, Enter, Esc work for every interactive element.
- Focus rings visible.
- ARIA labels on icon-only buttons.
- Landing + offer screens must score ≥ 95 on Lighthouse a11y.
- Call UI is exempt from strict mobile (camera interview is desktop-first by design), but permission gate must work on mobile.

### 12. Demo seed script

`apps/web/scripts/seed-demo.ts`:
- Creates 10 historical sessions with varied tenants, statuses (offered / rejected / abandoned), risk bands.
- Stamps plausible timestamps across the last 7 days.
- Calls ML service for each to populate decision records.
- Invokable via `pnpm --filter @loan-wizard/web seed`.

---

## Directory additions

```
apps/web/
  src/
    app/
      [locale]/                        NEW (next-intl)
        page.tsx                       (landing moved under locale)
        t/[tenant]/page.tsx            NEW (tenant landing)
      admin/
        layout.tsx                     NEW (admin gate + chrome)
        page.tsx                       NEW (KPIs home)
        sessions/
          page.tsx                     NEW (list)
          [id]/
            page.tsx                   NEW (session detail tabs)
        drift/page.tsx                 NEW
        fairness/page.tsx              NEW
      session/[id]/
        page.tsx                       ← keep + polish
        copilot/page.tsx               NEW
        consent/page.tsx               NEW
        accepted/page.tsx              ← extend with e-sign modal
      api/
        session/[id]/stream/route.ts   NEW
        session/[id]/accept/route.ts   NEW
        consent/[sessionId]/forget/route.ts NEW
        admin/
          sessions/route.ts            NEW
          sessions/[id]/route.ts       NEW
          sessions/[id]/replay/route.ts NEW
          drift/[feature]/route.ts     NEW
          fairness/route.ts            NEW
    components/
      ui/                              NEW (design system primitives)
      call/
        DocumentCaptureOverlay.tsx     NEW
        YawChallengeOverlay.tsx        NEW
        CopilotPanel.tsx               NEW
      admin/
        SessionList.tsx                NEW
        SessionTimeline.tsx            NEW
        DecisionReplayForm.tsx         NEW
        DriftChart.tsx                 NEW
        FairnessReport.tsx             NEW
      offer/
        OfferCard.tsx                  NEW
        ESignModal.tsx                 NEW
        TrustMeter.tsx                 NEW
      consent/
        ConsentList.tsx                NEW
        ForgetRequestDialog.tsx        NEW
    themes/
      alpha.ts                         NEW
      beta.ts                          NEW
    messages/
      en.json                          NEW
      hi.json                          NEW
    lib/
      sse-broadcast.ts                 NEW
      admin-auth.ts                    NEW
      pdf.ts                           NEW
      audit-pack.ts                    NEW
  prisma/
    schema.prisma                      ← add deletedAt, agentNotes, tenantId
  scripts/
    seed-demo.ts                       NEW
```

---

## Dependencies to add

```json
{
  "next-intl": "^3.17.0",
  "framer-motion": "^11.2.0",
  "@radix-ui/react-dialog": "^1.1.0",
  "@radix-ui/react-tabs": "^1.1.0",
  "@radix-ui/react-tooltip": "^1.1.0",
  "@radix-ui/react-dropdown-menu": "^2.1.0",
  "recharts": "^2.12.0",
  "jszip": "^3.10.0",
  "@react-pdf/renderer": "^3.4.0",
  "clsx": "^2.1.0",
  "tailwind-merge": "^2.3.0"
}
```

No new root-level deps.

---

## Performance targets

- Landing page LCP ≤ **1.8 s** on mid-range mobile.
- Admin session list TTI ≤ **2 s** for 100 rows.
- SSE reconnect within **2 s** of network recovery.
- Lighthouse a11y ≥ **95** on landing + offer.
- Zero CLS on the call UI during the interview.

---

## Milestones

| Hours | Milestone |
|---|---|
| 0-3   | Design system tokens, base components, tailwind config, dark mode toggle |
| 3-6   | Landing v2 shipped, i18n EN+HI in place, language switcher wired |
| 6-9   | Tenant theming with 2 themes, `/t/[tenant]` routing, middleware |
| 9-13  | Session flow polish: progress bar, doc-capture overlay, yaw-challenge animation |
| 13-17 | Co-pilot panel: 3-column layout, SSE wired, live transcript + signals |
| 17-20 | Offer screen v2: narration, trust meter, e-sign modal, PDF download |
| 20-24 | Admin dashboard: KPIs, sessions list, session detail tabs, decision replay form |
| 24-26 | Drift + fairness views, consent manager, right-to-forget flow |
| 26-27 | Seed script, responsive pass, a11y fixes, Lighthouse ≥ 95 |
| 27-28 | TODO_INTEGRATION updates, demo video walkthrough script |

---

## Cut order if time slips

1. Drop `/admin/drift` + `/admin/fairness` pages (keep APIs live for later).
2. Drop PDF download, replace with client-side "Print this page" button.
3. Drop tenant theming to a single theme with a token system still in place (easy to add themes later).
4. Drop Hindi translations, keep i18n scaffolding, EN only, with a visible "हिन्दी (soon)" disabled toggle.
5. Drop Co-pilot's "Interject" action (keep Flag + Notes only).
6. Drop e-sign OTP modal, replace with a styled button and immediate accept.

**Never cut:**
- Design system pass (touches everything; half-done is worse than full).
- SSE stream (Co-pilot relies on it; Admin detail relies on it).
- Decision replay UI (centerpiece feature).
- Consent manager + right-to-forget (compliance centerpiece).

---

## Integration points with Streams A and B

- Consume Stream A's new events (`document_captured`, `device_fingerprint`, `consent_captured`, `challenge_requested`, `challenge_completed`): persist each, plus render overlays/badges.
- Consume Stream B's new offer fields (`fraud_score`, `reason_narrative`, `model_versions`): render in Offer screen and Admin detail.
- Call Stream B's new endpoints via `/api/admin/*` proxies.
- Before Streams A and B ship, stub these with `@loan-wizard/contracts` mocks so Stream C is unblocked.

---

## Handoff (`TODO_INTEGRATION.md` additions)

Document:
1. Every new route, what it does, auth requirements.
2. SSE event shapes (identical to persisted events).
3. Tenant theming contract: how to add a 3rd theme.
4. i18n keys structure (so Stream A's new strings from doc-capture overlay get translated correctly).
5. Admin credentials for demo (`ADMIN_PASSWORD` env var).
6. Demo flow script: exact clicks for the 2-minute pitch.

Commit tag: `stream-c-complete`
