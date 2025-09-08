# LLM GPU Calculator

A calculator to visualize GPU vRAM usages with LLM deployment via vLLM.

## Start Here

- Read `AGENTS.md` for the overview and rhythm.
- Follow the rules in:
  - `rules/create-prd.md`
  - `rules/generate-tasks.md`
  - `rules/process-task-list.md`

## Dependency Policy

- Runtime deps require an ADR and approval (see `docs/adr/ADR-0004-dependency-policy.md`).
- Initial stack approved in ADR-0001 (Vue/Pinia/Vite) and ADR-0003 (Tailwind CSS).

## Development

- Install: `npm ci`
- Dev server: `npm run dev`
- Typecheck: `npm run typecheck`
- Test: `npm test`
- Build: `npm run build` (outputs `dist/`)
- Preview: `npm run preview`

## CI/CD and GitHub Pages

This project uses GitHub Actions for CI and GitHub Pages for hosting.

- CI (`.github/workflows/ci.yml`): runs on PRs and pushes to `main` and executes `npm ci`, `npm run typecheck`, and `npm test` on Node 20.
- Pages deploy (`.github/workflows/deploy-pages.yml`): runs on pushes to `main`, builds the app, uploads `dist/` as an artifact, and deploys to Pages.

Repository settings:

- Settings → Pages → Source: GitHub Actions.
- Environment: `github-pages` (created automatically by the deploy job).

Vite base path for Pages:

- The Vite `base` is inferred as `/${repo}/` during GitHub Actions builds and `'/'` locally.
- To override, set `VITE_BASE` (e.g., for custom domains or user/organization sites):
  - Locally: `VITE_BASE=/ npm run build`
  - In Actions: add `env: { VITE_BASE: '/custom/' }` to the Build step.

Deployment URL:

- For project pages: `https://jacoblindev.github.io/llm-gpu-calc/`

## Versioning & Releases (v1)

- Policy: SemVer app version in `package.json`; tags `vX.Y.Z`; Pages deploys on every push to `main`.
- Branching: Trunk‑based on `main` with short‑lived feature branches via PR. `develop` is optional; if used, merge `main` → `develop` after releases.

GitHub UI flow (no local CLI required):

1) Bump the version
   - Open `package.json` in the web UI → Edit `version` → propose changes to a new branch → open PR to `main`.
   - Wait for CI to pass, then merge into `main`.

2) Tag the release
   - Go to Releases → “Draft a new release”.
   - Choose a tag → “Create new tag” (e.g., `v1.0.1`) targeting the merge commit on `main` → Publish.

3) Deploy
   - Pages deployment runs automatically on `main`; no extra steps.

4) Optional: keep `develop` in sync
   - Open a PR `main` → `develop` and merge.

CLI alternative (equivalent):

```sh
# from a clean main
npm version patch   # or minor|major
git push --follow-tags
```
