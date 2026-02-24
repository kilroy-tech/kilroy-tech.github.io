# Adding a New WF_Agent Webhook to Kilroy AI Services

This tutorial explains how to add a new `wf_agent` type to Kilroy's AI pipeline system. A `wf_agent` is a
pipeline node that appears in the pipeline editor palette and, when it receives a swarm message, calls a
server-side webhook to process the message and optionally publish a result back to the pipeline.

Adding a new `wf_agent` requires coordinated changes in three places:

1. **The pipeline editor palette** — defines how the new agent appears in the editor and its default configuration
2. **The webhooks process diagram** — registers the webhook trigger endpoint
3. **The workflow** — implements the actual processing logic in JavaScript and workflow JSON

---

## Overview: How wf_agents Work

When a `wf_agent` receives a message on its input swarm, the Kilroy runtime optionally calls a webhook on the
`kilroy.ai.webhooks` process diagram. The webhook trigger maps to a workflow, which runs on the backend. The
workflow's `preflight` function in `script.js` processes the incoming message, and the result is passed back
to the pipeline as a new swarm message published to the agent's output swarm (when `wf_publish_results` is true).

The incoming message data is available to the workflow in the `webhook_args` global context variable, which
contains the following standard fields:

| Field | Description |
|---|---|
| `tagentname` | The name of the sending agent |
| `tusername` | The username associated with the message |
| `tid` | The message transaction ID |
| `tpublish` | Whether to publish the result (boolean/string) |
| `targs` | JSON string of per-instance configuration args from the node's `wf_webhook_args` |
| `args` | Array of message objects; each has `text`, `type`, and `timestamp` |
| `from` | Agent/user the message originated from |

The workflow builds a `resp` object containing the result and sets it in global context. A block in the
workflow's `step_group` assigns `resp` to `x`, which the runtime uses as the payload to publish back to the
outbound swarm.

---

## Step 1: Create the Workflow

Workflows live under:

```
api/platform_data/demo/apps/kilroy.ai.services/workflows/webhooks/<name>/payload/
```

Each workflow folder contains exactly three files:

| File | Purpose |
|---|---|
| `script.js` | JavaScript preflight/postflight logic |
| `json.json` | Compiled workflow definition (executed by the workflow engine) |
| `xml.xml` | Blockly source representation (used by the visual workflow editor) |

### 1a. script.js

Start by copying the template from:

```
api/platform_data/demo/templates/WORKFLOW_KIND/payload/script.js
```

Replace all `${_rebar_wfName}` occurrences with your workflow's full name
(e.g., `kilroy.ai.services/webhooks/add_1`) and update the `@author` and `@copyright` fields.

The `preflight` function is where your logic lives. Use `wfProxy.getGlobalValue("webhook_args")` to access
incoming message data, do your processing, build the standard `resp` object, then call
`wfProxy.setGlobalValue` to pass values to the workflow blocks.

A minimal preflight that transforms message text looks like this:

```javascript linenums="1"
function preflight(authData, wfProxy) {
    debug ("preflight");
    const wha = wfProxy.getGlobalValue("webhook_args");
    const tAgentName = wha["tagentname"];
    const tUserName  = wha["tusername"];
    const tid        = wha["tid"];
    let tPublish     = wha["tpublish"];
    let data         = null;
    let dataType     = "text/plain";

    tPublish = tPublish === "true" || tPublish === "TRUE" || tPublish === true;

    try {
        data     = wha.args[0].text || null;
        dataType = wha.args[0].type || "text/plain";
    } catch (err) {
        debug(`Bad data in args: ${err}`);
        data     = null;
        tPublish = false;
    }

    // ---- your logic here ----
    const result = myTransform(data);
    // -------------------------

    const resp = {
        from: tAgentName,
        id:   tid,
        args: [{
            username:  tUserName,
            text:      String(result),
            timestamp: Date.now(),
            type:      dataType
        }]
    };

    wfProxy.setGlobalValue("tpublish", tPublish);
    wfProxy.setGlobalValue("resp", resp);
    return Promise.resolve({success: true});
}
```

!!! note
    The only functions available on `wfProxy` are those exported by
    `api/modules/wf/workflow_proxy.js`. There is no `getWebhookArg` shortcut —
    always use `getGlobalValue("webhook_args")` and extract fields from the returned object.

### 1b. json.json

Start from the template at `api/platform_data/demo/templates/WORKFLOW_KIND/payload/json.json` and replace
`${_rebar_wfName}`. For a standard publish-result webhook, the structure is:

```json linenums="1"
{
    "name": "kilroy.ai.services/webhooks/<name>",
    "version": "1",
    "description": "...",
    "isInteractive": false,
    "clean_up": true,
    "inputs": [],
    "outputs": ["tpublish"],
    "args": {"role": "*"},
    "steps": [
        {
            "operation": "set_value",
            "isServer": true,
            "args": {"variable": "wfCleanupFlag", "value": "1"}
        },
        {
            "operation": "step_group",
            "isServer": true,
            "args": {
                "role": "*",
                "message": "",
                "timer": "24",
                "isInteractive": false,
                "canTerminate": false,
                "success": [
                    {
                        "operation": "set_var_to",
                        "isServer": true,
                        "args": {
                            "var_name": "x",
                            "push_array_name": null,
                            "field_name": null,
                            "var_expr": {"type": "variable", "arg": "resp"}
                        }
                    }
                ]
            }
        },
        {"operation": "end", "isServer": true, "args": null}
    ],
    "externalForms": {}
}
```

