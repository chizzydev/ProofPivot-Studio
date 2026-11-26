# ProofPivot — Correction Fork

**Same facts. Two explanations. One earns the page.**

Deployable Sites server with a D1-backed first-answer ledger and durable outbox. Both `/read` and `/judge` use one handler, canonical facts, provider evaluation, meaningful exposure and server scoring. `proofpivot/core` and reader assets are synchronized from the canonical workspace; `source-sync.json` records hashes.

Node 24+. Use the Sites dependency and build helpers. D1 migrations: `drizzle/`. Runtime secrets: `FLAGSMITH_ENVIRONMENT_KEY`, `PP_SESSION_SECRET`, `PP_OPERATOR_SECRET`. Configuration: `PP_ENVIRONMENT`, `PP_RUN`, `PP_ENROLLMENT`. Never commit secret values.

Current deployment is a Development preview, not human cognitive evidence. Production requires Development receipts, isolated canary, immutable freeze and human editor approval. Authenticated `/operator/evidence` stores actual provider snapshots with original as-of timestamps; `/operator/drain` retries pending events. Public routes cannot complete experiments. Human-approved completion-time rollout occurs in Flagsmith through the same feature.

Feature: `proofpivot_correction_experience`. Values: `correction_note`, `evidence_time_machine`. Primary: `proofpivot_revision_check_correct` (Occurrence). Guardrail: `proofpivot_revision_check_submitted`. HTTP acceptance does not establish warehouse ingestion.
