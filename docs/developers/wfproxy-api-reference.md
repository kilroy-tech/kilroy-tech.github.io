# wfProxy API Reference

`wfProxy` is the object passed into every workflow `script.js` hook
(`preflight`, `begin`, `end`, `postflight`, `terminate`, etc.). It exposes a
stable, safe set of functions and constants that workflow authors can rely
on, without exposing any internal platform details.

This page documents every function and constant available on `wfProxy`.
Only the functions and constants listed here are part of the public
`wfProxy` contract — anything not documented on this page should be
considered unsupported and must not be relied on by workflow scripts.

## Obtaining a wfProxy instance

Workflow scripts never construct `wfProxy` themselves. The Kilroy workflow
runtime creates one automatically and passes it into your `script.js` hook
functions as an argument, for example:

```js
function preflight(authData, wfProxy) {
    // use wfProxy here
}
```

You do not need to do anything to obtain or initialize `wfProxy` — just
declare it as a parameter of your hook function and use it.

---

## Global value access

These functions read and write the workflow's **global context** — the
key/value store of variables (`workflowGlobals`) that is shared across all
steps of a running workflow instance, and can be referenced in JSON/XML
blocks via `${key}` template substitution.

### `getGlobalValue(key)`

Get a single value from the workflow's global context.

- **Parameters**
  - `key` (`string`) — the name of the global variable to read.
- **Returns**
  - `*` — the current value stored under `key`, or `undefined` if it has never been set.
- **Purpose**: primary way for a script to read a value previously set by a JSON block, a prior workflow step, or another `setGlobalValue` call.

### `getGlobalValuesByPattern(pattern)`

Get all global context entries whose key matches a regular expression.

- **Parameters**
  - `pattern` (`RegExp`) — pattern tested against every key in the global context.
- **Returns**
  - `Array<{key: string, value: *}>` — every matching key/value pair.
- **Purpose**: useful when a script needs to enumerate a family of related globals (for example, all keys with a common prefix) without knowing every exact key name in advance.

### `setGlobalValue(key, value)`

Set a single value in the workflow's global context.

- **Parameters**
  - `key` (`string`) — the name of the global variable to write.
  - `value` (`*`) — the value to store.
- **Returns**
  - `*` — the same `value` that was passed in.
- **Purpose**: the standard way scripts communicate data between hooks (`preflight` → `postflight`) and to downstream JSON/XML blocks via `${key}` substitution. Values set with `setGlobalValue` are automatically persisted for the rest of the workflow's execution.

### `getLastUserId()`

Get the user ID of the current/most-recent workflow user, stored under the well-known global key `wfCurrentUserId`.

- **Parameters**: none.
- **Returns**
  - `string|undefined` — the user GUID, or `undefined` if not set.
- **Purpose**: convenience accessor equivalent to `getGlobalValue("wfCurrentUserId")`.

---

## Variable substitution helpers

### `supplantObjectWithVariables(obj)`

Recursively substitute `${key}` style variable references throughout an object using the current global context.

- **Parameters**
  - `obj` (`Object`) — the object to scan and update in place / return a substituted copy of.
- **Returns**
  - `Object` — the object with all `${key}` references replaced by their global-context values.
- **Purpose**: lets a script take a template object (for example, arguments received from a JSON block) and resolve any variable placeholders against the workflow's current globals.

### `supplantStringWithVariables(str)`

Substitute `${key}` style variable references in a single string using the current global context.

- **Parameters**
  - `str` (`string`) — the string containing `${key}` placeholders.
- **Returns**
  - `string` — the string with all placeholders replaced by their global-context values.

### `insertGlobalsInString(srcStr)`

Substitute `{key}` style variable references (brace-only, no `$`) in a string using the current global context.

- **Parameters**
  - `srcStr` (`string`) — the string containing `{key}` placeholders.
- **Returns**
  - `string` — the string with all placeholders replaced.
- **Purpose**: similar to `supplantStringWithVariables`, but for the alternate `{key}` notation used in some legacy templates.

