# Kilroy Platform Overview (Working Notes)

This document captures a cross-project architecture snapshot of the current multi-root workspace:

- `kilroy-tech.github.io` — public documentation site (MkDocs Material, published to docs.kilroy.tech)
- `kilroy.backend` — platform runtime (Node/Express + Electron + Docker + scheduler)
- `kilroy.ui` — Vue 3 front-end app that runs on the Kilroy platform

It is intended as a living reference for future development tasks.

> **Note:** This file lives in `docs/copilot/` and is intentionally NOT connected to the MkDocs nav. It contains internal working notes that should not be published.

## What is Kilroy? (from official docs)

Kilroy is a **desktop-first, double-clickable application** that lets users build, automate, launch, and share apps, AI solutions, and DeFi strategies with **no code required**. Key concepts from the public docs:

- **Apps** are self-contained JSON-driven packages (manifest + process diagrams + workflows + public assets) distributed as digitally signed zip archives, installable via the Kilroy App Store.
- **Swarms** are self-organizing, peer-to-peer, end-to-end encrypted communication channels. Two Kilroy instances using the same swarm name connect directly with no servers in between, no static IPs, no firewall edits.
- **Pipelines** compose agents (AI, WF, viewer, chat, webhook) into data-processing chains that communicate over swarms. The `kilroy.ai.services` app provides a 100% visual pipeline editor.
- **Process Diagrams (PDs)** define the UI layout of a running app widget — nodes, buttons, images, iframes, data views, forms — and are updated in real time via pubsub.
- **Workflows** are block-based or JS-scripted automations triggered by PD node actions. Each workflow step can display forms, call webhooks, manipulate data, and publish results.
- Runtime targets: macOS (Apple Silicon, Intel planned), Windows 11, Linux (Ubuntu planned), Docker (Intel/AMD, ARM, ARM7).

## Workspace-Level Summary

- `kilroy.backend` is the runtime host and platform substrate (Node/Express + Electron-capable combined runtime + scheduler support).
- `kilroy.backend/api/platform_data/demo/apps` contains app packages/projects and runtime app data, including `kilroy.ai.services` and packaged artifacts like `kilroy.ui.zip`.
- `kilroy.ui` is a Vue 3 app that talks to backend HTTP endpoints and subscribes to backend pubsub channels via Faye.
- `kilroy-tech.github.io` is the **primary public documentation** site (MkDocs Material, at `docs.kilroy.tech`).

## `kilroy-tech.github.io` (Primary Documentation)

Location: `/Users/cshotton/ownCloud/Documents/projects/kilroy-tech.github.io`

- **Generator**: MkDocs with Material theme; config in `mkdocs.yml`.
- **Published URL**: `https://docs.kilroy.tech/`
- **CI**: GitHub Actions workflow in `.github/workflows/ci.yml`.

### Content inventory (as of last scan)

| Section | File | Status |
|---|---|---|
| Home / landing | `docs/index.md` | Written — describes Kilroy's purpose, uses, and links |
| Introduction | `docs/getting-started/introduction.md` | Written — swarms, privacy, agents & apps overview |
| Quick Start | `docs/getting-started/quick-start.md` | Written — platform requirements, download matrix, install steps (some sections still headings-only) |
| Installation | `docs/getting-started/installation.md` | Stub — headings only |
| Technical Overview | `docs/developers/technical.md` | Stub — heading only |
| Creating Apps | `docs/developers/apps.md` | Partially written — manifest format, code snippets, section headings for PDs/workflows/public/build |
| FAQ | `docs/faq.md` | Stub — heading only |
| About / Philosophy / Team / Contact | `docs/about/*.md` | Stubs — headings only |
| Tutorials | `docs/tutorials/` | Empty folder; `mkdocs.yml` references `tutorial1.md` and `tutorial2.md` that don't exist yet |

### Key concepts documented

- **Manifest file** (`manifest.json`): `manifestVersion`, `id`, `displayName`, `pdClasses` with lifecycle hooks (`init`, `resume`, `pause`, `stop`), alias naming, visibility, and multi-instance control.
- **App packaging**: self-contained zip archive containing manifest + process_diagrams + workflows + public folder.
- **Swarm networking**: peer-to-peer, end-to-end encrypted, no static IP/firewall required, self-organizing.
- **Agent types** listed: AI agents, WF agents, viewer agents, chat agents, webhook agents.
- **Pipeline editor**: drag-and-drop visual composition of agent pipelines.
- **Block-based programming**: Blockly-style visual workflow editor with JS escape hatch.
- **Preflight/postflight pattern**: `script.js` files in workflow payloads export `preflight(authData, wfProxy)` and `postflight(...)` hooks.

## `kilroy.backend` Architecture Notes

### Entrypoints and Runtime Modes

Primary entrypoints in `api/`:

- `main.js` (backend server)
- `main_sched.js` (scheduler)
- `main_combined.js` (combined backend + scheduler; package `main` points here)

`main_combined.js` initializes:

