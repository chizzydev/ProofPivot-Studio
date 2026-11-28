# ProofPivot Studio — Championship Patch Report

**Date:** 2026-11-27  
**Baseline source:** GitHub commit `2ebc782587b85bd2b4865cb866444c7f9e849d87`  
**Patch scope:** judge-facing product consequence, public routing, experiment-history choreography, mobile composition, navigation coherence, and Sandbox first-use compression.

## 1. Non-negotiable preservation rules

This patch deliberately does **not** redesign or alter:

- the experiment-912 Evidence Time Machine treatment;
- the Correction Note control;
- the truth-locked ONS factual payload;
- protocol/scoring/event semantics;
- the completed experiment-912 evidence;
- Production study 907;
- the generic revision engine.

The frozen Production-study assets remain byte-identical. The patch introduces separate public/championship surfaces instead of rewriting the frozen study candidate.

## 2. Championship changes

### A. Canonical Page Commit

Added a real public current-correction surface at `/correction`.

The page does not hardcode the selected treatment. Its `/api/canonical` path:

1. loads the recorded completed simulation experiment evidence;
2. verifies the experiment/feature/run match the frozen simulation contract;
3. performs a **fresh evaluation of the same Flagsmith flag** for a stable canonical-page identity;
4. uses the existing `canonicalRead()` contract to require agreement between the recorded rollout decision and the current flag value;
5. fails closed if that agreement is absent;
6. renders the existing tested explanation through the same factual payload.

No study exposure or conversion is emitted by the canonical page.

This literalizes the product promise:

> **One earns the page.**

### B. Public routing / information architecture

The public homepage now routes the primary CTA to `/correction` instead of the closed Production study reader.

Public navigation is normalized around three stable nouns:

- **Correction** — what currently shipped;
- **Experiment** — what decided it / historical fork proof;
- **Sandbox** — fresh-input self-proof.

The frozen study `index.html` is preserved unchanged; the public root uses a new `public-index.html` asset.

### C. Experiment / Fork Collapse surface

The simulation Judge Door was recomposed into an Experiment page:

- one concise simulated-traffic disclosure;
- no Development-QA / Production-907 operational-history banner above the product;
- two compact historical world cards instead of two permanently open scroll-heavy reader documents;
- historical full pages remain inspectable behind collapsed details;
- historical replay auto-opens internally without asking the judge to perform fake participant consent;
- recorded assignments use human labels instead of raw implementation keys;
- completed lifecycle copy now says **Release decision recorded**, not stale **Human review required**;
- one consequence-first action — **Verify what ships now** — asks both historical identities to evaluate the same flag fresh;
- successful convergence automatically yields **FORK COLLAPSED**;
- the page then reveals **This is now the page** and links directly to the canonical published correction;
- experiment counts, provider receipt, and frozen assumptions are demoted below the signature event;
- the Sandbox challenge is explicitly labeled **PROOF AFTER THE MAGIC**.

The historical re-evaluations create no new experiment exposures, answers, or conversions.

### D. Mobile Judge Door

The narrow-screen composition no longer attempts to preserve the desktop two-document layout.

At mobile width:

- the recorded-fork introduction stacks cleanly;
- reader worlds are compact cards;
- full historical pages stay closed unless requested;
- collapse and canonical-page consequence remain full-width and obvious;
- technical proof remains secondary.

### E. Sandbox Quick Try

Added a fast judge-facing path above the existing full Sandbox:

> **Change two numbers. Watch the sentence follow.**

Quick Try uses the same validated `runSandbox()` pipeline and renderer as the Advanced Sandbox. It does not contain a hardcoded result path.

The existing full schema-capable form remains intact under:

> **Advanced Sandbox — multiple observations, calculations, precision & history**

The already-strong result UI remains unchanged.

## 3. Files changed

Product/runtime:

- `proofpivot/assets.json`
- `proofpivot/worker-handler.mjs`
- `proofpivot/auxiliary-router.mjs`

Regression/browser coverage:

- `e2e/sandbox.spec.mjs`
- `e2e/simulation.spec.mjs`
- `e2e/static-server.mjs`

Added public assets are stored inside `proofpivot/assets.json`:

- `public-index.html`
- `canonical.html`
- `canonical.js`
- `championship.css`

Modified non-frozen assets inside `proofpivot/assets.json`:

- `simulation-judge.html`
- `simulation-judge.js`
- `simulation-app.js`
- `sandbox.html`
- `sandbox.js`

## 4. Frozen Production safety gate

Final SHA-256 verification against `study-freeze.json`:

