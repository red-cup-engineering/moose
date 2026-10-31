# AGENTS.md

MOOSE (MUD, Object Oriented, Socially Extended) is the 561 Group's
ActivityPub++ package, `@red-cup-engineering/moose`. Read
[README.md](README.md) first. Its "The MOOSE stack" section lists the
repositories MOOSE builds on, what each owns, where each is mounted, and who
consumes MOOSE.

## Working here

- Node 24 or later. ES modules only. No build step, workspace or lockfile.
- One branch, `main`. Work on a branch and open a pull request against it.
- Install from the house registry: `npm install --registry=https://registry.561.group`.
  Never commit registry credentials.
- Tests:
  - `npm test` runs the whole suite. It needs the full install, including the
    optional peers that are also devDependencies.
  - `npm run test:fetch`, `test:gateway`, `test:world` and `test:pack` run
    subsets.
  - The `source-contract` CI job's tests need no install:
    `node --test test/fetch-dependency.test.mjs test/section-site.test.mjs test/resource-readout.test.mjs test/source-page-routes.test.mjs test/pack-contract.test.mjs`.
- CI is [`.github/workflows/fetch-dependency.yml`](.github/workflows/fetch-dependency.yml)
  and runs on changes to `src/**`, `test/**` or `package.json`. Its jobs are
  `source-contract`, `world-gateway`, `world-history` and `installed-host`,
  which runs the whole suite. A failure inside `npm install` (registry HTTP 429
  or 500) is a registry fault, not a test failure. Rerun the job.

## Boundaries

- `./fetch` and `src/source-application.mjs` must not import `node:` modules,
  ActivityPub Server, CAIRN or the World modules. `test/fetch-dependency.test.mjs`
  pins the exact runtime dependency set.
- Hosting and federation packages stay exact optional peers.
- Changes to Living Web Server, TUFTE, CAIRN, SignCraft or ActivityPub belong in
  their own repositories. Consumer tests (FeltOS, ASSIST) stay in the consumer's
  repository.
