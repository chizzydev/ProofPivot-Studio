# ProofPivot — Correction Fork

**Same facts. Two explanations. One earns the page.**

[Live app](https://proofpivot-correction-fork.ochresnow128.chatgpt.site) · [Judge Door](https://proofpivot-correction-fork.ochresnow128.chatgpt.site/judge) · [Source](https://github.com/chizzydev/ProofPivot-Studio)

[Try your own revision](https://proofpivot-correction-fork.ochresnow128.chatgpt.site/sandbox) · [Input schema](https://proofpivot-correction-fork.ochresnow128.chatgpt.site/sandbox-schema)

## Production incident remediation — R17

Experiment 578 is invalid for inference after one project-aware manual QA exposure. All local/provider records are preserved; there is no local exclusion. Its administrative provider completion disabled the flag so a fresh experiment could be created; this declares no winning variant.

Fresh experiment **907**, run **prod-ons-study-v2-r17**, is unstarted with enrollment CLOSED pending a new explicit editor approval. The response deadline is **600000 ms (10 minutes)** from first meaningful exposure, using server time. Reload and repeat exposure never reset it. Expiry disables submission, explains that no answer was recorded, and offers a deliberate practice-only restart at `/practice`; practice has no script, study identity, answer persistence, provider evaluation or events. Existing first answers stay immutable.

Ordinary `/read` has no visible Flagsmith refresh control. Judge Door technical readers use a separate `pp_proof` identity and **Development** SDK key, with no Production DB, exposure, scorer or event sender. Archived real Development completion evidence remains available; a refresh performs a real same-flag Development evaluation. `/sandbox` remains browser-local and isolated.

The factual payload, arm presentation, question/options, answer key, scoring, primary metric, guardrail and 50/50 allocation are unchanged. `study-freeze.json` pins the new protocol and assets. The frozen transport baseline includes the preserved canary and invalidated QA exposure; it never subtracts identities from experiment results. The first five eligible genuine participants, after new approval, remain the actual study on internal-checkpoint PASS. Any material change invalidates the entire run. No early arm-performance review is permitted.

CI now exercises normal consent/assignment with a stub provider through the actual deployed handler and SQL, controlled time beyond three minutes, successful first-answer submission, actual ten-minute expiry with zero conversions, reload/re-exposure immutability, practice-only recovery, and technical/sandbox isolation. All test hosts and stub configuration exist only under `e2e/`; they are not Production routes.

## Repeatable revision sandbox

`/sandbox` accepts 1–40 observations and 1–30 claims using structured fields. Enter original/revised plain decimal values, explicit units and measure basis, optional periods, sentence templates, direct observation/difference/percent-change calculations, 0–12 decimal places and current/historical semantics. Reset and rerun without a restart or operator secret. JSON import/export is optional; see the live schema for its form normalization and limits. Supplied data is always labelled **Judge-provided sandbox data**; nothing is scraped or independently verified.

`proofpivot/core/payload-core.mjs` validates runtime input and calls the sole `engine.mjs` `revise()` implementation. The ONS fixture adapter in `ons-fixture.mjs` and actual BEA inputs use this same public pipeline. Canonical ONS payload SHA256 remains unchanged; the current R17 reader assets are re-frozen, and `study-freeze.json` pins them and tests enforce equality. `payload.mjs` retains Node source capture verification and a compatibility adapter, not an ONS verdict function.

Both sandbox explanations receive one immutable factual payload and the same deterministic SHA256. Source movement calls the same `revise()` function. An inconsistent payload raises `TRUTH_LOCK_MISMATCH`; previews fail closed. The two explanation presentations retain the same factual content; R17 updates deadline and recovery controls outside those explanations.

Sandbox computation is browser-local. Its static-only handler runs before reading environment variables or constructing a provider/ledger; it sets no cookie and has no write/event endpoint. Its module graph contains no Flagsmith, scoring, database or outbox import. Its CSP sets `connect-src 'none'` and `frame-src 'none'`. The study does not use arbitrary sandbox inputs. The Judge Door's new link is site navigation outside the frozen study reader.

`npm test` includes deterministic repetition, 390 generated rational-operation cases across 13 precisions, generated precision-preserving cases, malformed-input refusal, 20 independent scenarios, actual ONS/BEA public-pipeline fixtures, truth-lock failure and frozen-study preservation. `npx playwright install chromium` then `npx playwright test` runs the browser sequence through the exact packaged static assets and production sandbox handler. It fills fresh inputs, checks all four states, checks both preview hashes, changes evidence, reruns, resets, and performs 20 complete new scenarios. Every requested URL is allowlisted as a static GET; study or external requests fail the test. CI runs Chromium E2E after domain tests and build, without live credentials; reader E2E uses an isolated SQL backend and stub provider.

Limits: no semantic unit conversion, source verification, universal ingestion, AI, database persistence or unique-human proof. User-supplied basis strings assert compatibility; they do not establish external factual correctness. The friendly form supports flat calculations on up to two observations; the shared builder also supports nested expressions to depth four. Reset/reload discards inputs. The fresh Production study remains unstarted until a new explicit editor approval.

Deployable Sites server with a D1-backed first-answer ledger and durable outbox. The normal `/read` uses the study handler, canonical facts, meaningful exposure and server scoring; Judge Door technical readers are isolated in Development. `proofpivot/core` and reader assets are synchronized from the canonical workspace; `source-sync.json` records hashes.

Node 24+. Use the Sites dependency and build helpers. D1 migrations: `drizzle/`. Runtime secrets: `FLAGSMITH_ENVIRONMENT_KEY`, `PP_SESSION_SECRET`, `PP_OPERATOR_SECRET`, `FLAGSMITH_JUDGE_ENVIRONMENT_KEY` (Development only). Configuration: `PP_ENVIRONMENT`, `PP_RUN`, `PP_ENROLLMENT`. Never commit secret values.

Current deployment is locked Production preflight, with enrollment CLOSED and no genuine participants. Production enrollment requires Development receipts, isolated canary, immutable freeze and explicit human editor approval. Authenticated `/operator/evidence` stores actual provider snapshots with original as-of timestamps; `/operator/drain` retries pending events. Public routes cannot complete experiments. Human-approved completion-time rollout occurs in Flagsmith through the same feature.

Feature: `proofpivot_correction_experience`. Values: `correction_note`, `evidence_time_machine`. Primary: `proofpivot_revision_check_correct` (Occurrence). Guardrail: `proofpivot_revision_check_submitted`. HTTP acceptance does not establish warehouse ingestion.


## Verify the implementation

Run `npm ci` and `npm test` with Node 24 or later. Tests cover exact arithmetic, real ONS source capture hashes, generic BEA-style revisions, precision and history, identical factual payloads, stable assignment, meaningful exposure, first-answer concurrency, identity matching, durable outbox restart and ordering, Production synthetic rejection, provider reconciliation and guardrail refusal. The hosted and portable database transitions are both exercised.

The source captures under `proofpivot/sources/` are actual official release bytes. Historical A/A and worker-restart receipts are under `proofpivot/receipts/`. A/A used identical Correction Notes: 69 control exposures and 64 alternate-key exposures, 33 correct first responses in each arm. Provider and local counts reconciled; the primary 95% relative-lift interval was -29.4% to +45.0%, so the result was inconclusive. This is synthetic Development calibration, not evidence of human comprehension.

The participant question tests an editorial action across three claims. Only option labels enter the browser response. The server maps the first complete response to required actions derived by the generic revision engine; retries cannot convert a wrong first answer. Production study launch and final release remain explicit human decisions.

## Locked Production preflight

`/api/preflight` reports the frozen payload/protocol/asset hashes, feature/experiment/variation contract, actual environment-level flag evaluation and read-only Production ledger counts while the runtime is locked. `PP_ENVIRONMENT=Production`, `PP_ENROLLMENT=closed` and `PP_RUN.preflight_only=true` do not authorize participation. Reader pages set no study cookie; consent, exposure and answer requests return 409 before identity evaluation or ledger writes. `/api/state` reads actual counts without initializing a run or pumping events. The sandbox static boundary precedes all study configuration as before.

Opening requires all of: an exact candidate-matched editor approval, matching Production IDs, frozen protocol status, explicit removal of preflight-only mode, verified infrastructure and explicit enrollment opening. An open setting alone cannot enroll. Default flags and identity targeting are distinct: actual preflight readback showed the environment default disabled, while the created experiment's rollout segment already targeted transient identities with a variation but no experiment membership. This is recorded and must never be interpreted as an enrolled participant or exposure.

## Governing internal-pilot protocol

The first 10–20 eligible genuine humans are the beginning of the actual frozen Production study, experiment **578**, run `prod-ons-study-v1`. They are never a separate disposable cohort. All real exposures/conversions remain in the provider warehouse and all first answers remain in the ledger. There is no pilot-based result subtraction or local exclusion filter.

An atomic admission hold prevents a sixth initial admission. Saving the fifth complete first answer automatically closes enrollment. Review after all five valid completions covers only consent, task clarity, ambiguity/UI, stable identity, meaningful exposure, first-answer immutability, delivery/reconciliation, contamination and integrity. The initial study view and operator tools withhold arm-level performance and do not fetch provider results. Do not inspect early treatment-versus-control performance or tune the contract.

**INTERNAL PILOT PASS:** an explicit operational-only editor review, clean delivery and fresh pooled warehouse reconciliation allow continued recruitment under the same frozen run and experiment. All five initial participants/events remain included and enrollment stays paused pending new broader-recruitment approval. Passing does not declare an experiment winner or change the statistical analysis rules.

**INTERNAL PILOT INVALIDATES RUN:** any material change to facts, either explanation, question/key/scoring, exposure semantics, either metric or assignment requires closing enrollment and invalidating the entire run for inference. Stored participants, answers and events are preserved. The invalidated run cannot resume or yield a winner. A corrected, newly frozen contract needs a fresh experiment ID AND run ID, zero new-run participants and new editor approval. Never delete, subtract or locally hide the initial cohort from provider results.

`proofpivot/core/internal-pilot.mjs` governs the review checks and immutable outcomes. Its method hash is bound separately into the study freeze and launch approval. The original question, scoring/exposure protocol hash and six frozen participant assets remain unchanged. The earlier separate-pilot candidate and reports are historical and superseded by this internal-pilot amendment. Enrollment remains CLOSED until explicit human/editor approval; accepting this method does not authorize enrollment.
