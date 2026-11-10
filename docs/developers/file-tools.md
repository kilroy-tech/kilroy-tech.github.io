# File Tools and Folder Locations

Kilroy provides UTF-8 text file tools through `kilroy.ai.services`. They can replace Pi's built-in `read`, `write`, and `edit` tools while allowing pipeline authors to configure directory restrictions and size limits. Image and binary I/O are not supported by these tools.

## Tool Overview

| Catalog class | Typical instance name | Model-call arguments | Behavior and result |
|---|---|---|---|
| `kilroy.ai.services.file_read` | `read` | `path`, optional `offset`, optional `limit` | Reads text with line-range and output limits. Returns `content`, `start_line`, `end_line`, `total_lines`, `next_offset`, `truncated`, `first_line_exceeds_limit`, and `bytes_read`. |
| `kilroy.ai.services.file_write` | `write` | `path`, `content` | Creates or rewrites a file, including empty content. Returns `path`, `bytes_written`, and `appended`. Append behavior is instance-controlled. |
| `kilroy.ai.services.file_edit` | `edit` | `path`, `edits: [{oldText, newText}]` | Applies precise replacements to an existing file. Returns `path`, `bytes_written`, `edits_applied`, `diff`, `patch`, and `firstChangedLine` where available. |

Success results include `success: true` and the resolved file path. Failures return `success: false`, `error`, and `code`; workflow completion alone does not mean the file operation succeeded.

Read offsets are 1-based positive integers. Pass a returned `next_offset` as the next call's `offset`. If `first_line_exceeds_limit` is true, the current line cannot fit within the configured output limit and `next_offset` is null; retrying the same request will not make progress. Adjust the instance's output limit when appropriate. Reads are bounded by the input-file limit as well as output limits; this is not unlimited streaming through a large file.

Use `write` for new files or complete rewrites, and `edit` for targeted changes. Each nonempty `oldText` must match exactly once in the original file, and edits must not overlap. Multiple replacements are matched against the original file, not earlier replacements in the same call. Matching normalizes CRLF to LF; saved edits preserve the file's BOM and line-ending style. Validation failures do not apply any replacements. This is not a transactional guarantee against disk failures during writing.

## Select Tools in ai_args

Remove the corresponding Pi built-ins from `tools` when using the same runtime names for Kilroy instances:

```json
{
  "tools": ["bash", "grep", "find", "ls"],
  "tool_instances": [
    {
      "use": "kilroy.ai.services.file_read",
      "as": "read",
      "bind": { "path_prefix": "{{kilroypublic}}/projects/example" }
    },
    {
      "use": "kilroy.ai.services.file_write",
      "as": "write",
      "bind": { "path_prefix": "{{kilroypublic}}/projects/example" }
    },
    {
      "use": "kilroy.ai.services.file_edit",
      "as": "edit",
      "bind": { "path_prefix": "{{kilroypublic}}/projects/example" }
    }
  ]
}
```

The prefix directory must already exist. Write can create missing child directories, but does not create the configured prefix itself.

The harness's public `ai_agent_tools.json` reference template uses these three aliases, with `path_prefix` bound to `${ai_working_dir}`. It retains Pi `bash`, `grep`, `find`, and `ls`, and leaves the existing Kilroy `system` instance unchanged. Shell parity changes are deferred. The reference file is not loaded live: inject its contents into the actual pipeline AI agent's `ai_args`, then redeploy/reconfigure the affected agents.

Catalog descriptions explain the operations. An instance may provide a `description` override to add project-specific guidance; preserve the argument names, text-only limitation, failure behavior, and relevant restrictions in that description.

## Instance Policy and Defaults

Policy belongs in catalog `params` and instance `bind`, not in model-call arguments. Catalog `wf_webhook_args` passes the resolved bindings to webhook `targs`:

```json
{
  "params": {
    "path_prefix": {
      "type": "string",
      "required": false,
      "default": "{{kilroypublic}}"
    }
  },
  "wf_webhook_args": {
    "path_prefix": "${bind.path_prefix}"
  }
}
```

This is the prefix portion of a catalog entry, not a complete tool definition.

| Binding | Applies to | Default |
|---|---|---|
| `path_prefix` | All three catalog classes | `{{kilroypublic}}` |
| `max_file_bytes` | Read input; write result; edit original and result | 10485760 bytes (10 MiB) |
| `max_lines` | Read output | 2000 |
| `max_output_bytes` | Read content output | 51200 bytes (50 KiB), excluding result metadata |
| `append` | Write | `false` |
| `overwrite` | Write | `true`; `false` requires a new file, even when append is enabled |
| `create_parents` | Write | `true` |

Omitting a prefix binding inherits the catalog default. Explicitly binding `"path_prefix": ""` disables confinement; relative paths then use `kilroypublic` as their base, and absolute paths may address other locations allowed by OS permissions. A nonempty prefix sets both the relative-path base and the permitted hierarchy. Absolute paths are allowed only within that hierarchy. Invalid, missing, or unresolved nonempty prefixes fail rather than reverting to unrestricted access.

Path containment checks reject traversal, sibling-directory prefix tricks, and symlink escapes. Confined writes and edits also reject files with multiple hard links. These checks are application-level restrictions, not an OS sandbox or protection against every concurrent hostile filesystem change. Pi Bash, unrestricted `system`, other file-capable tools, and sub-agents may still access paths outside the prefix. Configure those capabilities separately for an agent-wide restriction.

