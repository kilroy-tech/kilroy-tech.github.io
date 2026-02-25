# Memory Agent Blocks

Kilroy AI Services includes four built-in `wf_agent` blocks for persistent memory storage. They provide a
lightweight key/value-style record store backed by a per-pipeline SQLite database, accessible from any
pipeline node that can send a swarm message.

---

## Overview

Memory agents let a pipeline store, retrieve, search, and delete text-based records that persist across
conversations. Each record is written to a named memory store identified by a `memory_id` path. All four
blocks share a common record schema and a common configuration approach.

### Record Schema

Every memory record has the following fields:

| Field | Type | Description |
|---|---|---|
| `guid` | string | Unique identifier for the record (UUID) |
| `scope` | string | Logical grouping label |
| `kind` | string | Record category tag (e.g. `"observation"`, `"summary"`) |
| `content` | string | The stored text |
| `source` | string | Provenance label (defaults to the sending agent's name) |
| `tags` | array | Optional array of string tags |
| `created_at` | number | Unix timestamp (ms) when the record was created |
| `updated_at` | number | Unix timestamp (ms) of the last modification |

### Memory ID Convention

All four blocks require a `memory_id` in their `wf_webhook_args`. This is a relative path within the
platform's memory root directory:

```
instances/<pipeline_uid>/<agent_alias>
```

For example: `"instances/a3d8f1b2/memories"`. Using the pipeline UID in the path keeps each pipeline's
data isolated from other pipelines. The `memory_id` also serves as the default `scope` value for writes
if no explicit `scope` is specified.

### Dispatch Pattern

A common pipeline design is to intercept slash-commands from a chat agent using `regex_match` relay agents,
which extract the command argument and re-publish it as the incoming message to the memory block. Because
the memory blocks read `args[0].text` as their payload, this works without any custom scripting. See each
block below for how `args[0].text` is used.

---

## memory_write

### Description

Stores a text string as a new record in a memory store. Each call creates a new record with a unique `guid`;
records are not deduplicated or updated — they accumulate.

### Use Case

Use `memory_write` when a pipeline agent should remember a fact, observation, or event for later recall.
Typical patterns:

- A user posts `/write The meeting is at 3pm` and a `regex_match` relay extracts the payload and delivers
  it to `memory_write`.
- An AI agent produces a response that should be persisted automatically before being sent to the chat.

### Input from Swarm

| Field | Required | Description |
|---|---|---|
| `args[0].text` | **Required** | The text content to store as the new record |

If `args[0].text` is empty or missing, the hook returns `{ "error": "no content" }` without writing.

### Output to Swarm

A JSON string published back to the output swarm:

| Condition | Response |
|---|---|
| Success | `{ "guid": "<uuid>" }` |
| Failure | `{ "error": "<message>" }` |

### wf_webhook_args

These are set on the agent node in the pipeline editor under **Webhook Args**:

| Key | Type | Required | Default | Description |
|---|---|---|---|---|
| `memory_id` | string | **Required** | — | Memory store path, e.g. `"instances/a3d8f1b2/memories"` |
| `scope` | string | Optional | `memory_id` value | Logical scope label for grouping records |
| `kind` | string | Optional | `"observation"` | Category tag for the record |
| `source` | string | Optional | Agent name | Provenance label stored with the record |
| `tags` | string | Optional | `"[]"` | JSON array string of tags, e.g. `'["important","fact"]'` |

### Example wf_webhook_args JSON

```json
{
  "memory_id": "instances/a3d8f1b2/memories",
  "kind": "observation",
  "source": "user"
}
```

---

## memory_read

### Description

Reads records from a memory store and returns them as a JSON array. Optional filters narrow results by
`kind`, `scope`, or `source`. With no filters, all records are returned.

### Use Case

Use `memory_read` to retrieve stored memories for display, to feed context into an AI agent, or for
auditing pipeline state. Typical patterns:

- A user posts `/read` to list all stored memories in a chat interface.
- An AI context-loading step fetches all records of `kind: "summary"` before calling the LLM.

### Input from Swarm

No specific payload is required. The incoming message triggers the read operation. The content of
`args[0].text` is ignored.

### Output to Swarm

A JSON string published back to the output swarm:

| Condition | Response |
|---|---|
| Success (records found) | JSON array of record objects (see Record Schema above) |
| Success (no matches) | `[]` (empty array) |
| Failure | `{ "error": "<message>" }` |

### wf_webhook_args

| Key | Type | Required | Default | Description |
|---|---|---|---|---|
| `memory_id` | string | **Required** | — | Memory store path |
| `kind` | string | Optional | — | If set, returns only records with this kind |
| `scope` | string | Optional | — | If set, returns only records with this scope |
| `source` | string | Optional | — | If set, returns only records with this source label |

### Example wf_webhook_args JSON

```json
{
  "memory_id": "instances/a3d8f1b2/memories"
}
```

To filter to summaries only:

```json
{
  "memory_id": "instances/a3d8f1b2/memories",
  "kind": "summary"
}
```

---

## memory_search

### Description

Full-text search across a memory store using SQLite FTS5. The incoming message text is used as the
search query. Results are returned ranked by relevance. Optional `kind` and `scope` filters are applied
after the FTS match.

### Use Case

Use `memory_search` when you want to retrieve memory records that are semantically relevant to a user's
query or a pipeline topic. Typical patterns:

- A user posts `/search blue sky` and a `regex_match` relay extracts `"blue sky"` and delivers it as
  the message text to `memory_search`.
- A RAG (Retrieval-Augmented Generation) step searches stored knowledge before composing an LLM prompt.

### Input from Swarm

| Field | Required | Description |
|---|---|---|
| `args[0].text` | **Required** | The search query string |

If `args[0].text` is empty or missing, the hook returns an empty array without querying.

### Output to Swarm

A JSON string published back to the output swarm:

| Condition | Response |
|---|---|
| Success (matches found) | JSON array of record objects ordered by FTS5 relevance |
| Success (no matches) | `[]` (empty array) |
| Failure | `{ "error": "<message>" }` |

### wf_webhook_args

| Key | Type | Required | Default | Description |
|---|---|---|---|---|
| `memory_id` | string | **Required** | — | Memory store path |
| `kind` | string | Optional | — | Post-FTS filter: include only records of this kind |
| `scope` | string | Optional | — | Post-FTS filter: include only records with this scope |

### Example wf_webhook_args JSON

```json
{
  "memory_id": "instances/a3d8f1b2/memories"
}
```

---

## memory_delete

### Description

Deletes memory records by `guid` (single record) or `kind` (bulk deletion). If both are set, `guid` takes
priority. If neither `guid` nor `kind` can be resolved, the hook returns without deleting anything.

The `guid` may be supplied in two ways:

1. **Static** — set `guid` in `wf_webhook_args` directly (useful when the guid is known at design time).
2. **Dynamic (dispatch pattern)** — leave `guid` empty in `wf_webhook_args`; the hook falls back to
   `args[0].text` as the guid. This allows a `regex_match` relay to extract the guid from a `/delete <guid>`
   command and deliver it as the message payload.

### Use Case

Use `memory_delete` to remove a specific record by guid or to bulk-clear all records of a given kind.
Typical patterns:

- A user posts `/delete 3f8a2c1d-...` and a `regex_match` relay extracts the guid and delivers it to
  `memory_delete` as the message text.
- An administrative pipeline step clears all records of `kind: "temp"` at the end of a session.

### Input from Swarm

| Field | Condition | Description |
|---|---|---|
| `args[0].text` | Used when `targs.guid` is empty | Treated as the guid to delete |

If neither `targs.guid`, `args[0].text`, nor `targs.kind` resolves to a non-empty value, the hook
returns `{ "skipped": "no query" }` without deleting anything.

### Output to Swarm

A JSON string published back to the output swarm:

| Condition | Response |
|---|---|
| Success | `{ "deleted": <count> }` where count ≥ 0 |
| No guid or kind provided | `{ "skipped": "no query" }` |
| Failure | `{ "error": "<message>" }` |

### wf_webhook_args

| Key | Type | Required | Default | Description |
|---|---|---|---|---|
| `memory_id` | string | **Required** | — | Memory store path |
| `guid` | string | Optional | — | Delete the specific record with this guid. If empty, falls back to `args[0].text` |
| `kind` | string | Optional | — | Bulk-delete all records with this kind (used only when guid is not resolved) |

### Example wf_webhook_args JSON

To delete by guid (static, guid known at design time):

```json
{
  "memory_id": "instances/a3d8f1b2/memories",
  "guid": "3f8a2c1d-7e09-4b8a-a5c3-1d2f8e4b9a07"
}
```

To delete by kind:

```json
{
  "memory_id": "instances/a3d8f1b2/memories",
  "kind": "temp"
}
```

To use the dispatch pattern (user provides guid at runtime via `/delete <guid>`):

```json
{
  "memory_id": "instances/a3d8f1b2/memories"
}
```

---

## Building a Memory Pipeline

A complete slash-command memory pipeline wires the four memory blocks together with `regex_match` dispatch
agents. The general pattern is:

1. A `chat_agent` (**User**) receives all input.
2. A `regex_filter` with `invert: true` on `^/` passes non-command text to an AI agent.
3. Four `regex_match` agents match `/write`, `/read`, `/search`, and `/delete` respectively,
   extract any argument via a capture group, and re-publish under a unique `wf_agent_name`
   (e.g. `"dispatch_write"`).
4. Each memory block sets `agent_from` to the matching dispatch agent name so it only fires
   for its specific command.
5. Each memory block sets `wf_publish_results: true` and publishes its JSON response to the
   chat swarm so the result is visible in the conversation.

See the `memory_test` pipeline in `kilroy.sandbox/pipeline editor source docs/memory_test-1.json`
for a working editor source document that implements this pattern.

!!! note
    All four memory blocks require `wf_publish_results` to be enabled on the agent node if you
    want the result returned to the swarm. Without it, the webhook runs but no output message
    is published.
