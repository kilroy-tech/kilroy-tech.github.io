# AI Agent Configuration

Kilroy has two configuration interfaces: the AI agent process diagram's inspector fields and the Pi-oriented JSON stored in its `ai_args` field. They are not interchangeable. Sub-agents are profiles executed by the Pi adapter, not additional process diagrams.

## Legacy and Pi Execution

Legacy `kilroy.ai.services/ai_agent` behavior uses top-level inspector fields. Pi deployments use `ai_args`, normally with `"provider": "pi"` and `"useExternalPiSettings": false`.

**Current routing limitation:** the harness's current `ai_agent/swarm_hook` workflow invokes its local `ai_hook`, which resolves Pi configuration from `ai_args` without branching on `ai_args.provider`. Do not assume that changing `provider` alone activates legacy fallback in this implementation. The legacy compatibility fields below do not imply that fallback routing has been restored.

`provider: "pi"` identifies the Kilroy execution engine. `pi_provider: "openai"` identifies the protocol provider registered inside Pi; these are different concepts.

## Inspector Fields

These are the configuration keys read by the harness's `ai_agent/set_config` workflow. Window and generic process-diagram properties are separate from model configuration.

| Inspector key | Purpose | Pi/sub-agent mapping |
|---|---|---|
| `ai_bot_name` | Agent display identity. | Parent response name; child identity comes from its profile's `agent_id`. |
| `ai_from_agent` | Inbound sender configuration. | Messaging/ingress concern, not a child model override. |
| `ai_desc` | Agent description. | Profile `description` describes the specialist instead. |
| `ai_rec_swarm`, `ai_send_swarm` | Receive/send routing. | Children have no direct response swarm; progress uses the parent relay. |
| `ai_use_context` | Legacy context control. | Not a profile toggle; children use isolated sessions without parent chat-history reuse. |
| `ai_url`, `ai_api_key`, `ai_model` | Legacy model connection settings. | Configure Pi with `pi_url`, `pi_api_key`, `pi_model` in `ai_args`, not these top-level values. |
| `ai_temperature` | Legacy sampling temperature. | For Pi, explicitly set `ai_args.ai_temperature`; no automatic top-level fallback is introduced. |
| `ai_max_tokens` | Legacy context budget. | The Pi equivalent is `ai_args.content_max_tokens`. This is **not** Pi's maximum output-token setting. |
| `ai_context_depth` | Legacy conversation depth. | Pi uses `ai_args.context_depth` (also accepts `ai_args.ai_context_depth`). |
| `ai_system_prompt` | Parent instructions. | Parent Pi system prompt; profile `system_prompt` supplies child instructions. |
| `ai_prompt_prefix` | Parent prompt prefix. | Applied to parent requests; child prefix is empty. Put child instructions in its profile. |
| `ai_args` | Provider/runtime JSON. | Pi configuration described below. |
| `wf_webhook_args` | Workflow/webhook configuration. | Process-diagram wiring, not a profile model override. |

Fields such as `ai_chat_enabled`, `ai_context`, and `ai_max_context_depth` are internal values set by workflows rather than additional independent Pi sampling controls.

## Pi Model and Runtime Fields

Omitted profile fields normally inherit their corresponding parent `ai_args` values. Special cases are listed explicitly.

| `ai_args` key | Meaning/default | Profile override |
|---|---|---|
| `pi_provider` | Pi provider ID; default `openai`. Parent also accepts `provider` as a low-level alias. Use canonical `pi_provider` to avoid confusion with the Kilroy engine selector. | `pi_provider` |
| `pi_model` | Model ID. Parent accepts `model` as an alias. | `pi_model` |
| `pi_url` | Endpoint base URL. Parent accepts `baseUrl`, then `url`. | `pi_url` |
| `pi_api` | Pi protocol adapter; default `openai-completions`. Parent accepts `api`. | `pi_api` |
| `pi_api_key` | Parent's resolved API key. Parent accepts `apiKey`, then `key`. | Profile value is an **environment-variable name**, not a literal secret. Omission inherits the resolved parent key. |
| `ai_temperature` | Optional finite number from 0 through 2. `temperature` is an alias; `ai_temperature` wins if both are present. Zero is valid. Omission leaves provider/Pi sampling defaults intact. | Same names; profile value wins over parent. |
| `ai_timeout` | Seconds allowed for the active prompt call. See precedence below. | `ai_timeout` |
| `context_depth` | Saved recent-turn budget; legacy alias `ai_context_depth`. Adapter default 40 when unspecified. | `context_depth`; isolated children do not reuse parent chat history. |
| `content_max_tokens` | Model context budget in **tokens**, not bytes or output length. Parent alias `contentMaxTokens`; valid positive values are bounded to 256-500000, and the Pi window has a 4096-token minimum. Missing value uses a 128000-token Pi window. | `content_max_tokens` |
| `compact_context_percentage` | Share of older context to summarize, not share to retain. Default 60; bounded to 1-100. Parent alias `compactContextPercentage`. | `compact_context_percentage` |
| `pi_working_dir` | Filesystem/shell tool working directory. | `pi_working_dir` |
| `tools` | Pi built-in tool list. | Replaces the list; `[]` disables; null/omission inherits. |
| `kilroy_tools` | Kilroy tool-class allowlist. | Same replacement/inheritance rule. |
| `tool_instances` | Configured Kilroy tool instances and bindings. | Same replacement/inheritance rule. |
| `webhook_tool_max_payload_bytes`, `webhook_tool_sync` | Shared tool transport limits/defaults. | Inherited from parent; not independently merged from profiles. |
| `max_tool_calls` | Child tool-call budget. | Overrides parent; child default 150. The parent hook does not currently forward this as a parent-run budget. |

