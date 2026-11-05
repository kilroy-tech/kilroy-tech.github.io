# External Events and Listener Bridge

Listener Bridge lets external applications, scheduled jobs, operating-system services, and monitoring tools send messages into a Kilroy group's AI agent. For example, an external process can report a completed job, ask the agent to analyze an alert, or supply an event that starts work with the agent's available tools.

This is a one-way input channel, not a conversational HTTP API. The caller receives confirmation that its message was injected into the listener swarm; it does not wait for an AI answer. An LLM interaction may take much longer than an HTTP caller should wait.

## How the Pieces Fit Together

| Component | Purpose |
|---|---|
| External application or service | Sends an HTTP POST to a listener endpoint. |
| Kilroy AI Services listener | Publishes the incoming message onto the configured listener swarm. |
| Listener Bridge group add-on | Forwards messages from that listener swarm into the group's private swarm. |
| Group AI pipeline | Accepts appropriately addressed messages and passes them to the AI agent. |
| AI tools, when results are needed | Deliver results separately using the contract agreed with the external application. |

The listener is part of `kilroy.ai.services`. Its settings and endpoints are hosted by the **WebHooks for WF Agents** process diagram, whose alias is `kilroy.ai.webhooks`. This is separate from the **Pipeline Builder** manager.

## Before You Start

- Run `kilroy.ai.services` so its WebHooks for WF Agents instance is available.
- Have a group with an AI agent, such as a group using the Basic Group Agent add-on. Listener Bridge does not create an AI agent by itself.
- Know which process will send the events and whether it needs results delivered somewhere else.
- Restrict access to the listener endpoint to trusted callers. See the [security notes](../developers/listener-api.md#security-and-trust-boundaries) before exposing it beyond a trusted local environment.

## 1. Configure the Listener

1. Open **WebHooks for WF Agents** under Kilroy AI Services.
2. Click **Settings**.
3. Check **Enable Listener Webhook**.
4. Set **Listener Swarm Name** and save the settings.

The default swarm name is `listener_swarm`. The listener has one configured destination swarm for both input endpoints; it does not select a group from each HTTP request.

The Connected indicator describes the listener's configured connection state. It is not proof that a group bridge or AI agent has received a particular message.

## 2. Add Listener Bridge to the Group

1. Stop the group before modifying its add-ons or variables.
2. In Group Manager, edit the group and select **Add Add-on**.
3. Add **Listener Bridge** from the template catalog.
4. Open **Edit Variables** and set the add-on's `listener_swarm` to exactly the same name configured in Listener Settings.
5. Save the variables and the group configuration, then start the group.

The template is a pipeline add-on and does not allow multiple copies within the same group configuration. The Groups manager supplies `group_private_swarm`; do not replace it with the listener swarm name or copy it into external requests.

If several groups deploy bridges listening on the same listener swarm, they can all receive its traffic. A swarm name is routing configuration, not a per-request group selector or an authorization credential.

## 3. Send a Message

Use the structured `listener` endpoint for a message addressed to the standard group AI pipeline. Its request includes `from`, `text`, and `type`.

For example, the JSON body for a scheduled-job notification could be:

```json
{
  "from": "backup-monitor",
  "text": "/wa Backup job backup-2026-001 completed. Summarize this event in the group chat.",
  "type": "text/plain"
}
```

The standard Basic Group Agent private-input path expects `/wa ` at the start of the message. Use a distinct external sender name rather than `Kilroy`, which that path excludes. Custom AI pipelines may define different addressing rules.

Use the actual Kilroy server address and API configuration, not a URL copied from another installation. The [Listener API reference](../developers/listener-api.md#http-endpoints) provides a complete command example and explains the acknowledgement.

The alternative `listener_raw` endpoint forwards a JSON representation of its received arguments. It does not automatically turn an arbitrary event into a `/wa` request. It is intended for a receiving pipeline that understands and transforms that event format; review the [raw-input contract](../developers/listener-api.md#raw-json-input) and security notes first.

## 4. Decide Where Results Go

There is deliberately no return path through the listener swarm to the HTTP caller. Injection acknowledgement does not mean the AI has finished, performed a tool call, or delivered a result.

If the external application needs a result, its developer must agree a contract with the AI agent and its tools. For example, the application supplies a unique results session ID in the task text, and the AI uses an approved tool to send that ID and the result to the application's result endpoint. A file, queue, or another supported tool destination can serve the same purpose.

Kilroy does not create that contract, choose the return destination, or match the result to the caller's request. Configure the required tool and agent instructions explicitly. See [Out-of-Band Results](../developers/listener-api.md#out-of-band-results) for an example contract.

## Troubleshooting

| Symptom | Check |
|---|---|
| Endpoint cannot be reached | Server address, API prefix, networking, and whether Kilroy is running. |
| Listener returns `ERR` | Listener enable/connection state in WebHooks for WF Agents settings. |
| Injection succeeds but the AI does not act | Group running; AI add-on present; exact listener swarm match; `/wa` prefix and sender filter. |
| A raw event is ignored by the standard group AI | Add a receiving transformation for the raw payload; raw JSON is not automatically `/wa`-addressed text. |
| More than one group reacts | Check whether their bridges share the same listener swarm. |
| No result arrives at the external application | Inspect the separately configured AI tool, destination, credentials, correlation ID, and delivery contract. The listener does not return AI results. |

## Related Reading

- [Getting Started with Kilroy Groups](../getting-started/quick-start.md#getting-started-with-kilroy-groups)
- [Listener API and Swarm Routing](../developers/listener-api.md)
- [AI Agent Configuration](../developers/ai-agent-configuration.md)