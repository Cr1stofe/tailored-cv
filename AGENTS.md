<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

## Project engineering guidelines

### Scope and planning

- Keep each change focused on the requested behavior and avoid unrelated refactors.
- Create a dedicated branch for meaningful features, for example `feat/async-tailoring-generation`.
- Use the existing branch when making small, localized fixes unless isolating the change improves review or rollback.
- Before editing, identify the affected application, package, infrastructure, contracts, and tests.

### Implementation quality

- Preserve existing API contracts and compatibility unless the change explicitly requires an update.
- Prefer small, cohesive modules with clear responsibilities over large files with mixed concerns.
- Keep business rules deterministic where possible and validate external or AI-generated data at boundaries.
- Never invent user data, credentials, metrics, or domain facts.
- Do not expose secrets, personal data, authorization headers, cookies, prompts, or sensitive request bodies in logs.
- Do not version `.env` files, generated personal data, or local development artifacts.

### Commits and pull requests

- Keep commits small and logically cohesive; do not split trivial edits into artificial commits.
- For multi-layer features, prefer several strategic commits by concern (for example: persistence/backend, contracts/frontend, and documentation/tests) so each commit is reviewable and revertible; avoid large all-in-one commits.
- Use English for commit messages, pull request titles, pull request descriptions, and other GitHub-facing change documentation.
- Use clear conventional commit messages that describe the user-visible or operational change.
- Before opening a pull request, review the diff for scope, accidental files, secrets, and generated artifacts.
- Pull request descriptions should summarize the change, risks, migrations, operational impact, and validation performed.
- Pull request titles and descriptions must reflect the actual changes present in the diff; do not use broader, narrower, or generic wording that misrepresents the scope.

### Validation requirements

- Add or update tests for changed behavior, including regression tests for reported bugs.
- Run the narrowest relevant tests first, then typecheck, lint, build, and infrastructure validation as applicable.
- Before creating any commit or pull request, run the complete CI validation locally: `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, all three Docker Compose `config --quiet` validations from `.github/workflows/ci.yml`, and `pnpm build`.
- If a CI check fails, fix it and rerun the complete CI validation before committing or updating a pull request.
- For database changes, review the migration, generated client requirements, startup behavior, and rollback implications.
- For Docker or deployment changes, validate Compose configuration and document any required environment variables or manual production steps.
- For frontend changes, verify loading, success, error, empty, keyboard, accessibility, and mobile states when relevant.
- Do not mark work complete while known required checks are failing; report unavoidable limitations explicitly.

### Operational safety

- Prefer reversible changes and read-only inspection before destructive operations.
- Do not reset, discard, or overwrite unrelated user changes.
- Keep observability consistent with the feature: add useful structured logs, metrics, and error context without leaking sensitive data.
- Update relevant documentation when behavior, deployment, configuration, or troubleshooting procedures change.
