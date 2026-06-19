# Stream C v4 — Integration Checklist

## 1. Env Vars to Flip (mock → real)

| Variable | Current | Flip to |
|---|---|---|
| `USE_MOCK_PERCEPTION` | `true` | `false` |
| `NEXT_PUBLIC_ML_MODE` | `mock` | `real` |
| `ML_SERVICE_URL` | `http://localhost:8000` | Stream B deployed URL |
| `DATABASE_URL` | local dev | Neon/Railway production string |
| `ADMIN_PASSWORD` | `admin123` | Strong secret in prod |

## 2. New Routes (v4 additions)

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/admin` | GET | admin cookie | KPI dashboard |
| `/admin/sessions` | GET | admin cookie | Session list with filters |
| `/admin/sessions/[id]` | GET | admin cookie | Session detail (4 tabs) |
| `/admin/drift` | GET | admin cookie | Feature drift charts |
| `/admin/fairness` | GET | admin cookie | Fairness report |
| `/admin/login` | GET/POST | none | Admin auth |
| `/session/[id]/copilot` | GET | admin cookie (client-side nav only) | Agent co-pilot view |
| `/session/[id]/consent` | GET | none | Consent manager |
| `/t/[tenant]` | GET | none | Tenant-themed redirect |
| `/api/session/[id]/stream` | GET (SSE) | none | Real-time event stream |
| `/api/session/[id]/accept` | POST | none | e-sign acceptance |
| `/api/consent/[sessionId]/forget` | POST | none | DPDP right-to-forget |
| `/api/admin/sessions` | GET | admin cookie | Paginated session list |
| `/api/admin/sessions/[id]` | GET, PATCH | admin cookie | Session detail + notes |
| `/api/admin/sessions/[id]/replay` | POST | admin cookie | Decision replay |
| `/api/admin/drift/[feature]` | GET | admin cookie | Drift data proxy |
| `/api/admin/fairness` | GET | admin cookie | Fairness data proxy |

## 3. SSE Event Shapes

Every event posted to `POST /api/session/[id]/event` is immediately broadcast to SSE subscribers at `GET /api/session/[id]/stream`. Shapes are identical to the `PerceptionEvent` union in `@loan-wizard/contracts`. The Co-pilot and Admin session detail listen on this stream.

Reconnect: use `EventSource` with default browser reconnect (2s).

## 4. Tenant Theming Contract

To add a 3rd theme (e.g. `gamma`):
1. Add CSS variables block in `src/app/globals.css` under `[data-theme="gamma"]`
2. Add `gamma` as a valid tenant in `src/middleware.ts`
3. Add tenant switcher option in admin header if needed

Token names: `--brand`, `--brand-fg`, `--bg`, `--surface`, `--fg`, `--muted`, `--success`, `--warn`, `--danger`, `--accent`.

## 5. i18n Keys

All user-facing strings are in `src/messages/en.json` and `src/messages/hi.json`. Key prefix conventions:
- `landing.*` — landing page
- `perm.*` — permission gate
- `session.*` — call UI
- `offer.*` — offer screen
- `accepted.*` — post-accept

When Stream A adds new strings for doc-capture or challenge overlays, add keys under `call.*` prefix in both files.

## 6. Admin Credentials

Default: `ADMIN_PASSWORD=admin123`. Set `ADMIN_PASSWORD` env var in Vercel before demo. Cookie is `admin_session`, `httpOnly`, 7-day expiry.

## 7. Perception Event Fields NOT Currently Used

- `permission_granted.payload.geo` — geo is requested directly by browser
- `transcript_turn.payload.confidence` — stored in DB, not displayed in Co-pilot
- `cv_signal.payload.blink_count_window` — stored, not shown
- `cv_signal.payload.head_pose_delta` — stored, not shown
- `error` event — unhandled; Co-pilot will log to console only

## 8. ML Response Fields NOT Currently Displayed

- `offer.persona` — not shown on offer card (used in admin detail)
- `offer.risk_band` — shown as badge on offer card ✓
- `offer.fraud_score` (v4 field) — shown in TrustMeter if present; defaults to 0.1 if absent
- `offer.reason_narrative` (v4 field) — shown in italic quote on offer card if present

## 9. Known Issues with Mock Data

- Offer page reads from sessionStorage (set by processing page) or falls back to `GET /api/session/[id]/offer`. If server restarts between processing and offer pages, the GET fallback fires — works but adds latency.
- Admin dashboard KPI cards require a real DB connection; with `DATABASE_URL=postgresql://x` they return 0.
- Co-pilot page has no auth gate (just a URL). For the demo, distribute the URL only to agents. Add a proper auth check before production.
- SSE stream uses in-memory pub/sub — dies on server restart or multi-instance deploy. For production, use Redis pub/sub.
- `recharts` v3 has a peer dep warning with React 18 — rendering works fine, suppress warning or pin to recharts@2.

## 10. CORS

Stream B must allow:
- `https://loan-wizard-*.vercel.app` (preview)
- `https://loan-wizard.vercel.app` (production)

## 11. Deployed URL

TODO: Add after Vercel deployment.

## 12. Demo Flow (v4)

1. Open `https://loan-wizard.vercel.app`
2. Language switcher → हिन्दी, then back to EN
3. "Start my session →"
4. Permission gate: Allow Camera & Mic → Allow Location
5. Call UI: show progress bar, CV indicators, form animating in
6. "End call" → Processing page → Offer screen v2
7. Show trust meter, "Why this offer?" expansion
8. "View KFS" modal
9. "Accept" → e-sign modal, enter 6 digits → Accepted
10. Navigate to `/admin` (password: `admin123`)
11. Sessions list → click the session → Decision tab → "Run replay" with different income
12. Drift chart → select `monthly_income` feature
13. Fairness report → point out red bars

---
Commit tag: `stream-c-v4-complete`
