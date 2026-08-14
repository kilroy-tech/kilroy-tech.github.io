# Quickstart Guide

## Platform Requirements

Kilroy is a free application download for desktop and laptop computers, designed to be cross platform and portable.
It runs on most desktop architectures, with applications available for the following desktop platforms:

- macOS on Apple Silicon
  - macOS on Intel - *coming soon*
- Windows 11
- Linux (Ubuntu) - *coming soon*

Kilroy is designed to be scalable and can be run in headless server environments. Docker builds are available for
Intel/AMD, ARM, and ARM7, allowing it to run on anything from a Raspberry Pi to large, multi-host enterprise installations.
Because of the slightly customized nature of these environments, this version is only available for Docker upon request.

- Docker and Docker Compose - *available upon request*

## Downloading

Download Kilroy for your desktop:

| **O/S and CPU** | **Download Link** | **Signature** |
| ----------- | :-------------: | :-----: |
| macOS (Apple Silicon) | [download](#) { target=_blank } | TBS |
| Windows 11 (AMD/Intel) | [download](#) { target=_blank } | TBS |

## Installation

Kilroy is distributed as a .zip file, .dmg disk image, or a .exe installer, depending on your O/S platform.

### macOS

Double-click the Kilroy disk image file, and in the open window, drag the Kilroy application to your Applications folder.

### Windows

If Kilroy was downloaded as a .zip file, unarchive it and run the resulting installer application. If it was downloaded as a .exe file, run the
installer directly.

## Running for the First Time

When Kilroy opens for the first time, start by learning the dashboard and its widget windows.

1. Open the main dashboard.
2. Start one bundled app.
3. Click inside the widget window to bring it to the front.
4. Resize, tile, or stack windows as needed.
5. Use the installed apps area and app store to expand your workspace.

If the floating-window behavior is new to you, read [Working with Windows](working-with-windows.md) and [UI Basics](ui-basics.md) next.

## Installing Apps

Kilroy can install additional apps from the Kilroy app store.

- The store catalog is published online and exposed through the bundled `kilroy.appstore` app.
- When you install an app, Kilroy downloads the app package into the local apps directory.
- Installed apps live alongside bundled apps in Kilroy's platform data apps folder.

For a short guide to bundled apps and the app store flow, see [Bundled Apps](../apps/bundled-apps.md).