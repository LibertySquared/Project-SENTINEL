# PROJECT SENTINEL — local prototype

Requires Windows, Node.js 22+ and Git on PATH. No npm install, subscriptions, cloud API keys, or third-party packages. Confirmed installation: `D:\Project SENTINEL`.

```powershell
Set-Location 'D:\Project SENTINEL'
node --test test/*.test.mjs
node demo.mjs
# Local AI review plus deliberately broken fixture and bounded repairs:
node demo.mjs artifacts\my-validation --live
# Review your selected Git ROOT; output must be a NEW folder outside that repository:
node cli.mjs 'D:\YourRepo' config.example.json 'D:\Project SENTINEL\artifacts\review-001'
```

Ollama must already be running on 127.0.0.1:11434. The example uses installed qwen2.5-coder:7b and qwen3:4b reviewers plus gemma4:e2b judge. Adjust model names and role instructions independently in your own configuration. Calls run sequentially, 180 seconds per request, 30 findings per role maximum, 8k context and 1600 output tokens. Models unload after each request. `maxBytes` caps source input; `maxRounds` controls the demo repair budget, bounded to 1–3 (default two). There is no automatic model download. Structured output uses Ollama's JSON schema format: https://docs.ollama.com/capabilities/structured-outputs

## What works

The review CLI reads eligible tracked text from the current working tree, including tracked local edits, without running repository code. It records HEAD, status, source digest, coverage exclusions, independently prompted role reports, raw structured responses, exact line/quote checks, adversarial judge challenges, and a hash-chained JSONL ledger. Invalid citations are retained as rejected evidence while valid findings continue to the judge; the report is marked partial. Errors and malformed evidence fail closed. The gate always remains NEEDS_HUMAN_REVIEW. A model saying “supported” is never recorded as runtime reproduction. Exit code 0 means the review ran without reviewer errors, not approval; 1 means failed/partial execution; 2 means missing arguments.

The demo plants two defects in a fresh disposable Git repository: incorrect mean divisor and omitted empty-input validation. The judge's executable evidence is a fixed, known test harness: tests fail initially, one defect remains after round one, all three regression tests pass after round two. Repair uses exact preconditioned edits from a deterministic plan, not autonomous AI patches. Re-review in the bounded loop combines repeated behavioral tests with explicit requirement checks. Repair evidence includes every round, test output, candidate diff and source-unchanged check. The defective source stays unchanged.

`repairLoop(root, plan, rounds, verify)` is a library API for trusted callers. It refuses dirty source trees, clones locally without hardlinks, creates a detached disposable worktree in that clone, and deletes only its own temporary directory. Source repository worktree metadata is never altered. A trusted caller must explicitly supply the repair plan and verification function; there is no CLI that executes arbitrary repository tests or accepts model-produced commands.

## Safety and practical limits

No push, merge, reset, target edit, or target test execution exists in the review CLI. No automatic apply-to-source feature exists. Writing repairs into a real target requires a future explicit human approval workflow; this prototype cannot do it. Only the known generated fixture runs executable tests automatically. A disposable worktree isolates Git changes, **not hostile code execution**: never supply untrusted verification callbacks. Do not run tests from an unknown repository without reviewing them and giving approval.

Tracked files only; common source/text extensions only; no full repository or dependency audit. Untracked and ignored files are excluded; tracked deletions are listed as excluded. Links are rejected. There is no secret scanner: eligible tracked source may contain secrets, although requests are restricted to local Ollama. Coverage caps can omit important files and are visible in reports. Snapshots can race concurrent editing: avoid changing the target while reviewing. The digest/status comparison covers selected content and Git status, not a forensic byte-level guarantee for excluded files.

Different models share one local inference provider. This is model diversity, not proven reviewer independence. Same-model configurations explicitly disclose their limitation. Model names are configured identities, not cryptographic proof of different weights. Small local models may miss defects or return malformed JSON. Empty results never earn automatic approval. The evidence hash chain detects edits only if its final hash is trusted elsewhere; it is not a signed or tamper-proof audit log.

## Files

`sentinel.mjs` engine; `cli.mjs` read-only entry point; `demo.mjs` disposable fixture, trusted judge tests and repair demonstration; `test/sentinel.test.mjs` automated acceptance and safety tests; `config.example.json` local role configuration; `package.json` run commands; `SENTINEL.code-workspace` editor workspace and test/demo tasks; `.gitignore` generated artifacts exclusions; `REFERENCES.md` license/dependency audit; `VALIDATION.md` measured results; `MANIFEST.json` exact generated file inventory. `artifacts/` contains generated JSON evidence and disposable fixture repositories.

GlitchStitch is outside this milestone. Do not use this prototype as an automatic approval authority.
