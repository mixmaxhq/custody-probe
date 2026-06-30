# custody-probe — repo card

> A map, not a manual. Keep it ~1 screen; point to detail, don't inline it.

## What it is
`@custody/probe` is a tiny Node.js library embedded in Mixmax microservices during local development. It writes a statefile to disk so that [`custody`](https://github.com/mixmaxhq/custody) (the Supervisor front-end) can report the true state of child processes (RUNNING / FATAL), not just the parent build process that Supervisor directly controls.

## serves
role: dev-time library that bridges a Node child-process's lifecycle to the custody process-monitor via statefiles on disk
referenced-by: [any Mixmax Node service running under custody/Supervisor in local dev; custody CLI (@custody/cli); custody-plugin-command-start-debugger]

## Code map
- Entry point -> `src/index.js`  (exports `initializeProbe(name)`)
- Package manifest -> `package.json`  (published as `@custody/probe`)

## Conventions
- CommonJS (`require`/`module.exports`) — no TypeScript, no bundler
- Statefile path controlled by `CUSTODY_PROC_DIR` env var (default `/usr/local/var/custody/services`)
- `STATEFILE_EXT` (`.statefile`) and state names (`RUNNING`, `FATAL`) must stay in sync with the `custody` monorepo
- No automated tests — CI runs lint only (`npm run ci`)

## Gotchas
- Intended as a **dev-only** dependency; always guard with `NODE_ENV === 'development'` in the consuming service
- Register the probe in **exactly one process per Supervisor program**; multiple probes for the same program name overwrite each other's statefile
- The `SIGUSR1` override assigns a dynamic debug port (0) by default — `chrome://inspect` won't discover it without clicking "Configure" to add the dynamic port; set `CUSTODY_CHOOSE_DEBUG_PORT_DYNAMICALLY=false` to revert to the static `process.debugPort`

## Run / test
```sh
npm install
npm run lint        # ESLint — the only CI check
# No automated tests exist; manual verification requires a custody + Supervisor setup
```

## Load the matching domain card
This repo is cross-cutting dev tooling — it owns no product domain, so there is no domain card to load. When working here, load the card of the consuming service/domain if the change is driven by its needs.
