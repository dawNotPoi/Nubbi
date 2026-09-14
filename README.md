# Nubbi

Nubbi is a full-stack knowledge workspace for organizing notes, files, and collaborative meetings in one place.

> Personal project · actively evolving · APIs and deployment details may change.

## What it includes

- Hierarchical notes with rich-text editing and Markdown import
- File storage with chunked upload, resume, instant-upload checks, and upload task tracking
- Searchable note and file workflows
- Real-time meetings with Socket.IO and WebRTC
- Authentication with email verification, password reset, and OAuth providers
- A modular foundation for AI-assisted knowledge workflows

## Architecture

```text
client/   React + TypeScript + Vite application
server/   Node.js + TypeScript API and realtime services
docs/     Feature PRDs, deployment notes, and engineering records
scripts/  Preflight checks and Docker deployment helpers
```

## Tech stack

### Client

- React, TypeScript, Vite
- Tiptap, React Router, Jotai
- Ant Design, Tailwind CSS
- Socket.IO Client, WebRTC

### Server

- Node.js, TypeScript, Express
- MongoDB, Mongoose
- Better Auth
- Socket.IO, Nodemailer, Zod

### Tooling

- pnpm
- Docker Compose
- GitHub Actions

## Local development

Requirements: Node.js 20+, pnpm 10+, and Docker when running MongoDB locally.

```bash
git clone https://github.com/dawNotPoi/Nubbi.git
cd Nubbi

cp client/.env.example client/.env
cp server/.example.env server/.env
```

Fill in the required values in `server/.env` before starting the server. In particular, configure MongoDB, Better Auth, OAuth, and mail credentials for the flows you want to use.

Install dependencies and start the two services in separate terminals:

```bash
pnpm --dir client install
pnpm --dir server install

pnpm client
pnpm server
```

For a containerized local environment, review `docker-compose.yml` and `docs/deployment.md` first. Never commit `.env` files, OAuth secrets, SMTP passwords, database credentials, or provider API keys.

## Project layout

| Directory | Purpose |
| --- | --- |
| `client/` | Web application and user-facing workflows |
| `server/` | API, authentication, persistence, and realtime services |
| `docs/` | Feature design notes and implementation records |
| `scripts/` | Preflight and deployment helpers |

## Status

Nubbi is a personal full-stack project and a working laboratory for knowledge-management, collaboration, and AI-assisted workflows. Contributions and architecture are expected to evolve as the project grows.

## License

ISC