# Files and Settings

This page covers the folders and files most Kilroy users eventually need to know about.

## The Important Storage Areas

Kilroy keeps its persistent platform data in a platform data directory managed by the runtime.

Within that data area, important folders include:

- `apps/` for installed app packages and expanded app folders
- `database/` for SQLite database files and app settings
- `config/` for configuration files used by the platform
- `workflows/`, `forms/`, `menus/`, and related support folders for platform data

Kilroy apps themselves are stored under the apps area as folders or zip archives.

## App Files

Installed app packages live in the Kilroy apps storage folder. In the backend/runtime layout, this is the `platform_data/demo/apps/` area.

That is where Kilroy loads app manifests, process diagrams, workflows, and public assets.

## App Settings

Per-app settings are stored under:

`database/app_settings/<app_id>/`

This is the safest place to think about app-specific persistent settings. If an app offers configuration through the UI, those settings often end up backed by this area or by the platform database.

## Database Files

Kilroy uses SQLite for runtime persistence. The platform data database area contains files such as:

- `data.db`
- `data.db-shm`
- `data.db-wal`

These hold runtime state such as process diagram instances, workflow state, and other platform data.

## The kilroypublic Folder

Desktop builds support a `kilroypublic` folder that Kilroy can serve directly as static content.

- Default location: your Documents folder, under `kilroypublic`
- URL prefix inside Kilroy: `/kilroypublic`
- Typical use: your own HTML, images, reference files, or other static content you want Kilroy to serve

Kilroy creates this folder automatically on first launch when the related setting is enabled through `electron.env`.

## Safe Changes Users Can Make

Users can usually make safe changes in these areas:

- add or update their own static content in `kilroypublic`
- review installed app files when troubleshooting
- review app settings folders for app-specific data
- review configuration files when a guide explicitly tells them what to change

## Changes to Avoid Without Guidance

- deleting SQLite database files
- editing workflow payload files unless you are intentionally developing apps
- editing app manifests unless you are intentionally modifying an app package
- changing platform config files without a clear backup and recovery path

## Helpful References

- [docs.kilroy.tech](https://docs.kilroy.tech/){ target="_blank" }
- [kilroy.tech](https://kilroy.tech/){ target="_blank" }
- [Kilroy GitHub organization](https://github.com/kilroy-tech/){ target="_blank" }