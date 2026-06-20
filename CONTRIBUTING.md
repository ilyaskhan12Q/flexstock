# Contributing to FlexStock

Thank you for your interest in contributing! This document outlines the process for contributing code, documentation, and bug reports.

---

## Code of Conduct

By participating in this project you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/flexstock.git
   cd flexstock
   ```
3. **Set up the dev environment:**
   ```bash
   cp .env.example .env
   docker-compose up -d postgres
   npm install
   cd server && npx prisma migrate dev && npm run prisma:seed && cd ..
   npm run dev
   ```

---

## Branch Strategy

We follow Git Flow (adapted):

| Branch | Purpose |
|---|---|
| `main` | Production-ready code only. Tagged releases. |
| `develop` | Integration branch. All features merge here first. |
| `feature/*` | New feature work |
| `fix/*` | Bug fixes |
| `hotfix/*` | Urgent fixes on main |
| `docs/*` | Documentation-only changes |

**Never push directly to `main` or `develop`.**

---

## Commit Message Convention

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`

**Examples:**
```
feat(inventory): add real-time stock updates via Socket.IO
fix(auth): resolve JWT refresh token race condition
feat(products): implement dynamic field builder with drag-and-drop
test(api): add integration tests for stock movement endpoint
```

---

## Pull Request Process

1. Create a feature/fix branch from `develop`
2. Write or update tests for your changes
3. Ensure all tests pass: `npm test` (from `server/`)
4. Ensure the frontend builds: `npm run build` (from `client/`)
5. Open a PR against `develop` (not `main`)
6. Reference any issue the PR closes: `Closes #42`
7. Fill in the PR template completely
8. Request a review

### PR Requirements

- All CI checks must pass
- Test coverage must not decrease
- One logical change per PR (keep it focused)
- Descriptive PR title following commit convention

---

## Code Style

- **Backend (Node.js):** 2-space indentation, single quotes, semicolons
- **Frontend (React):** 2-space indentation, JSX with functional components
- ESLint is configured — run `npm run lint` before committing

---

## Reporting Bugs

Use the GitHub issue tracker. Select the **Bug Report** template and fill in all fields.

## Requesting Features

Use the **Feature Request** issue template. Describe the use case clearly.

---

Thank you for helping make FlexStock better!