## Folder Location Macros

The new file-tool prefix resolver uses these case-insensitive service-discovery macros:

| Macro | Configuration override | Default resolution |
|---|---|---|
| `{{kilroypublic}}` | `KILROY_PUBLIC_FOLDER` | Configured public directory; otherwise the resolved Documents directory plus `kilroypublic`. |
| `{{home}}` | `KILROY_HOME_DIR` | Node's runtime-user home directory. |
| `{{temp}}` | `KILROY_TEMP_DIR` | Node's temporary directory. |
| `{{documents}}` | `KILROY_DOCUMENTS_DIR` | Native user Documents discovery, including Windows Known Folders and Linux XDG settings. |
| `{{downloads}}` | `KILROY_DOWNLOADS_DIR` | Native user Downloads discovery. |
| `{{desktop}}` | `KILROY_DESKTOP_DIR` | Native user Desktop discovery. |

Environment variables override service-definition defaults. Configured values can contain supported macros, such as `KILROY_PUBLIC_FOLDER={{documents}}/kilroypublic`. Lookups are lazy, directory results must be absolute, and unknown, malformed, or circular macros are errors. Discovery can return a directory that does not exist; file-tool prefix validation separately requires it to exist. Native discovery does not require Electron; home/temp use Node, and desktop-folder discovery uses `platform-folders`.

All locations refer to the Kilroy host/runtime user, not the browser user's machine. Literal absolute prefixes such as `/tmp/project` are also supported. Use `{{temp}}/project` for a platform-dependent temporary location.

### Three Different Expansion Stages

| Syntax | Resolution stage | Example |
|---|---|---|
| `${ai_working_dir}` | Pipeline deployment variable substitution | Supplies the instance prefix from a pipeline variable. |
| `${bind.path_prefix}` | Tool catalog materialization | Supplies `wf_webhook_args.path_prefix` from the instance/default binding. |
| `{{kilroypublic}}` | Runtime service-discovery directory expansion | Resolves the prefix to this host's configured public directory. |

A deployment variable may contain `{{kilroypublic}}/projects/example`; pipeline substitution preserves that location macro for runtime resolution. These folder macros expand in the trusted prefix configuration, not in file contents, edit replacement text, or the model's `path` argument. They are not automatic global substitutions in every tool field; unrelated tools and Pi's own working-directory handling may support a different subset.

## Docker Locations

Containers cannot discover the host user's Documents, Downloads, or Desktop directories. In Docker, supply explicit container paths for those locations and mount the host directories as needed:

```yaml
services:
  kilroy:
    environment:
      KILROY_DOCUMENTS_DIR: /workspace/documents
      KILROY_DOWNLOADS_DIR: /workspace/downloads
      KILROY_PUBLIC_FOLDER: /workspace/public
    volumes:
      - ${HOST_DOCUMENTS_DIR}:/workspace/documents:ro
      - ${HOST_DOWNLOADS_DIR}:/workspace/downloads
      - ${HOST_KILROYPUBLIC_DIR}:/workspace/public
```

The `${HOST_*}` expressions here are Docker Compose variables, not Kilroy pipeline variables. Mount and configure Desktop separately if needed. Read-only mounts enforce OS-level write restrictions even when a write tool is exposed. `{{home}}` and `{{temp}}` still describe the container user's locations. Without an explicit public directory or a configured Documents mapping, the public-directory default cannot be resolved in Docker; it does not silently become the host's public directory.

## Workflow and Backend Access

The `file_read`, `file_write`, and `file_edit` webhook triggers are registered on `kilroy.ai.webhooks`. A normal wf_agent can call them using structured JSON in `webhook_args.args[0].text` and policy in `webhook_args.targs`. Results are JSON text in the usual wf_agent response envelope. Unlike catalog materialization, a direct webhook/library call does not inject catalog defaults: omitting `path_prefix` there is unrestricted. Set it explicitly for direct callers.

The thin workflows delegate to `readTextFile(args, options)`, `writeTextFile(args, options)`, and `editTextFile(args, options)` in the backend `modules/util/file_storage` library. The same methods are exposed on `wfProxy`:

```javascript
const result = await wfProxy.readTextFile(
    { path: "src/main.js", offset: 1, limit: 100 },
    { path_prefix: "{{kilroypublic}}/projects/example" }
);
if (!result.success) {
    debug(result.error);
}
```

Service discovery exposes `getDirectoryLocation(name)` and `expandDirectoryMacros(value)`. These low-level methods can throw on invalid configuration; storage operations catch failures, log diagnostics, and return defined error results. A resolved path alone is not an access policy. Direct callers must be trusted to select their policy; an arbitrary submitted `targs` object is not authenticated authority.

Legacy `read_file` and `write_file` hooks retain their filename-template behavior. They are not aliases for the new tools and have not been migrated automatically.

## Activation

Restart the backend to load the storage and proxy APIs, reload the AI-services app/process diagram to register the new workflows, refresh the tool catalog, and recreate/reconfigure affected agents. Existing pipeline configurations do not change when a reference template is edited. This work does not realign Kilroy `system` with Pi Bash.