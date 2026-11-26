# ProofPivot — Correction Fork

**Same facts. Two explanations. One earns the page.**

[Live app](https://proofpivot-correction-fork.ochresnow128.chatgpt.site) · [Judge Door](https://proofpivot-correction-fork.ochresnow128.chatgpt.site/judge) · [Source](https://github.com/chizzydev/ProofPivot-Studio)

Deployable Sites server with a D1-backed first-answer ledger and durable outbox. Both `/read` and `/judge` use one handler, canonical facts, provider evaluation, meaningful exposure and server scoring. `proofpivot/core` and reader assets are synchronized from the canonical workspace; `source-sync.json` records hashes.

Node 24+. Use the Sites dependency and build helpers. D1 migrations: `drizzle/`. Runtime secrets: `FLAGSMITH_ENVIRONMENT_KEY`, `PP_SESSION_SECRET`, `PP_OPERATOR_SECRET`. Configuration: `PP_ENVIRONMENT`, `PP_RUN`, `PP_ENROLLMENT`. Never commit secret values.

Current deployment is a Development preview, not human cognitive evidence. Production requires Development receipts, isolated canary, immutable freeze and human editor approval. Authenticated `/operator/evidence` stores actual provider snapshots with original as-of timestamps; `/operator/drain` retries pending events. Public routes cannot complete experiments. Human-approved completion-time rollout occurs in Flagsmith through the same feature.

Feature: `proofpivot_correction_experience`. Values: `correction_note`, `evidence_time_machine`. Primary: `proofpivot_revision_check_correct` (Occurrence). Guardrail: `proofpivot_revision_check_submitted`. HTTP acceptance does not establish warehouse ingestion.


## Verify the implementation

Run `npm ci` and `npm test` with Node 24 or later. Tests cover exact arithmetic, real ONS source capture hashes, generic BEA-style revisions, precision and history, identical factual payloads, stable assignment, meaningful exposure, first-answer concurrency, identity matching, durable outbox restart and ordering, Production synthetic rejection, provider reconciliation and guardrail refusal. The hosted and portable database transitions are both exercised.

The source captures under `proofpivot/sources/` are actual official release bytes. Historical A/A and worker-restart receipts are under `proofpivot/receipts/`. A/A used identical Correction Notes: 69 control exposures and 64 alternate-key exposures, 33 correct first responses in each arm. Provider and local counts reconciled; the primary 95% relative-lift interval was -29.4% to +45.0%, so the result was inconclusive. This is synthetic Development calibration, not evidence of human comprehension.

The participant question tests an editorial action across three claims. Only option labels enter the browser response. The server maps the first complete response to required actions derived by the generic revision engine; retries cannot convert a wrong first answer. Production study launch and final release remain explicit human decisions.