- PASS `app.js` — `ac577791cad518b5db8138b628dc83e65081899ea8dbb8092209255671d10c10`
- PASS `index.html` — `3c010bc66fa0b227c0ad19920e18735f5c6d17c36702015d4be66da91902c8a6`
- PASS `judge.html` — `ce9150f5c4493b2752fce466253b256af2158114baea98d2d80fc0e48e6f2f5a`
- PASS `judge.js` — `3a6efe250235801222637075644b6dc670ade3aecc249fb520bc7f97984007ca`
- PASS `reader.html` — `443ed45db4bfc104b00c6a9eccfbef601b6b6fde585ba8ef345e1f8d2310f614`
- PASS `style.css` — `9c9173f8b288add4f87923455a4ed4c89f475aea07d58fffeb6c40be6dc286dc`
- PASS `practice.html` — `f2d9b9a0f0f1d15e9b6c6b5e62558e031e3df517c6ebb26d91d8acb7ade4550`

**Frozen asset gate: PASS.**

## 5. Automated validation

### Domain/unit suite

Command:

```text
node --test test/*.test.mjs
```

Result:

```text
56 tests
56 pass
0 fail
```

Coverage includes exact arithmetic, ONS/BEA genericity, Truth Lock, immutable first answer, exposure ordering, durable retry/restart, ten-minute deadline, result honesty, `canonicalRead()`, Sandbox generated cases, Production freeze, simulation identities/model, study gate, and warehouse reconciliation.

### Browser-level product flow

A real Chromium browser was run against the isolated `e2e/study-server.mjs`, which exercises the real request handler, SQLite transitions, cookies, routes, and UI. Only the external Flagsmith transport is substituted by the repository's CI provider fixture.

Verified:

- public root exposes stable `Correction / Experiment / Sandbox` navigation;
- homepage primary CTA targets `/correction`;
- canonical endpoint fails closed before provider completion;
- two real recorded simulation identities preserve different initial assignments;
- experiment completion is recorded;
- Experiment page shows `Correction Note` and `Evidence Time Machine` as the historical fork;
- lifecycle state is `Release decision recorded.`;
- full historical iframes are closed by default;
- one click triggers fresh same-flag checks;
- result becomes `FORK COLLAPSED`;
- both cards become `Now · Evidence Time Machine`;
- canonical commit becomes visible;
- `/correction` renders `Evidence Time Machine · current` only after fresh same-flag agreement;
- the canonical ETM can switch between original/corrected ONS source states;
- Sandbox Quick Try produces `CHANGED`, `100 → 120`, and generic ETM source switching;
- mobile Experiment page keeps historical worlds compact and reveals one canonical page after collapse;
- public proof/canonical-page actions add **zero** experiment events;
- participant and answer records remain unchanged.

### Sandbox isolation

The Sandbox was also exercised through the static isolation server in Chromium.

Verified:

- no cookies;
- no study identity;
- no experiment backend/event request;
- only static Sandbox/engine assets are requested;
- Quick Try uses the same local generic engine.

## 6. Visual pressure-test after patch

Final desktop and 390px captures were inspected manually.

### Desktop

- recorded fork is immediately legible without nested-scroll prison;
- release decision appears after the historical worlds;
- `FORK COLLAPSED` is the dominant signature event;
- `This is now the page.` is a separate, obvious artifact consequence;
- proof is visually subordinate;
- canonical page renders the actual current ETM rather than a status-only screen;
- Sandbox Quick Try is visible before Advanced controls.

### Mobile

- headline and disclosure remain legible;
- recorded-fork heading stacks correctly;
- historical reader cards stay compact;
- full historical pages remain on demand;
- collapse and canonical-page consequence remain visible in the same linear story;
- no two-column iframe comparison is required.

## 7. Claims boundary preserved

The patch does **not** authorize claims such as:

- “Evidence Time Machine improves human comprehension by 41.61%.”
- “800 users/readers preferred Evidence Time Machine.”
- “Humans understood corrections better.”

Safe competition-facing framing remains:

> Under a frozen simulated behavior model, the real Flagsmith experiment selected Evidence Time Machine; the real assignment/event/rollout mechanism and same-flag convergence were exercised. This does not establish a human-comprehension effect.

## 8. Full framework build note

The repository declares Node `>=24`. The execution container available for this patch has Node `22.16.0`.

A dependency installation attempt was made solely to reproduce the framework build, but it did not complete within the available execution window. Therefore this report does **not** claim a fresh local `npm run build` result after the patch.

This limitation does not affect the runtime validation above: the modified worker/public route layer was executed directly through the repository's real isolated worker harness in Chromium.

Before deployment, run the normal project CI/build on Node 24+ (the original baseline CI already used the project's supported environment).

## 9. Deployment status

**Not deployed by this patch process.**

The supplied ZIP is a source handoff. After applying it to the actual repository:

1. run `npm ci` on Node 24+;
2. run `npm test`;
3. run `npm run build`;
4. run the browser/E2E suite;
5. deploy through the existing project workflow;
6. repeat the championship manual audit on the deployed URL;
7. only then unpause final demo production.

## 10. Championship verdict

The patch does not make ProofPivot bigger.

It makes the existing theorem literal:

> **Same facts. Two explanations. One earns the page.**

The two truthful worlds remain inspectable as experiment history.
The same flag determines what ships now.
And the public product finally has one current page the judge can point to.
