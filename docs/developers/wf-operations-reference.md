# Workflow Operations Reference

This page is a companion reference to the
[wfProxy API Reference](wfproxy-api-reference.md). It catalogs the built-in
workflow operations (the same operations that appear as Blockly blocks in
the workflow editor) that can be invoked directly from script code using:

```js
wfProxy.CallServerBlock(authData, wfopsName, params)
```

For each operation below, `wfopsName` is the exact string to pass as
`CallServerBlock`'s second argument, and `params` should be an object
containing the listed argument names, with values equivalent to what you
would enter into that operation's fields in the workflow editor.

This catalog omits:

- Order-related operations, which are being revised separately.
- The basic variable-assignment operations (setting a global from a literal,
  another variable, or an object path). Use `wfProxy.getGlobalValue` and
  `wfProxy.setGlobalValue` instead of calling those operations directly.
- Form and UI hand-off operations (`display_inline_form`, `list_export`,
  `show_url`, `start_widget`). These must be executed as inline Blockly
  blocks in a workflow step for their hand-off to the browser UI to work
  correctly, and will not behave correctly if invoked through
  `CallServerBlock`.
- Blockly-only control-flow operations (`if_then_else`, `while_loop`,
  `step_group`), which have no purpose in `script.js` code since JavaScript
  already has native conditional and looping constructs.
- Deprecated operations (`reset_process_diagram`, `send_docusign_template`,
  `send_email`, `write_event`, `write_manifest`).

!!! warning "Never set `__results__` directly"
    Some of these operations report their result by writing it to the
    well-known `GLOBAL_RESULTS_VAR` (`__results__`) global. That is
    internal plumbing used by the workflow engine to hand a result back to
    the workflow that invoked the operation.

    Your own `script.js` code should **never** set `__results__` directly.
    Instead:

    - If you are simply returning a value from a hook function, return it in
      a resolved `Promise`, as shown in the examples throughout this and the
      [wfProxy API Reference](wfproxy-api-reference.md).
    - If you need to make a value available to later steps or to the
      caller, use `wfProxy.setGlobalValue(key, value)` with your own
      descriptive key name.

---

## `app_services`

Manage installed apps and their process diagrams.

- **Parameters**
  - `cmd` (`string`) — one of `delete_installed`, `delete_running`, `download`, `launch`, `save_app_settings`, `start_app_diagram`, `show_app_diagram`, `stop_app_diagram`.
  - `app_id` (`string`) — the target app's identifier.
  - `settings` (`Object`, for `save_app_settings`) — the settings values to save.
  - `pdclass` (`string`, for `start_app_diagram`) — the process diagram class name to launch.
  - `pdalias` (`string`, for `start_app_diagram` / `stop_app_diagram`) — the alias to assign to (or identify) the process diagram instance.
  - `pddesc` (`string`, for `start_app_diagram`) — a description for the launched instance.
  - `pdargs` (`Object`, for `start_app_diagram`) — arguments passed to the launched process diagram.
  - `launchParent` (`string`, for `start_app_diagram`, optional) — one of `"manifest"`, `"root"`, or `"child"`.

## `call_web_service`

Call an external HTTP web service.

- **Parameters**
  - `url` (`string`) — the endpoint URL to call.
  - `method` (`string`) — the HTTP method (for example, `GET`, `POST`).
  - `mime_type` (`string`) — the content type of the payload (for example, `application/json`).
  - `payload` (`string` or `Object`) — the request body.
  - `headers` (`Object` or JSON string, optional) — additional HTTP headers.

## `create_qrcode`

Generate a QR code image from a string of data.

- **Parameters**
  - `data` (`string`) — the data to encode.
  - `result_key` (`string`, optional) — the global key to also store the result under (defaults to `qr_code_result`).
  - `scale` (`number`, optional) — the pixel scale of the generated QR code.

## `create_signature`

Generate a cryptographic HMAC signature for a piece of data.

- **Parameters**
  - `data` (`string`) — the data to sign.
  - `secret_key` (`string`) — the shared secret used to compute the signature.
  - `encryption_type` (`string`, optional) — currently only `HMAC` is supported.
  - `algorithm` (`string`, optional) — the hash algorithm to use (defaults to `sha256`).
  - `digest` (`string`, optional) — the output digest encoding (defaults to `hex`).

## `critical_section`

Enter or exit a named critical section, useful for serializing access to a
shared resource across concurrent workflow executions.

- **Parameters**
  - `id` (`string`) — the name of the critical section.
  - `command` (`string`) — `cs_entry` to acquire/enter the critical section, or any other value to release/exit it.

## `delete_pd_alias`

Remove a process diagram alias.

- **Parameters**
  - `alias` (`string`) — the alias to delete.

## `set_pd_alias`

Assign an alias to a process diagram instance.

- **Parameters**
  - `alias` (`string`) — the alias name to assign.
  - `id` (`string`) — the process diagram instance ID the alias should point to.

## `exchange_command`

Issue a trading/exchange-related command using the exchange configuration
previously established for the workflow.

- **Parameters**
  - `command` (`string`) — the command to execute, or `exchange_block` to set the active exchange configuration for subsequent commands.
  - `command_args` (`Object`) — arguments for the command. When `command` is `exchange_block`, this includes an `exchange` field identifying which exchange to use.

## `list_add`

Append a value to a named list stored in the global context, creating the
list if it does not already exist.

- **Parameters**
  - `list_name` (`string`) — the global key holding the list.
  - `list_item` (`string`) — the name of a global variable whose current value should be appended to the list.

## `list_reset`

Reset (empty) a named list stored in the global context.

- **Parameters**
  - `list_name` (`string`) — the global key holding the list to reset.

## `send_pubsub_cmd`

Publish a command to a pub/sub topic.

- **Parameters**
  - `topic` (`string`) — the topic to publish to.
  - `command` (`string`) — the command name.
  - `args` (`Object` or JSON string) — arguments for the command.

## `start_process_diagram`

Launch a new process diagram instance from a template.

- **Parameters**
  - `name` (`string`) — the process diagram template name to launch.
  - `args` (`Object` or JSON string, optional) — arguments passed to the new process diagram.
  - `roles` (`string`, optional) — the role/group the new instance should run under.

## `start_workflow`

Launch a new workflow instance.

- **Parameters**
  - `name` (`string`) — the workflow template name to launch.
  - `args` (`Object` or JSON string, optional) — arguments passed to the new workflow.

## `swarm_command`

Join, leave, publish to, or query information about a peer-to-peer swarm
topic.

- **Parameters**
  - `command` (`string`) — one of `join`, `leave`, `publish`, or `info`.
  - `command_args` (`Object`) — arguments for the command:
    - `topic` (`string`) — the swarm topic name.
    - `seed` (`string`, for `join`, optional) — a seed value for the swarm.
    - `data` (`*`, for `publish`) — the value to publish to the topic.

## `trigger_pd`

Invoke a named webhook/trigger on a process diagram, optionally waiting
synchronously for its result.

- **Parameters**
  - `pd_id` (`string`) — the target process diagram's identifier.
  - `trigger_name` (`string`) — the name of the trigger/webhook to invoke.
  - `args` (`Object` or JSON string, optional) — arguments passed to the trigger.
  - `sync` (`boolean`, optional) — if `true`, wait for the triggered workflow to complete and return its result.
  - `copyOutputs` (`boolean`, optional) — if `true` (and `sync` is `true`), copy the triggered workflow's declared output globals into the caller's global context.
