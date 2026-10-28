# Basic Task Application with Spring, Vue.js and Third-Party OAuth-Login

[demo.webm](https://github.com/user-attachments/assets/6c26e0ed-773d-452d-ba82-b4707bd5ef49)

## Tests

Backend (includes migration tests against PostgreSQL 15 in Docker; they are skipped without Docker):

```bash
./mvnw test
```

Browser tests (Playwright against the built frontend and a mock API in `task-frontend/e2e/mock-server.mjs`):

```bash
cd task-frontend
npx playwright install chromium   # once; or set CHROMIUM_PATH to a local Chromium
npm run test:e2e
```

Both run in GitHub Actions on pull requests and before every deploy (`.github/workflows/tests.yml`).

## Database changes

The schema is managed by Flyway (`src/main/resources/db/migration`). Hibernate only validates it,
so a new or changed entity field needs a new migration `V<n>__<description>.sql`.
