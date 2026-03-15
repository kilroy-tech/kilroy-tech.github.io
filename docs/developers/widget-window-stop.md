# Implementing the Stop Button (`ui_stop_wf`)

The traffic-light **red button** in a widget window's title bar lets users stop a running app directly from the dashboard UI. This button is inactive (greyed out) by default — it only activates for process diagram classes that declare a `ui_stop_wf` workflow.

---

## How It Works

When a user clicks the red button on a widget window, the dashboard looks up the `ui_stop_wf` field for the running diagram's pdClass in the app manifest. If a value is present, the dashboard calls that named workflow on the running PDI. The workflow is responsible for performing whatever cleanup the app requires before the stop.

---

## Declaring `ui_stop_wf` in Your App Manifest

In your app's `manifest.json`, add `ui_stop_wf` to the pdClass definition:

```json
{
  "pdClasses": {
    "my_agent": {
      "name": "My Agent",
      "desc": "Does something useful",
      "ui_stop_wf": "stop_hook"
    }
  }
}
```

The value is the **workflow name** to invoke — it must exist in your PDI's workflow library and be callable as a named workflow trigger.

---

## Writing the Stop Workflow

The stop workflow is invoked via `triggerNamedWorkflow` from the dashboard. It receives no special arguments — its job is simply to perform an orderly shutdown of whatever the PDI is doing.

Typical stop workflow responsibilities:

- Publish a final status message to any active swarms
- Cancel any pending timers or in-flight HTTP requests
- Write any state that should persist to memory or disk
- Call `stop_hook` on child PDIs if the agent manages sub-diagrams

The workflow follows the standard 3-file convention (`json.json`, `xml.xml`, `script.js`). Most stop hooks are all-preflight — the Blockly wrapper is trivial.

### Minimal example (`script.js`)

```js
async function preflight(wfProxy) {
    const alias = wfProxy.getGlobalValue('pd_alias');
    // publish a shutdown notification to the agent's send swarm
    const sendSwarm = wfProxy.getGlobalValue('agent_send_swarm');
    if (sendSwarm) {
        await wfProxy.publishToSwarm(sendSwarm, {
            from: wfProxy.getGlobalValue('wf_agent_name') || alias,
            id: alias,
            args: [{ username: 'system', text: '[agent stopped]', timestamp: Date.now(), type: 'text/plain' }]
        });
    }
    resp = { success: true };
    return Promise.resolve({ success: true });
}
```

---

## Notes

- If `ui_stop_wf` is absent or empty in the manifest, the red button is rendered but is visually greyed and non-interactive — no error is shown.
- The stop workflow does **not** automatically shut down the PDI process itself. If you want the PDI to exit after stop, call the appropriate teardown API from within the workflow.
- For `kilroy.ai.services` pipeline agents (`ai_agent`, `wf_agent`, etc.), the stop lifecycle is managed by the pipeline's `stop_hook` workflow — you do not need to declare `ui_stop_wf` on individual agent pdClasses unless you want per-agent granular stop controls.