**Alias limitation:** parent aliases in the table are not all normalized by the child broker. Use canonical `pi_*`, `context_depth`, `content_max_tokens`, and `compact_context_percentage` fields when children must inherit them. Temperature aliases are explicitly supported by both paths.

### Temperature

```json
{
  "provider": "pi",
  "useExternalPiSettings": false,
  "pi_provider": "openai",
  "pi_model": "your-model",
  "pi_url": "http://your-runner:11434/v1",
  "pi_api_key": "resolved-parent-key",
  "ai_temperature": 0.2,
  "ai_timeout": 300,
  "content_max_tokens": 65000,
  "compact_context_percentage": 70
}
```

Temperature reaches Pi model sampling parameters, or per-request options for externally managed Pi sessions. The OpenAI-compatible adapter forwards it into the HTTP request. Other protocols/models may restrict or reject temperature; this setting cannot make an unsupported provider support sampling. Invalid explicit values fail configuration validation rather than silently reverting to a default. Changing temperature changes the live-session configuration signature.

### Timeout Precedence and Units

For children, the first available value wins:

1. Profile `timeout_ms` (existing compatibility field, milliseconds).
2. Profile `ai_timeout` (seconds).
3. Parent `ai_args.timeout_ms` (milliseconds).
4. Parent `ai_args.ai_timeout` (seconds).
5. `PI_PROMPT_TIMEOUT_MS` environment value, otherwise 300000 ms (300 seconds).

Parents use the same resolver without the profile steps. Explicit timeouts must be finite positive numbers and are bounded to 20000-99999000 ms. Invalid explicit values fail validation. Backend queue time before a child starts is not part of its active prompt-call timer. A `subagent_op.wait` timeout is a separate waiting budget; it does not change or cancel the child's execution timeout.

Existing profiles with `timeout_ms: 600000` still have a ten-minute budget. Profiles with no timeout now inherit the parent instead of automatically receiving ten minutes.

The orchestrator's overall run limit is derived from this timeout: the resolved timeout plus 25% headroom, with at least 60 extra seconds (for example, 300 s becomes 375 s). It applies only while a run is still continuing. A run that has already completed or is waiting for the user is never re-marked as blocked because it took longer than expected.

### Context and Compaction

`content_max_tokens` defines the context window passed to Pi and the saved-history token budget. `ai_max_tokens` is not read as its Pi alias. The existing compaction policy is unchanged: Kilroy summarizes saved history after its limits are exceeded; Pi also manages its own live-session context. At 65000 and 70%, Pi's target recent tail is about 19500 tokens, plus summary/other retained content. Tail selection uses message boundaries, so this is not an exact post-compaction total or a hard cap on every request.

## Execution and Session Controls

| `ai_args` key | Behavior and child mapping |
|---|---|
| `useExternalPiSettings` | Whether Pi's external settings supply runtime configuration. Compatibility `useAgentSettings` has inverse semantics. Child broker always constructs deterministic settings (`false`). |
| `orchestration_enabled` | Parent detached orchestration versus direct invocation; default true. Children use broker orchestration. |
| `status_reporting_enabled` | Parent process-diagram status reporting; child state is broker-managed. |
| `thinking_stream_enabled` | Parent thinking/tool reporting. Child activity can relay through an active parent stream; not a profile-level inheritance switch. |
| `thinking_chunk_max_chars`, `thinking_chunk_flush_ms` | Parent stream batching, defaults 220 characters / 1200 ms. Not profile overrides. |
| `ai_error_reporting_mode` | Parent error presentation (`off`, `concise`, `detailed`); children use detailed diagnostics for parent retrieval. |
| `group_name` | Group identity and placeholder context; not a child model setting. |
| `ai_session_scope_id`, `ai_session_scope_namespace`, `ai_session_app_alias` | Logical scope identity. Children receive broker-created isolated identities. |
| `ai_session_storage_mode`, `ai_session_storage_path` | Session storage configuration inherited from parent; not profile-overridable. |

Profiles also define `skills` and `inherit_skills`. They do not inherit the parent's system prompt: each profile must define its own `system_prompt`. See [Sub-Agent Profiles](agent-profiles.md) for creation, tools, skills, API-key handling, and run/wait/result examples.

## Image Generation Tool

