# Listener API and Swarm Routing

The listener endpoints provide one-way HTTP-to-swarm injection. They let external tools, operating-system services, and scheduled processes submit events or tasks to Kilroy without holding an HTTP connection open for an LLM interaction.

For UI setup, see [External Events and Listener Bridge](../apps/groups-listener-bridge.md).

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
${listener_swarm} -> listener_bridge (pass-through wf_agent) -> ${group_private_swarm}
```

- `listener_swarm` defaults to `listener_swarm` and must match the service's Listener Swarm Name exactly.
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