# Creating and Managing Sub-Agent Profiles

Agent profiles define reusable specialist agents that a Kilroy AI agent can invoke for focused work. A profile controls the sub-agent's instructions, tools, active skills, model endpoint, context limits, working directory, and timeout.

Profiles are stored in `apps/kilroy.ai/agent_library`. You normally manage them by asking a Kilroy AI agent that has the `agent_profile` tool.

## Before You Start

The parent AI agent needs these tool instances:

- `agent_profile` to create, find, list, and delete profiles.
- `subagent_op` to run profiles and retrieve their results.
- `edit_agent_profile` only if you want the agent to use the profile editor.

A sub-agent profile does not create a process diagram. Each invocation is an isolated, in-process run with its own session scope.

## Managing Profiles With an Agent

You can ask the agent naturally, for example:

> List all available sub-agent profiles.

> Create a read-only profile named dependency_reviewer using the profile JSON below.

> Find the dependency_reviewer profile and show me its complete JSON.

> Replace dependency_reviewer with this revised profile.

> Delete the dependency_reviewer profile.

The agent translates those requests into `agent_profile` tool calls.

### List profiles

```json
{
  "opcode": "list_all"
}
```

### Find one profile

```json
{
  "opcode": "find",
  "agent_id": "dependency_reviewer"
}
```

### Create or replace a profile

`create` is an upsert keyed by `agent_id`. Calling it again with the same `agent_id` replaces the stored profile.

```json
{
  "opcode": "create",
  "profile": {
    "agent_id": "dependency_reviewer",
    "description": "Reviews dependency changes for compatibility and risk.",
    "system_prompt": "You are a dependency review specialist. Inspect the requested changes, identify compatibility and security risks, and return findings ordered by severity. Do not modify files.",
    "tools": ["read", "grep", "find", "ls"],
    "kilroy_tools": [],
    "tool_instances": [],
    "skills": [],
    "inherit_skills": false,
    "relay_progress": "none",
    "timeout_ms": 600000
  }
}
```

### Delete a profile

```json
{
  "opcode": "delete",
  "agent_id": "dependency_reviewer"
}
```

You may also delete by the `guid` returned by `find` or `list_all`.

## Complete Profile Example

```json
{
  "agent_id": "implementation_specialist",
  "description": "Implements a focused code change and reports validation results.",
  "system_prompt": "You are an implementation specialist. Make only the requested change, preserve repository conventions, validate the affected behavior, and report changed files and remaining concerns.",
  "tools": ["read", "grep", "find", "ls", "write", "edit", "bash"],
  "kilroy_tools": [],
  "tool_instances": [
    {
      "use": "kilroy.ai.services.skill_template_op",
      "as": "skill_template",
      "description": "Load complete instructions for an active skill by skill_id."
    },
    {
      "use": "kilroy.ai.services.manage_skill",
      "as": "manage_skill",
      "description": "List the sub-agent's active skills."
    }
  ],
  "skills": [
    { "skill_id": "focused-code-change" },
    { "guid": "saved-skill-record-guid", "skill_id": "run-targeted-tests" }
  ],
  "inherit_skills": false,
  "relay_progress": "none",
  "pi_model": "gpt-5",
  "pi_provider": "openai",
  "pi_url": "https://api.openai.com/v1",
  "pi_api": "openai-completions",
  "pi_api_key": "OPENAI_SUBAGENT_API_KEY",
  "context_depth": 20,
  "content_max_tokens": 16000,
  "compact_context_percentage": 60,
  "pi_working_dir": "/workspace/project",
  "timeout_ms": 600000
}
```

## Field Reference

### Required identity and instructions

| Field | Type | Semantics |
|---|---|---|
| `agent_id` | string | Stable profile identifier used by `subagent_op`. Must be non-empty. Creating the same ID again replaces that profile. |
| `description` | string | Short description shown to parent agents when selecting a specialist. Keep it specific enough to support good delegation decisions. |
| `system_prompt` | string | Complete inline instructions for the sub-agent. The parent supplies the task separately. Prompt-library references are not resolved here in the current implementation. |

### Tool fields

The three tool fields are resolved independently.

| Field | Type | Semantics |
|---|---|---|
| `tools` | array of strings, `null`, or omitted | Pi built-in tools such as `read`, `grep`, `find`, `ls`, `write`, `edit`, and `bash`. An array replaces the parent's complete `tools` list. `[]` disables all built-in tools. `null` or omission inherits the parent list. |
| `kilroy_tools` | array of strings, `null`, or omitted | Kilroy tool-class patterns such as `kilroy.ai.services.guid`. An array replaces the parent's complete class allowlist. `[]` disables this category. `null` or omission inherits it. |
| `tool_instances` | array, `null`, or omitted | Explicit configured Kilroy tool instances. An array replaces all parent instances. `[]` disables this category. `null` or omission inherits the parent's already-resolved instances. |

These fields do not merge with the parent. If you provide an array, include every item the sub-agent needs in that category.

### Tool instance syntax

A tool instance may use string shorthand:

```json
"kilroy.ai.services.guid"
```

The object form supports:

```json
{
  "use": "kilroy.ai.services.memory_op",
  "as": "project_memory",
  "description": "Search project-specific memory records.",
  "bind": {
    "memory_id": "apps/example/project_memory",
    "scope": "facts",
    "kind": "observation"
  }
}
```