The harness provides an optional one-shot `generate_image` tool through the manager PDI webhook. It is an ordinary configured tool instance, not a new process-diagram class or an `ai_args.image_model` setting. The tool instance owns provider settings and paths; the model only supplies a prompt and optional output dimensions.

The Basic Group Agent and Basic Task Board Agent templates expose `ai_image_api`, `ai_image_url`, `ai_image_model`, `ai_image_api_key`, `ai_image_size`, `ai_image_count`, `ai_image_steps`, `ai_image_response_format`, and `ai_image_keep_images` as group-deployment variables. Their defaults now match the tested local VMLX request: `openai-images`, `http://localhost:11434/v1`, `flux2-klein-4b`, `local-key`, `512x512`, one image, four steps, and `b64_json`. The templates default `ai_working_dir` to `{{kilroypublic}}`, which resolves to the deployment host's configured public directory.

| Instance bind | Meaning |
|---|---|
| `image_api` | Protocol adapter: `openai-images` for `/v1/images/generations`, or `openrouter-images` for `/v1/chat/completions` image modalities. |
| `image_url` | Absolute HTTP(S) base endpoint, for example `http://localhost:11434/v1`. |
| `image_model` | Image model ID, for example `flux2-klein-4b`. |
| `image_api_key` | Explicit image-service API key. It is separate from the AI agent's LLM key and is sent only in the server-side Authorization header. Pipeline substitutions may supply it as a deployment variable. |
| `image_params.size` | Bound default output size; the model may override it with the tool's optional `size` argument. Template variable: `ai_image_size`, default `512x512`. |
| `image_params.n` | Number of images per request, bound rather than model-controlled. Template variable: `ai_image_count`, default `1`; maximum is four. |
| `output_dir` | Explicit absolute destination directory. The service writes directly into this directory; it does not append or compute a child folder. The default group template uses `${ai_working_dir}/ai_images`. |
| `keep_images` | Retention limit, default 16, valid 1-1000. Cleanup only examines files with the `kimg_` generated-image prefix; unrelated files are untouched. |
| `image_params` | Optional JSON object encoded as a string. Its values are passed through to the selected image API, allowing server-specific settings such as `steps`, `guidance`, `quality`, or `seed`. The default template binds `steps` and `response_format`; use `ai_image_steps=0` to omit `steps`, and set `ai_image_response_format` blank to omit `response_format` for models such as `gpt-image-1`. Unsupported fields are rejected by strict providers. |

The model-call schema contains only `prompt` and optional `size` (for example, `512x512`). A model-supplied size overrides a bound `image_params.size`; endpoint, model, API key, output directory, retention, count and other generation parameters remain instance-controlled. Image count `n` is capped at four per call. No arbitrary 15-second tool timeout is configured; the normal AI turn timeout remains the overall caller limit.

`openai-images` accepts OpenAI-compatible `b64_json` or URL image results. `openrouter-images` accepts the OpenRouter chat-completions image result shape. The adapters normalize results to PNG/JPEG/WebP, enforce a 20 MiB per-image limit, and save short unique names such as `kimg_<timestamp>_<id>.png`. On Windows, output paths longer than 240 characters are rejected before writing. Image editing/input images are not part of the initial tool.

### Shared Output Folders and Cleanup

Agents using the same `output_dir` share one image pool, regardless of group or tool instance. Immediately before each image is written, cleanup counts generated images; when the count is at least that caller's `keep_images`, it deletes up to the two oldest files, then writes one uniquely named image. This stores no retention metadata. With different limits, the largest setting acts as the pool's ceiling; lower-limit calls gradually trim the pool, while each call keeps the count at or below its own limit. A low setting can evict another agent's older links. Pipeline authors who need isolated pools should bind distinct output directories. The cleanup lock serializes callers within one Kilroy backend process.

Images inside Kilroy's configured kilroypublic tree receive `/kilroypublic/...` URLs and ready-to-use Markdown links. Other output directories return filesystem paths only; Kilroy does not serve them. This is an intentional choice for agent workspaces that target another server's document tree or an image-processing folder. The tool appends `/ai_images` to the deployment's `ai_working_dir`; the workflow expands `{{kilroypublic}}` in the explicit output path using service discovery, matching the Pi working-directory behavior. A blank value still resolves to `/ai_images`, which the workflow rejects rather than creating a root-level folder. Authors can edit the tool-instance `output_dir` bind to choose another explicit destination.

## Example Child Override

Merge these values into the complete profile before replacing it with `agent_profile` -> `create`:

```json
{
  "agent_id": "scout",
  "description": "Read-only codebase investigation.",
  "system_prompt": "Investigate the assigned code and return findings with file references.",
  "tools": ["read", "grep", "find", "ls"],
  "ai_temperature": 0,
  "ai_timeout": 600,
  "content_max_tokens": 65000,
  "compact_context_percentage": 70
}
```

Omit `pi_model` and `pi_url` to inherit them, or specify either independently. Omit both temperature names to inherit the parent's temperature. Omit both timeout fields to inherit the parent's timeout. `create` replaces a stored profile; it is not a patch operation.

_Last updated: 2026-10-14_