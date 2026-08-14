# UI Basics

This page explains the Kilroy interface in the simplest possible terms.

## The Main Idea

Kilroy runs apps as movable panels inside the dashboard. Internally those panels are called process diagrams, or PDs. You do not need to memorize the term right away, but it helps when reading other documentation.

## The Main Window

When Kilroy opens, you are usually looking at the dashboard.

- The dashboard is the main workspace.
- Installed apps can open one or more panels inside that workspace.
- Each panel can contain buttons, status areas, forms, or a full embedded web page.

## Widget Windows

Most app panels appear as floating windows.

- You can drag them.
- You can resize them.
- You can tile or stack them when several are open.
- Some panels include an active red stop button when the app supports a user-driven shutdown workflow.

For the exact behavior of the traffic-light controls, see [Working with Windows](working-with-windows.md).

## Common UI Terms

### App

An app is an installable Kilroy package. It can contain its own UI, workflows, and static assets.

### Process Diagram

A process diagram is the running visual surface for one part of an app. Some apps have one singleton view. Others can open multiple diagrams at once.

### Workflow

A workflow is the server-side logic behind buttons, hooks, forms, and automation inside the UI.

### iframe page

Some Kilroy windows are native diagram layouts. Others embed a custom HTML page. The `kilroy.docs` view is one of those iframe-style app surfaces.

## Typical First-Run Actions

1. Open the installed apps area.
2. Start the app you want to explore.
3. Bring its widget window to the front by clicking inside it.
4. Resize it or use tile/stack controls if you have several open.
5. Use the app store when you want to add more apps.

## Good Apps to Explore Early

- `kilroy.groups` for group chat, presence, link sharing, docs sessions, and web widgets.
- `kilroy.ai.services` for visual AI pipeline creation.
- `kilroy.ai.harness` if your install includes the current Pi-based harness tooling.

## Where to Go Next

- [Quick Start](quick-start.md)
- [Bundled Apps](../apps/bundled-apps.md)
- [Files and Settings](files-and-settings.md)