# Contributing to Zublo

Thanks for considering a contribution to Zublo.

This project is still in an early open-source phase, so the best contributions are the ones that improve clarity, onboarding, reliability of the repository, and focused product behavior without creating large review overhead.

## Before You Start

- Search existing issues and pull requests before opening a new one
- For larger changes, open an issue first so the change can be discussed before implementation
- Keep public discussion and documentation in English when possible
- Avoid mixing unrelated changes in the same pull request

## Good First Contributions

- README and documentation improvements
- Reproducible bug reports with clear steps
- Small UX fixes with a narrow blast radius
- Cleanup of repository metadata and developer workflows
- Tests or validation improvements that support an existing behavior

## Local Setup

### Docker workflow

```bash
cp .env.example .env
make up
```

### Local development workflow

```bash
bun install
bun run dev
```

For non-Docker development, the repository expects a PocketBase binary at `apps/backend/pocketbase`.

## Project Layout

- `apps/web`: React frontend
- `apps/backend`: PocketBase hooks, migrations, runtime assets, and application knowledge files
- `scripts`: maintainer utilities

Read the architecture and runtime overview in [README.md](./README.md) before making structural changes.

## Pull Request Expectations

Each pull request should:

- have a clear and narrow purpose
- explain why the change is needed
- describe user-visible impact if any
- include documentation updates when behavior, setup, or contributor workflow changes
- avoid unrelated formatting-only churn

Before opening a pull request, run the relevant checks:

```bash
bun run lint
bun run build
```

## Test Coverage Requirement

All pull requests must maintain 100% test coverage across both frontend and backend. This is enforced automatically by the CI workflow on every PR — it will block merge if coverage drops.

To verify locally before opening a PR:

```bash
# Run both suites with coverage
bun run test:coverage

# Or individually
bun run test:front:coverage   # React frontend (Vitest + v8)
bun run test:back:coverage    # PocketBase hooks (Vitest + v8)
```

Coverage thresholds (lines, functions, branches, statements) are set to 100% in:

- `apps/web/vite.config.ts` — frontend
- `apps/backend/vitest.config.mjs` — backend

If your change adds new code, it must be covered. If it modifies existing behavior, update the relevant tests.

If your change is frontend-heavy or reorganizes feature modules, also review [apps/web/ARCHITECTURE.md](./apps/web/ARCHITECTURE.md).

## Repository Hygiene

Please do not commit:

- secrets or filled `.env` files
- local databases
- generated archives such as `zublo.tar`
- personal IDE settings
- unrelated lockfile churn outside the scope of your change

## Documentation Standards

- Keep contributor-facing docs in Markdown
- Prefer concise, direct instructions over long prose
- Update the root `README.md` when the onboarding path changes
- Keep repository-level documentation centralized in `README.md` unless the maintainer explicitly introduces a separate public doc file

## Review Notes

Maintainers may ask contributors to:

- split a pull request into smaller pieces
- add missing documentation
- narrow the scope of a proposed feature
- move broad product discussion back into an issue

That is normal and intended to keep the repository approachable.
