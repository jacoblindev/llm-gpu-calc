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

- For project pages: `https://<user>.github.io/<repo>/`
- For user/org pages or custom domains, set `VITE_BASE` to `'/'` and configure the domain in repo settings.