- global runtime namespace via `global.REBAR_NAMESPACE`
- environment/path preflight (Node/Docker/Electron packaged/dev)
- first-run/update installation from zipped platform data
- pubsub provider and node registration/master election
- Express server + route mounting + static/public app serving

### Service Discovery and Paths

- `api/modules/util/service_discovery.js` centralizes path/url resolution and env-aware behavior.
- `api/discovery/services.js` defines default keys including:
  - `API_VERSION_PREFIX` = `/api/v1`
  - default pubsub service/server keys
  - platform data, db, apps, workflows, and public path conventions

### Route Mounting and API Surface

In `main_combined.js`, core routes mount at `API_VERSION_PREFIX`, e.g.:

- `/api/v1/auth`
- `/api/v1/admin`
- `/api/v1/pd`
- `/api/v1/wf`
- plus `activities`, `appservices`, `config`, `editor`, `panel`, etc.

Additionally:

- `/apps` serves app public files/folders.
- `globalAPI` can serve UI fallback behavior (including packaged UI behavior).

### PubSub

- `api/modules/util/pubsub.js` abstracts pubsub provider selection (`faye`/`crossbar`), defaulting to configured provider from discovery.
- `pubsub.Init(server)` is called during `main_combined` startup to wire realtime services.
- Backend admin broadcasts are published on `admin_broadcast` channel (used by UI).

### Platform Data and App Projects

Important path:

- `api/platform_data/demo/apps`

Contains many Kilroy app projects and packaged zips, including:

- `kilroy.ai.services/`
- `kilroy.ui.zip`
- multiple service apps (`miniflux.services`, `telegram.services`, etc.)

This folder is both app catalog/runtime data and packaging target in current workflows.

## `kilroy.ai.services` (inside backend platform data)

Location:

- `kilroy.backend/api/platform_data/demo/apps/kilroy.ai.services`

Structure:

- `manifest.json`
- `process_diagrams/`
- `workflows/`
- `public/`

Manifest confirms app identity and classes:

- app id: `kilroy.ai.services`
- includes pd classes such as `manager`, `pipeline`, `ai_agent`, `wf_agent`, `viewer_agent`, `chat_agent`, `webhooks`
- `manager` and `webhooks` are configured `runOnStart: true`

`public/README.md` describes the intended pipeline model:

- WF agents + AI agents + viewer/chat/webhook agents
- swarm-based messaging
- OpenAI-compatible endpoint integration pattern

This app appears to function as a primary AI pipeline/agent orchestration app in the Kilroy ecosystem.

## `kilroy.ui` Architecture Notes

### Stack and Build/Packaging

- Vue 3 + TypeScript + Vite + Tailwind/DaisyUI.
- Runtime build scripts include `create-kilroy-app`, which packages UI output into `kilroy.ui.zip` and copies it to:
  - `../kilroy.backend/api/platform_data/demo/apps/`

### Backend HTTP Integration

- `src/utils/api.ts` posts JSON to `VITE_SERVICE_ENDPOINT` and injects/rotates `auth_token` via `window.AUTH_TOKEN`.
- Typical local dev endpoint script points to:
  - `http://localhost:3000/api/v1`

### Auth Integration

- `src/utils/auth.ts` uses backend auth routes:
  - `/auth/authenticate`
  - `/auth/validate`
  - `/auth/deauthenticate`
  - `/auth/authFirstPD`
  - `/auth/authAppDashboardPD`
- Cookie-based remember-me support stores/reloads auth token (`rememberme`).

### PubSub Integration (Faye)

- Faye client URL from `VITE_PUBSUB_URL`.
- Dashboard subscribes to `/admin_broadcast` for backend status/events.
- Process Diagram component subscribes to per-diagram channel `/${id}` (with `-` converted to `_`) and reacts to `UPDATE_NODES` messages.

## Cross-Project Interaction Map

Primary flow observed:

1. Backend (`main_combined`) starts and mounts `/api/v1/*` routes and pubsub.
2. UI authenticates through backend auth routes and stores rolling auth token.
3. UI invokes backend process-diagram/workflow endpoints (`/pd/*`, `/wf/*`, etc.).
4. Backend pushes realtime updates over pubsub channels consumed by UI via Faye.
5. UI can be packaged and deployed as a Kilroy app artifact (`kilroy.ui.zip`) into backend platform data apps.
6. `kilroy.ai.services` runs as a backend-managed app project in platform data and participates in workflow/pipeline ecosystem used by UI and other apps.

## Current Known Gaps / Caveats

- Some backend admin routes still contain permissive TODO logic (`if (true || auth_data.valid)` patterns) and should be treated carefully in production-hardening discussions.
- There appears to be both source-style app folders and zip artifacts in platform app storage; deployment precedence and load order should be confirmed when needed.

## Suggested Next Deep-Dive Areas

When needed, expand this document with:

- detailed `platform_data/database` schema and lifecycle
- precise app loading/manifest precedence rules (folder vs zip)
- workflow runtime internals (`wfOps`, script cache, workflow proxy)
- explicit message schemas for pubsub channels used by `kilroy.ui` and `kilroy.ai.services`
- security model for temporary/server auth flows used by first-run/dashboard
