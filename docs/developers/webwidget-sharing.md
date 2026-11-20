# Sharing Webwidgets over the Swarm

A Kilroy instance can share its webwidgets with other members of a group, including phones running the Kilroy iOS app, without opening any network ports. The `kilroy.groups` **File_Server** agent (`chat_agent_fileserver`) serves files from your Kilroy instance over the group's swarm, and each widget folder can include an optional **`kilroy-widget.json`** file that controls how the widget is listed, which swarm it uses, and who may load it.

This page describes how to lay out a webwidget so it can be shared, and the full `kilroy-widget.json` reference.

---

## How sharing works

1. A group's templates deploy a **File_Server** agent on the group's public swarm. Each group member can run their own fileserver; they are told apart by wallet address.
2. A client (for example the iOS app) lists the group's users, picks one, and requests that user's **webwidget catalog**.
3. The fileserver builds the catalog on every request by scanning your webwidgets folder. There is no list to maintain.
4. The client launches a widget by loading its `index.html` and other files through the fileserver using `kilroy://` URLs.

!!! note "Groups need both agents"
    A group can be used from the phone app only if its deployed templates include both a `chat_agent_fileserver` and a `chat_agent_users` agent. It is up to the group's creator to make sure the templates provide them.

---

## Folder layout

Shared widgets live in the `webwidgets` folder of your `kilroypublic` directory:

```
{{kilroypublic}}/webwidgets/
├── 3cherry/
│   ├── index.html            ← required
│   ├── kilroy-widget.json    ← optional capabilities file
│   ├── icon.png
│   └── blossoms.js
└── scoreboard/
    └── index.html
```

- Every non-hidden subfolder that contains an `index.html` file is a widget. Other folders are ignored.
- The folder name is the widget's `id` and default display name.
- Widgets are loaded from `/kilroypublic/webwidgets/<id>/index.html`, so use **relative paths** for scripts, styles, and images inside the widget.
- Symbolic links are followed only if they resolve to a location inside the webwidgets folder.
- The catalog lists at most 500 widgets, sorted by name.

### Fileserver routes

The fileserver only serves URL paths that start with one of its configured **routes**. The default route, both in the agent's configuration and on its palette entry, is:

```
/kilroypublic/webwidgets/
```

!!! warning "Do not widen the routes casually"
    The rest of `/kilroypublic/` can hold private or potentially private data, such as AI agent chat histories. Adding `/kilroypublic/` as a route exposes all of it to anyone who can reach the fileserver. If a widget needs shared libraries, add only the specific prefixes it needs (for example `/apps/kilroy.utils/lib/`).

The catalog is only available when the routes include `/kilroypublic/webwidgets/` (or `/kilroypublic/`). Otherwise catalog requests are refused with `403`.

---

## `kilroy-widget.json` reference

The capabilities file is optional. Put it in the widget's folder next to `index.html`. It must be a JSON object no larger than 64 KB.

| Field | Type / values | Default | Description |
|---|---|---|---|
| `name` | string, up to 80 characters | folder name | Display name shown in the catalog. |
| `description` | string, up to 500 characters | `""` | Short description shown in the catalog. |
| `icon` | path relative to the widget folder | none | Icon image. The file must exist and must stay inside the widget folder. |
| `swarm` | `public`, `private`, `none`, or `swarm:<name>` | `public` | Which swarm the widget uses for its messages (see below). |
| `audience` | `anyone`, `group`, or `owner` | `group` | Who may see the widget in the catalog and load its files (see below). |

### `swarm`

The `swarm` field selects the swarm the widget uses for its own messages through the webwidget SDK. It does not change where the widget's files come from.

| Value | Widget messages use |
|---|---|
| `public` | The group's public widget swarm, `<group swarm>-ww`. |
| `private` | The group's private swarm (`group_private_swarm`). Paired phones receive it automatically; other clients must enter it manually. |
| `none` | No swarm. Use this for widgets that do not send or receive messages. |
| `swarm:<name>` | A fixed swarm named `<name>`, for example `swarm:3cherry-tournament`. The name may be up to 200 characters, with no control characters. |

### `audience`

The `audience` field controls who can see the widget in the catalog **and** who the fileserver will serve its files to. The two checks always agree, so a hidden widget cannot be loaded by guessing its URL.

| Value | Available to |
|---|---|
| `anyone` | Everyone who can reach the fileserver, including unpaired guests. |
| `group` | Phones paired with any fileserver in this group, and the owner. |
| `owner` | Only phones paired with **this** Kilroy instance, using its current pairing epoch. |