| Field | Meaning |
|---|---|
| `use` | Fully qualified tool class, for example `kilroy.ai.services.memory_op`. |
| `as` | Optional runtime tool name exposed to the model. |
| `description` | Optional description override shown to the model. |
| `bind` | Class-specific configuration used to resolve `${bind.*}` values. |
| `override` | Optional low-level tool-definition overrides supported by the tool resolver. Use only when the class contract requires it. |

Profile-declared instances may use these broker-resolved placeholders:

- `${parent.group_name}`
- `${parent.pd_alias}`
- `${parent.scope_id}`
- `${parent.working_dir}`
- `${parent.username}`

Other `${...}` pipeline tokens are not resolved inside stored profiles. Inherited parent instances are already rendered and need no additional substitution.

### Skill fields

| Field | Type | Semantics |
|---|---|---|
| `skills` | array | Skills pre-activated in the sub-agent's isolated session before work begins. Entries may identify a skill by `skill_id`, or by both `guid` and `skill_id`. Default: `[]`. |
| `inherit_skills` | boolean | When `true`, adds the parent's active skills to the profile's skills. Profile entries win when the same normalized `skill_id` appears in both sets. Default: `false`. |

The sub-agent receives a compact manifest of active skill names and descriptions in its system prompt. To load complete skill instructions at runtime, expose `skill_template_op` and call it with `opcode: "find"` and the `skill_id`.

To let a sub-agent inspect its active skill list, expose `manage_skill` and call:

```json
{
  "opcode": "list_active"
}
```

The sub-agent execution context automatically scopes this operation to the sub-agent rather than the parent.

### Model and endpoint overrides

Each field overrides independently. Omitted fields inherit from the parent agent.

| Field | Type | Semantics |
|---|---|---|
| `pi_model` | string | Model name sent to the Pi SDK. Override alone to use another model on the parent's endpoint. |
| `pi_provider` | string | Pi provider identifier, commonly `openai`. |
| `pi_url` | string | Provider base URL, for example `https://api.openai.com/v1`. |
| `pi_api` | string | Pi API protocol adapter, for example `openai-completions`. |
| `pi_api_key` | string | **Environment-variable name**, not a literal key. The broker resolves the variable immediately before dispatch. If omitted, the parent's already-resolved API key is inherited. |

Example environment setup:

```bash
export OPENAI_SUBAGENT_API_KEY="your-api-key"
```

Then set:

```json
"pi_api_key": "OPENAI_SUBAGENT_API_KEY"
```

An invalid variable name or an unset/empty variable causes the run to fail. The resolved secret is not stored back into the profile.

### Runtime overrides

| Field | Type | Semantics |
|---|---|---|
| `context_depth` | integer | Maximum recent conversation turns retained for the sub-agent. Omitted means inherit the parent. |
| `content_max_tokens` | integer | Token budget used to trigger context compaction. Omitted means inherit the parent. |
| `compact_context_percentage` | integer | Percentage of older context compacted when limits are exceeded. Omitted means inherit the parent. |
| `pi_working_dir` | string | Working directory used by Pi filesystem and shell tools. Omitted means inherit the parent. |
| `timeout_ms` | integer | Maximum active model-call duration in milliseconds. On timeout, the Pi session is aborted and the run fails. Omitted or invalid values use the broker default of 600000 ms. |
| `relay_progress` | string | Reserved progress policy: `none`, `tools`, or `full`. Only `none` has observable behavior today; progress relay is a future enhancement. |

Session-scope and session-storage fields are broker-controlled and cannot be overridden by a profile. Every invocation receives a unique `sub.<profile>.<run>` session identity.

## Running a Profile

Dispatch one task:

```json
{
  "opcode": "run",
  "agent": "dependency_reviewer",
  "task": "Review the package upgrade for compatibility and security risks."
}
```

Dispatch several independent tasks in one batch:

```json
{
  "opcode": "run",
  "tasks": [
    {
      "agent": "scout",
      "task": "Locate the code that owns authentication token refresh."
    },
    {
      "agent": "reviewer",
      "task": "Review the current authentication flow for failure handling."
    }
  ]
}
```

`run` returns immediately with a `batch_id` and one `run_id` per task. It does not return the answers.

Wait for completion:

```json
{
  "opcode": "wait",
  "batch_id": "batch_...",
  "timeout_ms": 600000
}
```

You may also use `status` for a bounded status check or `result` to retrieve available output. Results are pull-based; Kilroy does not currently inject completed sub-agent results into the parent automatically.

## Builtin Profiles

Kilroy ships five coding-oriented profiles:

| Profile | Purpose |
|---|---|
| `scout` | Read-only codebase reconnaissance and call-path tracing. |
| `planner` | Implementation planning grounded in the current repository. |
| `builder` | Focused code changes with targeted validation. |
| `test_runner` | Test execution, reproduction, and failure diagnosis. |
| `reviewer` | Independent defect, regression, security, and test review. |

Builtins are seeded by stable `agent_id` and may be customized in place. Kilroy stores a baseline hash for the last bundled version installed. A later app update upgrades an untouched builtin but preserves one whose content differs from that baseline. To reset a modified builtin to the latest shipped version, delete it and restart or reinitialize the harness manager.

## Current Limitations

- Sub-agents cannot dispatch nested sub-agents.
- Active runtime settings cannot be mutated after a sub-agent starts; create another profile and invoke a new run instead.
- Runs and queues are process-local and are discarded when Kilroy restarts.
- Large results are returned inline; `output_ref` storage is not implemented.
- Progress relay and automatic completion injection are not implemented.

_Last updated: 2026-09-22_
