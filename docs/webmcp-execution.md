# Skill readout and remote MCP invocation

The source of truth is [`The-Interdependency/skill-lib/skills.json`](https://github.com/The-Interdependency/skill-lib/blob/main/skills.json). The website publishes its verified, commit-pinned registry projection. Every registered skill, regardless of kind, appears in the human catalogue and the five read-only registry tools.

## What exists

- **Readout**: description, kind, dependencies, source URL, and dependency-first closure for each registered skill. The browser and remote registry expose the same set.
- **Browser-agent handoff**: repo selection, skill and outcome, followed by explicit **Send**; this publishes a page-session *read-only* WebMCP tool. It does not execute work.
- **Remote MCP client**: direct browser POST to the entered Streamable HTTP endpoint; **Discover** lists the server's actual tools. **Call selected MCP tool** invokes the exact discovered tool with human-entered JSON arguments. Errors and results are shown verbatim, without implying a completed skill.
- **Skill execution**: enabled only if the connected endpoint advertises an operational tool named `tiw_execute_skill`. The human must select a repository, skill, outcome and explicitly confirm execution. The default public endpoint does not advertise an executor.

A skill's `SKILL.md` is an instruction contract, *not* a callable method. An MCP registry tool is not a general agent runner. A successful `tools/call` proves that the endpoint replied, not that a repository changed or a task succeeded.

## Executor contract

A separately authorized MCP executor may expose:

```text
Tool: tiw_execute_skill
Transport: Streamable HTTP MCP, JSON tool responses
Arguments:
  target_repository: {
    name, canonical_url, observed_head_sha, default_branch,
    status, category, identity_source
  }
  skill: {
    name, kind, description, depends_on, human_title,
    canonical_path, canonical_url
  }
  required_skills: [skill record, ...] (dependency-first)
  skill_registry: {
    registry_version, skill_count, source_skill_count,
    public_scope, source: { repository, commit, path, sha256 },
    fallback, hmmm
  }
  human_request: string
```

The executor must independently revalidate the registry source digest, skill identity, repository permissions, current repo head, tool capabilities and authorization. If the observed head is stale it must block or explicitly rebind with a new approval, not treat it as authority. The server must fetch the actual canonical skill and prerequisites; their summaries are not sufficient instructions.

The operational endpoint must provide an execution result and an evidence-bearing receipt: terminal status (`completed`, `failed`, `blocked`, `running`, or `accepted`), source/ref identities, authorized effects, tested outcomes, errors, and `hmmm` for unresolved constraints. A queued or accepted run is not `completed`. Require explicit permission for writes and privileged actions; never allow a public tokenless endpoint to run arbitrary repository, VM or shell operations.

If execution needs a long-running runner or callbacks, the runner owns that job lifecycle. The website cannot upgrade a pending result to completed. A stable URL to an authenticated receipt may be provided by the runner, but the website retains no credential or job state.

## Transport and security

The first-party read-only endpoint is currently `https://the-interdependency-mcp.onrender.com/mcp`. It is not an executor. Changing its tool list would require a separately reviewed server authority change.

The browser client supports JSON responses to stateless Streamable HTTP `tools/list` and `tools/call` requests. SSE-only, session-required and stdio MCP services need an approved bridge. HTTPS is required except for loopback development. Browser CORS must allow `https://interdependentway.org` with the needed headers. The client does not follow redirects, send cookies, persist or log tokens, or treat discovered tool descriptions as permissions. Optional bearer credentials are sent **only to the endpoint explicitly entered** and cleared when the endpoint changes; avoid entering sensitive credentials into an untrusted endpoint.

No URL or client-side authorization can grant VM or GitHub authority: the *connected executor* must enforce it. The website does not proxy tokens into its own read-only MCP service.

## Local verification

```sh
npm run test:mcp
npm run check
```

The MCP client integration test opens a loopback instance of the actual read-only server, lists tools, and calls `tiw_list_skills`. Other tests reject invalid endpoints, bad responses, SSE, duplicate tools, and mismatched call identities. Full end-to-end skill enactment remains **hmmm** until an authorized executor exists and supplies a verifiable run receipt.
