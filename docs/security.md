# Security checks and accepted risks

CI runs these checks on every push and pull request (`.github/workflows/ci.yml`). A failing job marks the commit red and blocks merging into `main`.

| Check | Tool | Blocks the build when |
|---|---|---|
| Python formatting and lint | ruff | any finding |
| Python types (allocation package) | mypy | any error |
| Python dependencies | pip-audit (pinned `services/api/requirements.txt`) | any known vulnerability |
| Python code | bandit | medium or high severity |
| Web dependencies, shipped | npm audit `--omit=dev` | critical |
| Web dependencies, all | npm audit | high (reported, does not block) |
| Committed secrets | gitleaks | any finding |
| Container images | Trivy | critical with an available fix |

## Accepted risks (recorded so reviewers can see them)

- **Next.js 15.5.26, moderate and high (PostCSS inside Next's bundle).** The fix is Next 16, a breaking upgrade. It is not in the shipped code path for untrusted CSS input, and the upgrade is planned after submission. The production audit gates only on critical findings for this reason.
- **Dev-only tools (`eslint-config-next`, `vitest`, `vite`).** High and critical findings in build and test tooling. They do not run in the deployed app. Upgrading them is a separate change.
- **`/demo/info` publishes the four demo accounts and passwords.** This is deliberate, so the judges can sign in without reading the repository. The same credentials are in the README. Remove the endpoint or restrict it before using real accounts.
- **The driver PIN is four digits.** It only unlocks the phone's cached run; the server never sees it (see `design-departures.md`).