---

## Asset global context (deprecated)

`wfProxy` exposes a set of functions for reading and writing a persistent
"asset context" store. **This functionality is deprecated and should not be
used in new workflows.** It is documented here only so that existing
references to it are recognized; do not build new functionality on it.

---

## Workflow identity and parent process diagram info

### `getId()`

Get the ID of the currently running workflow instance.

- **Parameters**: none.
- **Returns**
  - `string` — the workflow instance ID.

### `getWfVersion()`

Get the version of the currently running workflow.

- **Parameters**: none.
- **Returns**
  - `string` — the workflow's version string.

### `getParentAppID()`

Get the app ID of the process diagram that launched/owns this workflow.

- **Parameters**: none.
- **Returns**
  - `string` — the parent process diagram's app ID, or `""` if unavailable.

### `getParentOwner()`

Get the user ID of the user who launched the parent process diagram.

- **Parameters**: none.
- **Returns**
  - `string` — the owning user's GUID, or `""` if unavailable.

### `getParentDiagramID()`

Get the process diagram ID (PD instance ID) of the parent process diagram.

- **Parameters**: none.
- **Returns**
  - `string` — the parent process diagram's ID, or `""` if unavailable.

### `getParentDiagramOwner(authData)`

Look up the user ID of the parent process diagram's owner. Unlike
`getParentOwner`, which returns a value already available on the workflow,
this function performs an asynchronous ownership lookup and should be used
when you need the most current owner information.

- **Parameters**
  - `authData` (`Object`) — Kilroy auth data for the current user/platform.
- **Returns**
  - `Promise<string>` — resolves to the owning user's GUID, or `""` if the diagram ID is unavailable or no owner can be found.

---

## Workflow path / priority helpers

### `getPath(success)`

Translate a boolean success/fail result into the workflow path enum value
expected by the workflow engine's step-result contract.

- **Parameters**
  - `success` (`boolean|undefined`) — `true` for success, `false` for failure, or `undefined`/`null` to stay on the current step.
