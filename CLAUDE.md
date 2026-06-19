# Loan Wizard, Parallel Build

## The Contract
Three streams run in parallel:
- Stream A owns `packages/perception/`
- Stream B owns `apps/ml-service/`
- Stream C owns `apps/web/`

Shared types live in `packages/contracts/`. That package is FROZEN. Do not add or modify types mid-sprint without explicit coordination.

## Do Not
- Edit code outside your stream's directory.
- Add new shared types without stopping everyone.
- Install root-level dependencies without confirming.
- Change `turbo.json`, root `package.json`, or `tsconfig.base.json`.

## If You Are Blocked
1. Check mocks in `@loan-wizard/contracts` for canned data.
2. Stub anything you need from other streams.
3. Note the stub in a `TODO_INTEGRATION.md` in your stream's directory.
