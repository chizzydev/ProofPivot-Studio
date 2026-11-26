# ProofPivot — Correction Fork

**Same facts. Two explanations. One earns the page.**

[Live app](https://proofpivot-correction-fork.ochresnow128.chatgpt.site) · [Judge Door](https://proofpivot-correction-fork.ochresnow128.chatgpt.site/judge) · [Source](https://github.com/chizzydev/ProofPivot-Studio)

[Try your own revision](https://proofpivot-correction-fork.ochresnow128.chatgpt.site/sandbox) · [Input schema](https://proofpivot-correction-fork.ochresnow128.chatgpt.site/sandbox-schema)

## Repeatable revision sandbox

`/sandbox` accepts 1–40 observations and 1–30 claims using structured fields. Enter original/revised plain decimal values, explicit units and measure basis, optional periods, sentence templates, direct observation/difference/percent-change calculations, 0–12 decimal places and current/historical semantics. Reset and rerun without a restart or operator secret. JSON import/export is optional; see the live schema for its form normalization and limits. Supplied data is always labelled **Judge-provided sandbox data**; nothing is scraped or independently verified.

`proofpivot/core/payload-core.mjs` validates runtime input and calls the sole `engine.mjs` `revise()` implementation. The ONS fixture adapter in `ons-fixture.mjs` and actual BEA inputs use this same public pipeline. Canonical ONS payload SHA256 and all frozen study reader assets remain unchanged; `study-freeze.json` pins them and tests enforce equality. `payload.mjs` retains Node source capture verification and a compatibility adapter, not an ONS verdict function.

Both sandbox explanations receive one immutable factual payload and the same deterministic SHA256. Source movement calls the same `revise()` function. An inconsistent payload raises `TRUTH_LOCK_MISMATCH`; previews fail closed. The canonical study presentations are deliberately left byte-identical rather than changed under the existing freeze.

Sandbox computation is browser-local. Its static-only handler runs before reading environment variables or constructing a provider/ledger; it sets no cookie and has no write/event endpoint. Its module graph contains no Flagsmith, scoring, database or outbox import. Its CSP sets `connect-src 'none'` and `frame-src 'none'`. The study does not use arbitrary sandbox inputs. The Judge Door's new link is site navigation outside the frozen study reader.

`npm test` includes deterministic repetition, 390 generated rational-operation cases across 13 precisions, generated precision-preserving cases, malformed-input refusal, 20 independent scenarios, actual ONS/BEA public-pipeline fixtures, truth-lock failure and frozen-study preservation. `npx playwright install chromium` then `npx playwright test` runs the browser sequence through the exact packaged static assets and production sandbox handler. It fills fresh inputs, checks all four states, checks both preview hashes, changes evidence, reruns, resets, and performs 20 complete new scenarios. Every requested URL is allowlisted as a static GET; study or external requests fail the test. CI runs Chromium E2E after domain tests and build, with no study secrets or backend available.

Limits: no semantic unit conversion, source verification, universal ingestion, AI, database persistence or unique-human proof. User-supplied basis strings assert compatibility; they do not establish external factual correctness. The friendly form supports flat calculations on up to two observations; the shared builder also supports nested expressions to depth four. Reset/reload discards inputs. The Production human pilot remains unstarted until a separate review after this amendment.

Deployable Sites server with a D1-backed first-answer ledger and durable outbox. Both `/read` and `/judge` use one handler, canonical facts, provider evaluation, meaningful exposure and server scoring. `proofpivot/core` and reader assets are synchronized from the canonical workspace; `source-sync.json` records hashes.

Node 24+. Use the Sites dependency and build helpers. D1 migrations: `drizzle/`. Runtime secrets: `FLAGSMITH_ENVIRONMENT_KEY`, `PP_SESSION_SECRET`, `PP_OPERATOR_SECRET`. Configuration: `PP_ENVIRONMENT`, `PP_RUN`, `PP_ENROLLMENT`. Never commit secret values.

Current deployment is a Development preview, not human cognitive evidence. Production requires Development receipts, isolated canary, immutable freeze and human editor approval. Authenticated `/operator/evidence` stores actual provider snapshots with original as-of timestamps; `/operator/drain` retries pending events. Public routes cannot complete experiments. Human-approved completion-time rollout occurs in Flagsmith through the same feature.

Feature: `proofpivot_correction_experience`. Values: `correction_note`, `evidence_time_machine`. Primary: `proofpivot_revision_check_correct` (Occurrence). Guardrail: `proofpivot_revision_check_submitted`. HTTP acceptance does not establish warehouse ingestion.


## Verify the implementation

Run `npm ci` and `npm test` with Node 24 or later. Tests cover exact arithmetic, real ONS source capture hashes, generic BEA-style revisions, precision and history, identical factual payloads, stable assignment, meaningful exposure, first-answer concurrency, identity matching, durable outbox restart and ordering, Production synthetic rejection, provider reconciliation and guardrail refusal. The hosted and portable database transitions are both exercised.

The source captures under `proofpivot/sources/` are actual official release bytes. Historical A/A and worker-restart receipts are under `proofpivot/receipts/`. A/A used identical Correction Notes: 69 control exposures and 64 alternate-key exposures, 33 correct first responses in each arm. Provider and local counts reconciled; the primary 95% relative-lift interval was -29.4% to +45.0%, so the result was inconclusive. This is synthetic Development calibration, not evidence of human comprehension.

The participant question tests an editorial action across three claims. Only option labels enter the browser response. The server maps the first complete response to required actions derived by the generic revision engine; retries cannot convert a wrong first answer. Production study launch and final release remain explicit human decisions.

## Locked Production preflight

`/api/preflight` reports the frozen payload/protocol/asset hashes, feature/experiment/variation contract, actual environment-level flag evaluation and read-only Production ledger counts while the runtime is locked. `PP_ENVIRONMENT=Production`, `PP_ENROLLMENT=closed` and `PP_RUN.preflight_only=true` do not authorize participation. Reader pages set no study cookie; consent, exposure and answer requests return 409 before identity evaluation or ledger writes. `/api/state` reads actual counts without initializing a run or pumping events. The sandbox static boundary precedes all study configuration as before.

Opening requires all of: an exact candidate-matched editor approval, matching Production IDs, frozen protocol status, explicit removal of preflight-only mode, verified infrastructure and explicit enrollment opening. An open setting alone cannot enroll. Default flags and identity targeting are distinct: actual preflight readback showed the environment default disabled, while the created experiment's rollout segment already targeted transient identities with a variation but no experiment membership. This is recorded and must never be interpreted as an enrolled participant or exposure.