Key points:

- `isInteractive` must be `false` for a webhook — it runs entirely on the backend with no user interaction.
- `canTerminate` must be `false` for the same reason.
- `outputs: ["tpublish"]` causes the `tpublish` variable (set in preflight) to be persisted in the workflow
  instance record.
- The single block in `step_group.success` assigns the `resp` object (set in preflight) to the context
  variable `x`, which the runtime uses as the outbound message payload.
- If `script.js` handles all logic and only sets `__results__`, the `success` array can be empty and
  `outputs` can be `[]`.

!!! warning
    `isServer: true` on a block means the block runs on the backend. Set it to `false` only for blocks
    that require frontend interaction (e.g., showing a form). All webhook workflow blocks should be
    `isServer: true`.

### 1c. xml.xml

The `xml.xml` file is the Blockly visual-editor source. For a simple webhook that is maintained
programmatically rather than via the Blockly editor, this file documents the intended structure but is
not directly executed. It should match the block structure in `json.json`. Copy and adapt the XML from
a similar existing webhook in `workflows/webhooks/`.

---

## Step 2: Register the Webhook in the Process Diagram

Edit:

```
api/platform_data/demo/apps/kilroy.ai.services/process_diagrams/webhooks/diagram.json
```

Add a new node object to the `nodeDataArray`. Use a unique negative integer key that is not already in use.
Set `loc` to a position near other webhook nodes (the canvas uses `"x y"` string coordinates):

```json linenums="1"
{
    "category": "webhook",
    "title": "<name>",
    "rsize": "144 24",
    "trigger_name": "<name>",
    "action_workflow": "kilroy.ai.services/webhooks/<name>",
    "action_workflow_id": "",
    "action_args": "{}",
    "action_type": "WORKFLOW",
    "action_trigger": "",
    "server_only": "true",
    "dash": [3, 2],
    "visible": true,
    "zOrder": 120,
    "key": -47,
    "loc": "60 -60"
}
```

!!! note
    `trigger_name` must exactly match the webhook name used in `wf_diagram_webhook` in the palette entry
    and in the workflow's `name` field (the last path segment).

---

## Step 3: Add the Palette Entry

Edit:

```
api/platform_data/demo/apps/kilroy.ai.services/public/pipeline_editor/js/palette_defs.js
```

Add a new entry to the `wf_palette` array. The `wf_diagram_alias` is always `kilroy.ai.webhooks` (the
runtime alias of the webhooks process diagram, not its template name):

```javascript linenums="1"
{
    category: "wf_agent",
    figure: "Rectangle",
    agent_name: "<name>",
    agent_desc: "A short description of what this agent does.",
    agent_display_order: 0,
    agent_is_controller: false,
    agent_is_controlled: false,
    wf_agent_name : "<name>",
    wf_username   : "<name>",
    wf_diagram_alias   : "kilroy.ai.webhooks",
    wf_diagram_webhook : "<name>",
    wf_call_webhook    : true,
    wf_publish_results : true,
    wf_webhook_args    : "{}",
    wf_interval_secs: 0,
    rsize: "140 32",
    angle: "0",
    fill: "#D6D6D6",
    opacity: 1.0,
    stroke: "#000000",
    strokeWidth: 1,
    font: "12px \"Helvetica Neue\", Helvetica, Arial, sans-serif",
    fontStroke : "#000000",
    zOrder: 100
},
```

Key palette fields:

| Field | Description |
|---|---|
| `wf_diagram_alias` | Always `kilroy.ai.webhooks` for webhook-backed agents |
| `wf_diagram_webhook` | The webhook `trigger_name` to call when a message arrives |
| `wf_call_webhook` | Set to `true` to invoke the webhook on each received message |
| `wf_publish_results` | Set to `true` to automatically publish the workflow result to the output swarm |
| `wf_webhook_args` | JSON string of default per-instance configuration; users can edit this in the pipeline editor |
| `agent_is_controller` | `true` if this agent controls another agent rather than processing data |
| `agent_is_controlled` | `true` if this agent can be controlled by a controller agent |

---

## Step 4: Reload and Test

After making these three changes:

1. Restart the Kilroy backend (or hot-reload if supported) so the new workflow is picked up.
2. Open the pipeline editor in the Kilroy UI.
3. The new agent should appear in the `wf_palette` section of the palette.
4. Drag it into a pipeline, connect it to a swarm, and run the pipeline to test it.

---

## Summary Checklist

- [ ] `workflows/webhooks/<name>/payload/script.js` — preflight logic reads `webhook_args`, builds `resp`, sets `tpublish` and `resp` via `setGlobalValue`
- [ ] `workflows/webhooks/<name>/payload/json.json` — non-interactive, `outputs: ["tpublish"]`, step assigns `resp` to `x`
- [ ] `workflows/webhooks/<name>/payload/xml.xml` — Blockly source matching json.json
- [ ] `process_diagrams/webhooks/diagram.json` — new webhook node with matching `trigger_name` and unique `key`
- [ ] `public/pipeline_editor/js/palette_defs.js` — new `wf_agent` entry in `wf_palette` with correct `wf_diagram_alias` and `wf_diagram_webhook`
