# PROJECT SENTINEL validation — November 8, 2026

## Decision

Working local prototype demonstrated. **Not approved as an autonomous supervisor or repair authority.** The orchestration, read-only review, evidence validation, fail-closed gate and bounded disposable repair pipeline work. Live local model results contain factual mistakes, malformed output and citation errors. Passing infrastructure tests does not establish AI review accuracy.

## Installation and environment

The pre-existing `D:\Project SENTINEL` directory was located by listing D:\ and confirmed empty before the first write. No GlitchStitch repository was inspected, opened or modified. No unrelated project files were changed. Development staging used this chat's `work/sentinel` directory before installation into the confirmed destination.

* CPU: AMD Ryzen 9 9955HX, 16-core processor.
* RAM: 16,299,315,200 bytes (about 15.2 GiB).
* GPU: NVIDIA GeForce RTX 5060 Laptop GPU, 8,151 MiB VRAM reported by nvidia-smi. Windows' AdapterRAM field was truncated, so it was not used as VRAM evidence.
* Node.js v24.22.1; Git 2.56.0.windows.4; Ollama CLI 0.40.3.
* Python on PATH resolved to a WindowsApps alias; Python was not needed or installed.
* Ollama installed models: qwen2.5-coder:7b, qwen3:4b, gemma4:e2b. Actual model digests and metadata recorded in `artifacts/installed-models.json`.
* No new models, packages or paid services installed. All model requests used local loopback; reviewers run sequentially.

## Automated acceptance

Command: `node --test test/*.test.mjs` from `D:\Project SENTINEL`.

14 tests passed; zero failures, skipped or cancelled tests. Full final output: `artifacts/automated-tests.log`.

Coverage includes planted runtime and requirement defects, two repair rounds with regression tests, exhausted budget remaining failed, unchanged source, dirty-target repair refusal, traversal rejection, invented-citation rejection, output-inside-target refusal, malformed reviewer/judge output, unavailable inference, single-model limitation disclosure, working-tree edits, coverage exclusions, mixed valid/invalid findings and hash-chain validation.

The initial restricted run could not initialize disposable Git repositories. The authorized unrestricted run then exposed an inherited NODE_TEST_CONTEXT setting that prevented nested test execution; removing that setting in the fixture runner fixed the issue. Subsequent runs executed real failing and passing child tests. This history is not counted as successful validation until corrected runs passed.

## Executable judge and bounded repair evidence

Command: `node demo.mjs artifacts\final-repair-validation`.

| Stage | Arithmetic test | Empty-input requirement | Single-value regression | Overall |
|---|---|---|---|---|
| Baseline | Fails: mean([2,4]) returns 2, expected 3 | Fails: no RangeError | Fails: mean([7]) returns 3.5 | Fail |
| Repair round 1 | Pass | Still fails | Pass | Fail |
| Repair round 2 | Pass | Pass | Pass | Pass |

The judge's executable evidence is a trusted, deliberately authored fixture test harness. Its observations outrank model assertions. The repair plan is deterministic and explicitly supplied in the demo: correct the divisor, then add an empty-input guard. It is **not an AI-generated or autonomous repair**. Each round re-runs behavioral tests and requirement checks. The source fixture's HEAD, reviewed content digest and Git status remain unchanged. Repairs happen in a detached worktree of a separate disposable clone; only that clone's metadata changes. The candidate diff survives in the evidence JSON after disposal.

Evidence: `artifacts/final-repair-validation/repair-evidence.json`, `artifacts/final-repair-validation/reproduction-ledger.jsonl`, and `artifacts/repair-validation.log`. The intentionally defective source fixture remains available for inspection in that artifact directory. Temporary repair clones/worktrees were removed.

## Real local-model trials

The first live run completed calls to both configured reviewer models and the separate gemma judge. The coder found the arithmetic defect with an inaccurate explanation. The requirements reviewer returned an invalid findings shape. The judge produced a contradictory rejection despite describing the arithmetic failure. Those raw conclusions were preserved; the gate stayed NEEDS_HUMAN_REVIEW and targetUnchanged was true. See `artifacts/validation/local-model-review/`.

A stricter JSON-schema trial produced structured output but invented line numbers and modified quotes. Citation validation rejected those reports instead of treating them as clean reviews. See `artifacts/strict-model-review/`. This prompted numbered source context and per-finding validation so one bad citation no longer discards valid findings from the same reviewer. Invalid evidence remains visible and marks a report partial.

## Scope and licensing

Reviewing arbitrary selected Git working trees is supported. Automatically executing arbitrary target tests or applying repairs to a real target is not exposed. The executable reproduction/repair demonstration covers the known fixture; a general-purpose safe test-runner, approval UI, autonomous patch generator, signed audit storage and broad held-out accuracy evaluation remain future work. Model independence is not established: there is one Ollama provider and multiple configured model families. All outputs explicitly disclose this.

`REFERENCES.md` records Juror, Code Jury and PR-Agent reference URLs and verified MIT notices. No upstream code or dependencies were reused. The package has zero npm dependencies. External runtime and model-weight redistribution are outside this prototype's dependency audit.

## Commands

```powershell
Set-Location 'D:\Project SENTINEL'
node --test test/*.test.mjs
node demo.mjs
node demo.mjs artifacts\another-live-validation --live
node cli.mjs 'D:\YourSelectedGitRoot' config.example.json 'D:\Project SENTINEL\artifacts\review-001'
```

Review output must be a new directory outside the selected target; its parent must exist. Never select GlitchStitch until a separate review is authorized. Inspect `report.json` and `ledger.jsonl`; exit code zero is not approval. Exact file paths and SHA-256 hashes are recorded in `MANIFEST.json`, including generated fixture Git internals. The manifest excludes itself to avoid a self-hash cycle.

## Final numbered-source live run

Both separately configured reviewer roles completed. Exact final counts and verdicts follow; these are observations, not accuracy guarantees. Evidence: `artifacts/numbered-model-review/report.json` and its hash-chained `ledger.jsonl`.

| Role | Model | Status | Valid citations | Rejected citations |
|---|---|---|---|---|
| correctness | qwen2.5-coder:7b | completed | 2 | 0 |
| requirements | qwen3:4b | completed | 3 | 0 |

| Finding | Judge verdict | Runtime reproduced by model |
|---|---|---|
| Arithmetic Defect | rejected | False |
| Omitted Empty Guard | rejected | False |
| Mean function lacks empty array guard | rejected | False |
| Test case for empty array is missing | rejected | False |
| Test case for single element is incorrect | rejected | False |

Target unchanged: True. Final gate: NEEDS_HUMAN_REVIEW. The final review includes flawed explanations and false positives; judge verdicts must be checked against executable evidence. The trusted fixture harness, not the model's text, proves the two planted defects and their corrections. No claims of model reviewer independence or automatic acceptance are made.

