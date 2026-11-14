# Listener API and Swarm Routing

The listener endpoints provide one-way HTTP-to-swarm injection. They let external tools, operating-system services, and scheduled processes submit events or tasks to Kilroy without holding an HTTP connection open for an LLM interaction.

For UI setup, see [External Events and Listener Bridge](../apps/groups-listener-bridge.md).

For isolated request/response execution without a swarm, see [Standalone Listener Agent](#standalone-listener-agent) below. It is a separate API and does not change the one-way listener contract.

## Contract and Ownership

1. The caller submits a message to the listener.
2. The listener publishes it to its configured swarm and acknowledges injection.
3. A Listener Bridge add-on forwards that traffic to a group's private swarm.
4. The receiving pipeline applies its own addressing and filtering rules before invoking the AI.
5. If results are required, the AI delivers them through tools using an out-of-band contract defined with the external application.

There is no listener return path, AI-result HTTP response, or built-in listener result registry. This is intentional, not a missing synchronous feature. Result identifiers, delivery destinations, completion formats, and matching results to requests belong to the external application's contract with the AI agent and its tools.

## HTTP Endpoints

The listener webhooks are registered on `kilroy.ai.webhooks`, not on `kilroy.ai.services.manager`.

With the standard API prefix, the paths are:

```text
POST /api/v1/pd/webhook/{api_token}/kilroy.ai.webhooks/listener
POST /api/v1/pd/webhook/{api_token}/kilroy.ai.webhooks/listener_raw
POST /api/v1/pd/webhook_sync/{api_token}/kilroy.ai.webhooks/listener
POST /api/v1/pd/webhook_sync/{api_token}/kilroy.ai.webhooks/listener_raw
```

Use the deployment's actual base URL and API prefix. Send JSON with `Content-Type: application/json`. The token parameter is part of the existing server-webhook interface; see [Security and Trust Boundaries](#security-and-trust-boundaries) before treating it as access control.

`webhook` ordinarily returns after triggering the workflow. Supplying `"sync": true` requests workflow completion; `webhook_sync` always waits for workflow completion. In either case, synchronization concerns only the injection workflow, never downstream AI execution.

## Structured Message Input

`listener` reads these fields from the request body:

| Field | Meaning |
|---|---|
| `from` | Sender label; also used as the envelope message's `username`. Choose a label compatible with the receiving pipeline's filters. |
| `text` | Message/task text. The standard Basic Group Agent private-input path requires a leading `/wa ` command. |
| `type` | Message content type; use `text/plain` for a textual AI request. This field does not itself transform or route the text. |
| `sync` | Optional route-level flag requesting completion of the injection workflow. It does not request an AI result. |

The workflow reads these fields directly; callers should supply all three message fields rather than rely on defaults or schema-validation errors. Extra request fields are not automatically copied into the structured message envelope. Put application-specific event data and results session IDs inside `text`.

Example for a trusted local setup, with `KILROY_BASE_URL` and `KILROY_API_TOKEN` supplied by the caller's environment:

```bash
curl --request POST \
  --header 'Content-Type: application/json' \
  --data '{"from":"backup-monitor","text":"/wa Backup job backup-2026-001 completed. Summarize this event in the group chat.","type":"text/plain"}' \
  "$KILROY_BASE_URL/api/v1/pd/webhook_sync/$KILROY_API_TOKEN/kilroy.ai.webhooks/listener"
```

The listener publishes an envelope with this shape:

```json
{
  "from": "backup-monitor",
  "id": "kilroy.ai.webhooks",
  "args": [
    {
      "username": "backup-monitor",
      "text": "/wa Backup job backup-2026-001 completed. Summarize this event in the group chat.",
      "type": "text/plain",
      "timestamp": 0
    }
  ]
}
```

The timestamp above is illustrative; the workflow generates the actual time. The envelope `id` is the listener PDI alias, not a caller-supplied request ID or a result-correlation ID.

## Raw JSON Input

`listener_raw` constructs the same envelope shape, with `from` and `username` set to `WEBHOOK`, `type` set to `application/json`, and `text` containing a JSON string of `webhook_args`.

This means the workflow's argument object, not the untouched HTTP wire body, is serialized. The current HTTP route adds `_api_token` to that object before invoking the workflow; request fields such as `sync` can also be present. Do not send sensitive credentials or payloads into a broadly shared swarm. Review or sanitize this forwarding path before using raw input with real secrets.

A custom receiving pipeline must parse that JSON text, validate the event, and transform or route it as needed. The standard group `/wa` filter does not automatically accept an arbitrary raw JSON event, even if a nested field contains `/wa` text.

## Acknowledgement Is Not Completion

When the injection workflow completes, its final result is `OK` if the listener-connected branch published the message, or `ERR` if that branch was unavailable. The normal synchronous server response wraps this result; inspect both the outer `success` and `args.results` rather than only the HTTP status code.

An illustrative successful synchronous response contains:

```json
{
  "success": true,
  "args": {
    "results": "OK"
  }
}
```

The actual response can include additional workflow metadata. An asynchronous trigger acknowledgement does not contain the same completed-workflow result guarantee.

`OK` confirms injection, not delivery to every swarm participant, acceptance by an AI input filter, successful tool execution, or delivery of an out-of-band result. Callers must not use a longer HTTP timeout to wait for AI completion. The listener provides no queue, replay, deduplication, or exactly-once processing guarantee in this workflow; retries may produce duplicate work.

## Bridge and Receiving Pipeline Contract

The catalogued Listener Bridge is a `pipeline_template_addon` with `allow_multiple: false`. Its graph is:

```text
{{listener_swarm}} -> listener_bridge (pass-through wf_agent) -> ${group_private_swarm}
```

- The Listener Bridge add-on exposes a visible `listener_swarm_name` pipeline variable whose default is `{{listener_swarm}}`. Group Manager shows that macro in Edit Variables; leaving it unchanged resolves to the effective listener name of the Kilroy backend deploying the pipeline. Ordinary `${...}` defaults and group overrides are applied first, and the reserved macro is then expanded only in the selected variable value. A literal remote swarm name overrides the macro and is passed through without local resolution.
- The backend creates and persists a random UUIDv4-format default Listener Swarm Name in its platform key-value service settings on first WebHooks PDI initialization. User-entered and `LISTENER_SWARM_NAME` override values may be any nonempty swarm name accepted by the underlying swarm library. If the environment variable is set, the WebHooks Settings UI displays its value as read-only.
- Setting changes affect new deployments. Existing bridges stay joined to their old topic and require group redeployment.
- The Groups manager supplies `group_private_swarm`. It is not an external caller's destination argument.
- The bridge receives all sender names (`*`) and calls no transformation webhook. It supplies no reverse edge from the group back to the listener swarm.
- The standard Basic Group Agent private-input filter accepts `/wa` messages from senders other than `Kilroy` and forwards accepted traffic toward its AI input. Other templates must be checked against their own routing rules.
- AI `/wa` output is handled by the group's existing response routing. It is not an HTTP reply and does not create a listener return channel.

Use a unique sender label such as `backup-monitor` or `desktop-alerts`, not the excluded `Kilroy` identity. For custom receiving pipelines, specify the accepted sender labels, event schema, text prefix, and downstream action explicitly. A label is not authenticated identity.

The listener service has one configured swarm for both endpoints. Multiple bridge subscribers on that swarm can receive the same traffic. Choose routing and input filters deliberately; the listener does not infer a target group from the payload.

## Out-of-Band Results

Any result delivery is a developer-level agreement between the external application and the AI agent with its tools. Kilroy's listener does not supply correlation fields, callback execution, a result endpoint, or result polling.

An application-defined example, not a listener API schema:

```json
{
  "results_session_id": "backup-2026-001",
  "status": "completed",
  "result": "Backup completed without errors."
}
```

The external application could place that ID and task requirements in the structured request's `text`. The agent's instructions and an approved tool then define how the result is delivered, for example to an application-owned endpoint, a file, or a queue. These fields are not automatically interpreted by the listener.

Agree the following before building either side:

- How the caller creates a unique ID and the agent preserves it through tool calls.
- Which actual tool can deliver results and how its destination and credentials are configured.
- Success, failure, progress, and partial-result formats, if needed.
- How the receiver validates the ID and sender, rejects duplicates, and handles late or missing results.
- Retry and idempotency behavior, including what happens if injection succeeds but the HTTP acknowledgement is lost.
- Which actions the AI is authorized to take in response to external events.

Do not treat an arbitrary callback URL in untrusted event text as permission for the AI to send data there. Configure allowed destinations and tool policy separately.

## Security and Trust Boundaries

The current backend `ValidateServerKey` implementation is a permissive stub, not a demonstrated per-caller credential check. A token-shaped URL must not be presented as sufficient protection for an Internet-exposed listener. Keep access constrained to trusted callers using appropriate deployment/network controls and a verified authentication boundary.

External event text can influence an AI with tools. Validate events and establish action permissions in the receiving integration. Sender labels, swarm names, and a Connected indicator do not establish caller authorization. Avoid including secrets in request text, URLs, logs, or raw forwarded arguments.

## Standalone Listener Agent

The combined Kilroy backend also exposes a direct Pi-backed service:

```text
POST /api/v1/ai/listener_agent
POST /api/v1/ai/listener_agent/{profile_name}
```

The `/ai` router is backend-owned, not an app webhook. The API version prefix follows the backend's existing configuration. The omitted profile name selects `/system/default`; `research` selects the exact database profile name `/system/research`. These names are database identifiers, not filesystem paths. Names accept 1-64 letters, digits, underscores or hyphens and must start with a letter or digit. A missing explicitly named profile returns `404`, without falling back to default.

**Local clients only for now.** The route accepts loopback TCP peers only: IPv4 `127.0.0.0/8`, IPv6 `::1`, and IPv4-mapped loopback addresses. Other clients receive `403 LOCAL_ONLY` before profile lookup or agent execution. The check uses the socket peer address; `Host` and forwarded-IP headers do not grant access. A proxy must connect to Kilroy over loopback. This is a temporary network restriction, not API-key authentication; the existing shared API-key validation remains deferred and permissive.

Each request runs an independent agent turn, including tool calls and follow-up inference. It has no parent PDI, listener swarm, conversation reuse, or retained conversation history. Its final response is returned over the original HTTP connection. Explicitly configured memory/file tools can still persist their own data; this is distinct from conversation persistence.

### Configure the Profile

1. Install/update Kilroy AI Harness and load its bundled profiles using the existing manager initialization or `load_agent_profiles` operation. The bundle includes an intentionally unconfigured example named `example/system/default`; it is outside the `/system/` namespace used by this endpoint.
2. Use the existing `agent_profile` tools to find `example/system/default`, then create a copy with `agent_id` set to `/system/default`. Configure that copy using the existing tools or profile editor; do not rename the bundled example itself. See [Agent Profiles](agent-profiles.md).
3. Replace its model, provider URL and working-directory placeholders. Set `pi_working_dir` to an existing absolute backend directory or a supported location-macro path such as `{{kilroypublic}}`, and configure the appropriate provider/API fields.
4. Set the backend environment variable named by `pi_api_key`. The starter names `KILROY_SYSTEM_AGENT_API_KEY`; the profile stores the variable name, not its secret value.
5. Review the system prompt and tool permissions before making a request. Kilroy AI Services must be installed and its `kilroy.ai.webhooks` PDI running for the starter's Kilroy tools. A running group or harness agent is not required for execution.

All model fields and the `tools`, `kilroy_tools`, `tool_instances`, `skills` arrays must be explicit; `inherit_skills` must be false. Empty arrays disable that category. Unresolved deployment or parent placeholders, missing credentials, and invalid tool bindings fail before inference. Supported invocation macros such as `{{text}}`, and file-location macros such as `{{kilroypublic}}`, remain available in appropriate tool definitions.

The standalone service expands the six shared directory macros in `pi_working_dir` and explicit tool-instance `bind.path_prefix` / `bind.output_dir` values: `{{kilroypublic}}`, `{{home}}`, `{{temp}}`, `{{documents}}`, `{{downloads}}`, and `{{desktop}}`. Names are case insensitive; paths can include suffixes, such as `{{documents}}/project` or `{{kilroypublic}}/ai_images`. See [Directory Macros](file-tools.md) for environment overrides and container mappings. The working directory must exist after expansion. Unknown, malformed or circular location references are configuration errors.

Expansion changes only the per-request configuration snapshot, not the stored profile. It does not apply to the system prompt, request text, memory IDs or command templates, and it does not substitute `${...}` variables. `{{text}}` remains an invocation-time command/template placeholder; it is not valid as a directory macro.

The canonical starter includes text-file read/write/edit confined to `{{kilroypublic}}`, weather/stock/crypto lookups, GUID/timestamp tools, and explicitly scoped service memory. It excludes shell tools, scheduling, group chat, task boards, group history, parent controls, and UI tools. Advanced profiles may bind group/swarm tools to concrete deployed aliases or swarm names; there is no automatic group-variable lookup.

### Final-Only JSON

```bash
curl --silent --show-error --fail \
  --header 'Content-Type: application/json' \
  --header "API_KEY: $KILROY_API_TOKEN" \
  --data '{"text":"What is the current timestamp?"}' \
  "$KILROY_BASE_URL/api/v1/ai/listener_agent"
```

An illustrative final response is:

```json
{"success":true,"text":"The current timestamp is ..."}
```

Callers supply `text`, optional boolean `stream`, and optional `events` flags. They cannot override the selected profile's execution configuration. No `/wa` prefix, session ID or callback is needed.

### NDJSON Streaming

Use `curl --no-buffer` and opt into streaming:

```bash
curl --no-buffer --silent --show-error \
  --header 'Content-Type: application/json' \
  --header "API_KEY: $KILROY_API_TOKEN" \
  --data '{"text":"What is the current timestamp?","stream":true,"events":{"thinking":false,"tools":true}}' \
  "$KILROY_BASE_URL/api/v1/ai/listener_agent"
```

The content type is `application/x-ndjson`. Each line is a separate JSON object:

```jsonl
{"event":"accepted","seq":1}
{"event":"tool_start","tool":"timestamp","status":"","seq":2}
{"event":"tool_end","tool":"timestamp","status":"success","seq":3}
{"event":"result","success":true,"text":"The current timestamp is ..."}
```

`thinking` and `tools` default to false. These flags control reporting, not reasoning settings or tool execution permissions. Thinking events contain provider-reported thinking text where available; providers need not emit it. Tool events report names/status, not tool arguments or full tool output. Review thinking disclosure before enabling it for sensitive tasks.

The stream starts with `accepted` and ends with exactly one `result` or `error` when delivery remains possible. Intermediate events are not persisted. Validation/admission failures return normal HTTP JSON errors before streaming starts. After streaming starts, failures appear as terminal NDJSON errors and do not change the HTTP status; clients must inspect the terminal event. A lost connection or a slow client exceeding the buffer limit can prevent terminal delivery.

### Limits and Failure Handling

| Setting | IOC limit/default |
|---|---|
| Request body / final result | 32 KiB each |
| Execution deadline | 120 seconds, including queue wait after preparation; profiles may lower it |
| Active service executions | `AI_MAX_SUBAGENTS`, default 2, capped at 32; service pool is independent of parent subagents |
| Waiting service requests | 8; overflow returns `429` |
| Tool calls | 150 maximum |
| Tool webhook payload | 32 KiB |
| Context settings within the fresh turn | 16,000 content tokens, 20 turns, 60% compaction defaults |
| Thinking batching | 220 characters or 1200 ms |
| Pending stream buffer | 256 KiB |

Oversized results fail explicitly rather than being silently truncated. Deadlines and disconnects request adapter cancellation and dispose the request's session when execution settles. Capacity remains occupied while cancellation is settling. Already-completed tool side effects are not rolled back, and not every tool is interruptible. Do not automatically retry side-effecting tasks.

Common errors include `INVALID_REQUEST` (400), `PROFILE_NOT_FOUND` (404), `REQUEST_TOO_LARGE` (413), `PROFILE_CONFIGURATION` (422), `CAPACITY` (429), `EXECUTION_FAILED` / `OUTPUT_TOO_LARGE` (502), and `TIMEOUT` (504).

### Deferred API-Key Enforcement

**This endpoint is open for IOC.** It accepts the existing key through the `API_KEY` header, `X-API-Key` header, or `API_KEY` request field/query parameter, but the shared `ValidateServerKey` implementation remains permissive. Neither a supplied key nor the `/system/` naming prefix authorizes a caller today. Keep access restricted to trusted local/network callers; do not expose the endpoint unprotected to the Internet.

Deferred technical debt: implement shared backend API-key validation, reject invalid keys before profile lookup/inference, and add authorization regression tests for all affected APIs. No separate listener-agent authentication mechanism is introduced in IOC.

## Implementation Map

| Component | Owning source within the project |
|---|---|
| Listener registration and settings UI | `kilroy.ai.services/process_diagrams/webhooks/diagram.json` |
| Listener state and enable/swarm configuration | `kilroy.ai.services/workflows/webhooks/{init_hook,ui_settings,resume_hook}/payload/` |
| Structured and raw envelope construction | `kilroy.ai.services/workflows/webhooks/{listener_hook,listener_raw_hook}/payload/json.json` |
| Group bridge source and catalog | `kilroy.ai.services/public/_pipeline_templates/` |
| Example receiving AI topology | `kilroy.ai.services/public/_pipeline_templates/` Basic Group Agent template |
| HTTP dispatch and synchronous response wrapping | `kilroy.backend/api/routes/process_diagram.src.js` |

For the complete workflow lifecycle and output rules, see the [wfProxy reference](wfproxy-api-reference.md#workflow-execution-lifecycle). See [AI Agent Configuration](ai-agent-configuration.md) for model and tool configuration.