See [Client roles](#client-roles) for how clients are classified.

!!! warning "Swarm names are not secrets"
    Anyone who learns a group's public swarm name can join it and request catalogs. Use `audience: anyone` only for widgets you are happy to share with anyone.

### Missing or invalid files

- **No `kilroy-widget.json`:** all defaults apply (`swarm: public`, `audience: group`), and the catalog entry has `"capabilities": false`.
- **Unreadable, too large, or not a JSON object:** the file is ignored, defaults apply, and the entry includes a `warning`.
- **An invalid field:** only that field falls back to its default, and the entry includes a `warning` describing the problem. Unknown fields are ignored.

### Example

```json
{
  "name": "Three Cherry Slots",
  "description": "A multiplayer slot machine for the group.",
  "icon": "icon.png",
  "swarm": "swarm:3cherry-tournament",
  "audience": "group"
}
```

---

## Catalog format

Clients request the catalog with `GET /.well-known/kilroy/webwidgets` from a user's fileserver. The response contains only the widgets the requesting client is allowed to use:

```json
{
  "version": 1,
  "name": "Chuck's Kilroy",
  "service": "www",
  "group_name": "Game Night",
  "widgets": [
    {
      "id": "3cherry",
      "name": "Three Cherry Slots",
      "description": "A multiplayer slot machine for the group.",
      "path": "/kilroypublic/webwidgets/3cherry/index.html",
      "icon": "/kilroypublic/webwidgets/3cherry/icon.png",
      "swarm": "swarm:3cherry-tournament",
      "audience": "group",
      "capabilities": true
    }
  ]
}
```

`group_name` is present only when the client presented a group certificate. `warning` is present on an entry only when its capabilities file had problems.

---

## Client roles

When a phone connects to a fileserver, it proves which device key it holds and presents any certificates it has for the group. The fileserver then treats it as one of three roles:

| Role | How it is granted | Widgets available |
|---|---|---|
| **owner** | The phone paired with this Kilroy instance by scanning its group pairing QR code, and the certificate has the group's current epoch. | `owner`, `group`, and `anyone` |
| **member** | The phone holds a valid certificate from a different Kilroy instance in the same group. | `group` and `anyone` |
| **guest** | No valid certificate. | `anyone` only |

### Pairing a phone

1. In the **Groups** manager, choose **Pair a phone** on the group. A QR code appears; it can be used once and expires after two minutes. A copyable pairing link is also shown, for devices that cannot scan (such as the iOS simulator).
2. Scan the code, or paste the link, in the Kilroy iOS app. The phone pairs immediately and receives a signed device certificate, the group's friendly name, and its private swarm.
3. A phone can be an owner at several Kilroy instances in the same group by pairing with each one.

Certificates do not expire. To cut off every paired phone for a group, choose **Revoke phone pairings** in the Groups manager. Existing certificates for that group stop granting owner access, and phones must pair again.

!!! note "Member access cannot be revoked by other fileservers"
    Revoking pairings only affects owner access at the Kilroy instance that issued the certificates. Other fileservers in the group cannot check that instance's epoch, so they may continue to treat a revoked phone as a **member**. This is why `member` access is limited to `group` and `anyone` widgets.

### Guest QR codes

To share a group with someone who has not paired, choose **Guest QR code** on the group in the **Groups** manager. You can share the group's catalog, or one widget whose audience is `anyone` and whose swarm is not `private`. The QR code and its copyable link look like:

```
kilroy-guest://open?group_id=…&swarm=…&wallet=…&name=…&title=…&url=kilroy://www.<wallet>.<topic>/kilroypublic/webwidgets/<id>/index.html&mode=public
```

Parameter values are percent-encoded. `title`, `url`, and `mode` appear only when a widget is chosen. `mode` is the widget's swarm setting: `public`, `none`, or `swarm:<name>`. The link contains no secret; it only saves typing the swarm name. The phone joins as a guest and opens the widget. To stop sharing it, change the widget's `audience`.

---

## Current limitations

- **Widgets that call Kilroy webhooks or APIs do not work over the fileserver yet.** The fileserver currently serves static files only (`GET` and `HEAD`). Widgets that call back into Kilroy should not be shared until API proxying is added.
- **Phones have no general identity yet.** Pairing ties a phone to a group, but Kilroy does not yet support admission lists for swarms. Phones that use only shared widgets and have no paired Kilroy instance of their own are treated as guests.
- **One fileserver per user and service name.** Each user can run one fileserver per group swarm for a given service name (default `www`). Installations sharing a wallet must use different service names.
