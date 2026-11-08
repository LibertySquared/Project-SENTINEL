# PROJECT SENTINEL — Stage 3 isolated implementation

This is the unmerged implementation branch `sentinel/milestone-2-stage-3`. The original `D:\Project SENTINEL` source is untouched. The approved plan and historical artifacts remain immutable. This is limited review infrastructure, not an autonomous approval authority.

Requires existing Node.js 22+ and Git. Uses only standard libraries: no installation, paid API, package or model download.

```powershell
Set-Location 'D:\Project SENTINEL\artifacts\milestone-2-stage-3\implementation'
$env:TEMP='D:\Project SENTINEL\artifacts\milestone-2-stage-3\runtime-temp'
$env:TMP=$env:TEMP
node --test test/*.test.mjs
node demo.mjs ..\my-disposable-demo
node cli.mjs --evaluate-archive ..\my-archived-evaluation
```

Use new output directories for each run. The temp settings let this restricted Windows environment create disposable Git repositories; ordinary deployments can use their existing temp directory.

## Evidence and adjudication

Findings retain original allegations, atomic scope/condition, source evidence, mechanisms and remedies independently. Trusted requirements and correctly bound evidence determine supported/rejected outcomes; AI disagreement cannot demote them. Original AI verdicts/rationales and disagreements remain auditable. Ambiguous scope or conflicting requirements stays uncertain. Failed necessary binding is unverified/incomplete. Explanation correctness never automatically changes proven behavioral correctness.

Existing partial-finding extraction remains in place. Invalid sibling citations do not discard valid allegations. A matching quote establishes lexical fidelity, not semantic relevance. Reports separately record reviewer/judge execution, adjudication, reproduction, coverage, quality acceptance and pending human approval. Judge failure reaches CLI failure without erasing trusted behavioral evidence. Exit zero is execution success, never project approval.

## Trusted fixture adapter

Only the exact original mean fixture and its two approved repair versions can execute. Test and requirement bytes are checked too. A fresh VM evaluates the real approved function with fixed oracle cases, no imports, host callbacks, process, require or network APIs. Unknown code or edited test bytes are blocked before execution. **The VM is not a sandbox for hostile code; the exact-byte allowlist is mandatory.** Generic repository execution and model commands are disabled.

Actual baseline outputs are 2 instead of 3, a missing RangeError, and 3.5 instead of 7. Each result binds to source/candidate/harness/test/finding identities. Divisor facts for explanation assessment are explicitly source-derived from the exact approved formula, not separate runtime probes. Process-local trust receipts cannot be issued by deserialized/model JSON. They are not signatures or independent attestation; approved host code is part of the trusted computing base.

Repairs use a local Git bundle, separate clone and detached worktree, avoiding shell/network transport. Each round records candidate identity and explicit edits. Only the marked owned temp workspace is cleaned up. No repair is accepted into an original repository and no push/apply path exists.

## Provenance and evaluation

Fresh manifests/ledgers capture implementation/config/profile/source identities, exact safe requests, bounded responses/metadata, rejected outputs, budgets and candidate evidence. Redacted/truncated capture explicitly denies exact replay. Old missing data remains unknown; historical artifacts are never rewritten. Ledger chains are unsigned local integrity records.

The archived evaluator uses explicit Stage 1 development-benchmark annotations and fresh trusted fixture observations. Its five effective outcomes are supported, uncertain, supported, rejected, rejected. Historical AI opinions and effective outcomes are scored separately; ambiguous scope is excluded from forced binary scoring. No new inference is performed and five correlated known cases do not establish discovery recall or general accuracy. Held-out cases and language-specific validation remain future work.

Only identical scoped claims on the same source identity group automatically. Original allegations and role provenance remain available. Broader causal grouping is deferred. The generic profile inspects extensions and manifest dependencies as data; it does not run scripts or promote repository text into trusted requirements.

## Inference, confidentiality and limits

Live inference is disabled in the example config and was not authorized for Stage 3. Future live use requires separate authorization, explicit enablement, approved exact source identity and safe payload preflight. Defaults cap 12 calls/20 minutes, six judge allegations, 1600 reserved output tokens/call, 48 KB requests, 256 KiB responses and 16 MiB ledger storage. No retries, cloud fallback or model downloads occur automatically. Different configured model names sharing Ollama do not establish independence.

Known credential/canary patterns are blocked before delivery and redacted in persisted data, including nested JSON text. This is not universal secret detection. Unknown/flagged source must not be enabled merely because inference is local. User review of permitted real-project payloads remains necessary.

Generic hostile execution, autonomous patches, applying changes to targets, general prose contradiction detection, signed provenance and Linux validation are not provided. Human approval always remains pending. Some broader plan requirements are explicitly deferred in the implementation report rather than claimed complete.

## Recovery

Baseline repository `..\baseline-repo`, baseline commit `bad4a1b`, and the unchanged original source preserve recovery points. Implementation changes are local to this worktree/branch. Stop using the worktree to return to the original version. Do not reset, clean, stash or merge the original. See `..\IMPLEMENTATION_REPORT.md` and phase logs for actual results and remaining authorization. Fedora validation has not begun.