- **Returns**
  - `string` — one of `PATH_SUCCESS`, `PATH_FAILURE`, or `PATH_STAY` (see [Constants](#constants) below).

---

## App settings and installation

### `loadAppSettings(authData, app_id)`

Load the persisted settings object for an installed app.

- **Parameters**
  - `authData` (`Object`) — Kilroy auth data for the current user/platform.
  - `app_id` (`string`) — the app's identifier.
- **Returns**
  - `Promise<Object>` — resolves to the app's settings object.

### `saveAppSettings(authData, app_id, appSettings)`

Persist a settings object for an installed app.

- **Parameters**
  - `authData` (`Object`) — Kilroy auth data for the current user/platform.
  - `app_id` (`string`) — the app's identifier.
  - `appSettings` (`Object`) — the settings object to save.
- **Returns**
  - `Promise<*>` — resolves with the result of the save operation.

### `InstallApp(authData, appName, zdata)`

Install a Kilroy app from a binary zip buffer.

- **Parameters**
  - `authData` (`Object`) — Kilroy auth data for the current user/platform.
  - `appName` (`string`) — the name to install the app under.
  - `zdata` (`Buffer`) — the app's zip archive contents as a binary buffer.
- **Returns**
  - `Promise<Object>` — resolves with the result of the install operation.

### `getServerSettings(authData)`

Load the Kilroy server's own settings (`server_name`, `server_guid`,
`wallet_address`, `username`, etc.) for use in workflow scripts.

- **Parameters**
  - `authData` (`Object`) — Kilroy auth data for the current user/platform.
- **Returns**
  - `Promise<Object>` — resolves to the server settings object.
- **Purpose**: the preferred way for a workflow to read current server identity values.

---

## AI tool catalog and session management

### `resolveAiToolConfig(authData, aiArgs)`

Resolve an app's configured AI tool catalog/instances into the runtime tool
configuration used by the AI agent.

- **Parameters**
  - `authData` (`Object`) — Kilroy auth data for the current user/platform.
  - `aiArgs` (`Object`) — the `ai_args` configuration object (tool selection, `tool_instances`, etc.).
- **Returns**
  - `Promise<Object>` — resolves to the resolved tool configuration.

### `invalidateAiToolCatalog(reason)`

Force the cached AI tool catalog to be rebuilt on next use.

- **Parameters**
  - `reason` (`string`) — a short human-readable reason, used for logging/diagnostics. Optional.
- **Returns**
  - `*` — the result of the invalidation request.

### `getAiToolCatalogStatus()`

Get diagnostic status information about the current AI tool catalog cache.

- **Parameters**: none.
- **Returns**
  - `Object` — status/diagnostic information about the tool catalog.

### `listAiSessionScopes(args)`

List persisted AI session scopes for an app.

- **Parameters**
  - `args` (`Object`) — identifies which app's session scopes to list, including a session scope ID, a session scope namespace, and an app alias (defaults to `"kilroy.ai"` if not provided).
- **Returns**
  - `Promise<{success: boolean, args?: Object, error?: string}>` — resolves with the list of persisted session scopes, or a failure/error result if session scopes cannot be retrieved.

### `resetAiSessionScope(args)`

Reset (clear) a persisted AI session scope.

- **Parameters**
  - `args` (`Object`) — same shape as `listAiSessionScopes`, identifying the session scope to reset.
- **Returns**
  - `Promise<{success: boolean, args?: Object, error?: string}>` — resolves with the result of the reset operation, or a failure/error result if the session scope cannot be reset.

---

## Server block invocation

### `CallServerBlock(authData, wfopsName, params)`

`CallServerBlock` is the primary mechanism for calling additional Kilroy
functionality from JavaScript that is otherwise only exposed as a Blockly
block in the workflow editor. Any Blockly block that has a corresponding
server-side workflow operation can be invoked this way: construct a
`params` object equivalent to that block's Blockly arguments, then call the
operation by its workflow-operation name (the same name that appears as the
operation in a workflow's generated JSON output).

This lets a script perform the same action a JSON/XML block would (for
example, swarm commands, order operations) but decide dynamically, in code,
when and how to invoke it — including passing computed values as arguments
and handling the result programmatically.

See the [Workflow Operations Reference](wf-operations-reference.md) for the
catalog of available `wfopsName` values and the `params` each one expects.

- **Parameters**
  - `authData` (`Object`) — Kilroy auth data for the current user/platform.
  - `wfopsName` (`string`) — the workflow-operation name of the block to call, matching the `operation` value used for that block in a workflow's JSON definition. See the [Workflow Operations Reference](wf-operations-reference.md) for the full list of supported values.
  - `params` (`Object`) — the arguments for the operation, matching the same argument names the equivalent Blockly block would use. See the [Workflow Operations Reference](wf-operations-reference.md) for the expected parameters of each operation.
- **Returns**
  - `Promise<Object>` — resolves with the operation's result object. If the named operation cannot be found, resolves with `{success: false, errors: {exception: true, msg: "block run script not found"}}`. If the operation throws, resolves with `{success: false, errors: {exception: true, msg: "Internal Error"}}`.

---

## File access

### `loadFile(path)`

Read the contents of a text file from disk.

- **Parameters**
  - `path` (`string`) — filesystem path to the file to read.
- **Returns**
  - `string` — the file's contents as UTF-8 text, or `""` if the file could not be read.
- **Purpose**: general-purpose file loader used by scripts. This function is **not currently sandboxed** — callers are responsible for only passing trusted, expected paths.

---

## Debugging

### `debugEnable(enableStr)`

Enable Node.js `debug` module namespaces at runtime, equivalent to setting
the `DEBUG` environment variable dynamically.

- **Parameters**
  - `enableStr` (`string`) — a `debug`-style namespace pattern (for example, `"myapp:*"`).
- **Returns**
  - `Error|null` — `null` on success, or the caught error object if enabling debug output failed.
---

## Form generation (`wfProxy.formGen`)

`wfProxy.formGen` is a sub-namespace on the proxy that provides a small
toolkit of classes for building dynamic, structured form definitions in
code. It is most useful in a workflow's form-related hook (for example, a
`begin` hook) when the fields, labels, or choices in a form need to be
computed at runtime rather than authored as a static form definition.

A form definition built with `formGen` is a nested structure:

- a **Form** contains one or more **Panels** (pages of the form)
- a **Panel** contains one or more **Sections**
- a **Section** contains one or more **Fields**

Each class exposes a `.value` property that returns the plain
JSON-serializable object for that piece of the form. Only the outermost
`Form.value` needs to be returned to the workflow runtime — it already
contains the full nested structure of panels, sections, and fields.

### Building a form

```js
function begin(authData, wfProxy, step, theForm) {
    const { Form, Panel, Section, TextField } = wfProxy.formGen;

    const form = new Form("survey", "Quick Survey");
    const panel = new Panel("Page 1", "Please answer the following:");
    const section = new Section();

    section.addField(new TextField("favorite_color", "Favorite color"));
    section.addField(new TextField("favorite_food", "Favorite food"));

    panel.addSection(section);
    form.addPanel(panel);

    return Promise.resolve({
        success: true,
        path: wfProxy.PATH_SUCCESS,
        args: { form: form.value }
    });
}
```

### `Form`

Represents the top-level form definition.

- **`new Form(name, description)`**
  - `name` (`string`, optional) — internal form name.
  - `description` (`string`, optional) — form description.
- **`addPanel(panel)`**
  - `panel` (`Panel` instance or plain object) — a panel to append to the form.
  - Returns the `Form` instance, so calls can be chained.
- **`value`** (property) — returns the plain object representation of the form, including all panels/sections/fields added so far. This is the object you return to the workflow runtime as the form definition.

### `Panel`

Represents one page/panel of a form.

- **`new Panel(name, description)`**
  - `name` (`string`, optional) — panel name, typically shown as a page title.
  - `description` (`string`, optional) — panel description/instructions.
- **`addSection(section)`**
  - `section` (`Section` instance or plain object) — a section to append to the panel.
  - Returns the `Panel` instance, so calls can be chained.
- **`value`** (property) — returns the plain object representation of the panel.

### `Section`

Represents a grouping of fields within a panel.

- **`new Section()`** — takes no arguments.
- **`addField(field)`**
  - `field` (a field instance such as `TextField`, `Dropdown`, etc., or a plain object) — a field to append to the section.
  - Returns the `Section` instance, so calls can be chained.
- **`value`** (property) — returns the plain object representation of the section.

### Field types

Each field type below is constructed with a field `name` (used as the key
under which the user's answer is returned) plus additional type-specific
parameters, and is added to a `Section` with `addField`.

#### `TextField(name, label, placeholder)`

A single-line text input.

- `name` (`string`) — field name/key.
- `label` (`string`, optional) — label displayed to the user.
- `placeholder` (`string`, optional) — placeholder text shown in the empty input.

#### `TextArea(name, label, placeholder)`

A multi-line text input. Same parameters as `TextField`.

#### `RepeatingTextField(name, label, placeholder)`

A text input that allows the user to add multiple repeated text entries.
Same parameters as `TextField`.

#### `CheckBox(name, label, placeholder)`

A single checkbox field. Same parameters as `TextField`.

#### `Dropdown(name, label, pairs)`

A dropdown/select field.

- `name` (`string`) — field name/key.
- `label` (`string`, optional) — label displayed to the user.
- `pairs` (`Array<{name: string, value: string}>`, optional) — the list of selectable options, where `name` is the label shown to the user and `value` is what gets returned when that option is chosen.

#### `RadioButton(name, label, pairs)`

A single-select radio button group. Same parameters as `Dropdown`.

#### `DoubleRadioButton(name, leftLabel, rightLabel, pairs)`

A paired left/right radio button scale, useful for "this vs. that"
comparison questions.

- `name` (`string`) — field name/key.
- `leftLabel` (`string`, optional) — label shown on the left side of the scale.
- `rightLabel` (`string`, optional) — label shown on the right side of the scale.
- `pairs` (`Array<{name: string, value: string}>`, optional) — the pair of alternatives being compared.

#### `HtmlField(name, html)`

A read-only field that renders arbitrary HTML content inline within the form.

- `name` (`string`) — field name/key.
- `html` (`string`, optional) — the HTML markup to display.

### `Utils`

A small set of static helper functions for building and scoring more
specialized survey-style forms.

#### `Utils.MaxDiff(baseName, title, instructions, leftHeader, rightHeader, alternatives, altPerQ, viewsPerAlt)`

Generate a complete multi-page MaxDiff-style questionnaire (a series of
"pick the best / pick the worst" comparison questions built from a list of
alternatives).

- **Parameters**
  - `baseName` (`string`) — base field name used to build each question's field name.
  - `title` (`string`) — title used for each page/panel of the questionnaire.
  - `instructions` (`string`) — instructions/description shown on each page.
  - `leftHeader` (`string`) — header label for the left side of each comparison.
  - `rightHeader` (`string`) — header label for the right side of each comparison.
  - `alternatives` (`Array<string>`) — the list of alternatives to be compared.
  - `altPerQ` (`number`) — how many alternatives to present per question.
  - `viewsPerAlt` (`number`) — how many times each alternative should appear across the whole questionnaire.
- **Returns**
  - `Object` — a complete form definition (equivalent to `Form.value`), with one panel per generated question.

#### `Utils.MaxDiffScore(questions, answers)`

Score/rank the results of a MaxDiff questionnaire generated by
`Utils.MaxDiff`.

- **Parameters**
  - `questions` (`Array<string>`) — the original list of alternatives (matching the `alternatives` passed to `Utils.MaxDiff`).
  - `answers` (`Object`) — the form answers returned by the user for the questionnaire.
- **Returns**
  - `Array<{text: string, score: number, qindex: number}>` — the alternatives ranked from highest to lowest score.

#### `Utils.Test()`

Returns a small, ready-made sample form. Useful as a quick reference for
what a finished form definition looks like, or for verifying that a form is
rendering correctly.

- **Parameters**: none.
- **Returns**
  - `Object` — a sample form definition with a couple of text fields across two panels.

---

## Constants

These are static values exposed on the proxy object for use in script
comparisons and return values; they are not functions.

### Workflow path constants

| Constant | Value | Meaning |
| --- | --- | --- |
| `PATH_STAY` | `"STAY"` | Remain on the current workflow step. |
| `PATH_SUCCESS` | `"SUCCESS"` | Advance along the success path. |
| `PATH_FAILURE` | `"FAILURE"` | Advance along the failure path. |

### Priority constants

| Constant | Value | Meaning |
| --- | --- | --- |
| `PRIORITY_LOW` | `"LOW"` | Low task/step priority. |
| `PRIORITY_NORMAL` | `"NORMAL"` | Normal task/step priority. |
| `PRIORITY_URGENT` | `"URGENT"` | Urgent task/step priority. |
| `PRIORITY_LATE` | `"LATE"` | Overdue/late task/step priority. |

### Global variable name constants

| Constant | Value | Meaning |
| --- | --- | --- |
| `GLOBAL_RESULTS_VAR` | `"__results__"` | Well-known global key under which a step's/hook's result payload is conventionally stored. |
| `GLOBAL_RAW_ARGS` | `"__raw_args"` | Well-known global key for a step's unprocessed/raw input arguments. |
| `GLOBAL_EXCHANGE_INFO` | `"__exchange_info__"` | Well-known global key for exchange/trading-related context data. |

### Other constants

| Constant | Value | Meaning |
| --- | --- | --- |
| `UPLOAD_BUCKET` | `"tempdata.concluent.io"` | Default bucket name used for temporary upload storage. |

