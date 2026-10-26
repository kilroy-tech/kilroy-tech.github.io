# Docker Installation

> **Status:** Installation steps need verification against the current Kilroy Docker release before publication as complete instructions.

Kilroy supports Docker deployments on Apple Silicon, AMD/Intel, and ARM7 systems, including Raspberry Pi devices. This guide will document the verified setup and persistent-data requirements for each supported deployment.

## Prerequisites

To be documented: supported host operating systems, Docker Engine/Desktop versions, Docker Compose requirements, image source, and architecture selection.

## Choose a Deployment Method

Document both supported workflows, if both are maintained:

- Docker Compose: compose file location, configuration, start, and stop commands.
- Docker CLI: image selection and the equivalent run, stop, and restart commands.

Do not use placeholder commands as copy-and-run instructions; verify examples against the published image and release process first.

## Configure Persistent Storage

Document which Kilroy data directories must persist, recommended host paths or named volumes, ownership and permissions, and how to verify data survives container replacement or upgrade.

## Configure and Start Kilroy

Document required environment variables, ports, initial setup, and architecture-specific notes. Identify which settings are optional and provide safe defaults where verified.

## Update, Backup, and Restore

Document how to update the image without losing persistent data, which data to back up, and the tested restore procedure.

## Troubleshooting

Add verified diagnostics for startup failures, port conflicts, storage permissions, and unsupported image/host architecture combinations.
