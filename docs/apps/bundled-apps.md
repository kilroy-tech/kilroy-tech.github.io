# Bundled Apps

This page is the short guide to the major apps that commonly ship with Kilroy builds.

## Start with kilroy.groups

`kilroy.groups` is the bundled app most new users should explore first.

It provides:

- group chat
- live user presence
- shared link boards
- direct message sessions
- docs viewing and editing sessions
- URL web widgets launched from shared links

The app includes a `manager` class plus several user-facing agent views such as group chat, users, link share, docs viewer, docs server, and webwidget panels.

If you want to understand how Kilroy feels as a collaborative application platform, start here.

## Other Common Bundled Apps

### kilroy.ai.services

Use this for visual AI pipeline creation and orchestration. It is the main pipeline editor and agent deployment app.

### kilroy.ai.harness

Use this when your build includes the newer Pi-oriented harness workflows and agent experimentation surface.

### kilroy.appstore

This is the default in-platform app store experience. It reads a catalog and can install downloadable apps into your local Kilroy apps folder.

## Installing New Apps

Kilroy apps are downloaded as app packages and installed into the local apps directory.

- The app store UI is driven by the `kilroy.appstore` app.
- The store catalog and app downloads are managed by Kilroy's App Store service.
- Backend app installation uses the platform download/install path, which writes the downloaded app archive into the Kilroy apps folder.

In practical terms, this means you can browse the app store UI, click install, and let Kilroy place the app in the same local app area used by bundled apps.

## What the App Store Contains

The current catalog includes entries such as:

- `kilroy.ai.services`
- `kilroy.ai.harness`
- `kilroy.groups`
- `kilroy.webwidgets`
- `telegram.services`
- `kilroy.exchanges`

Catalog contents can change over time as new apps and updates are published.

## Notes for Users

- Installed apps live alongside bundled apps in Kilroy's app storage area.
- Apps are self-contained packages with their own manifest, process diagrams, workflows, and public files.
- Some apps launch automatically when Kilroy starts. Others appear only when you start them manually.

## Related Reading

- [Quick Start](../index.md#quick-start)
- [Kilroy Groups App](../index.md#kilroy-groups-app)
- [Files and Settings](../getting-started/files-and-settings.md)