# Internal Lead Enrichment Tool

A local-first lead enrichment workflow that lets you import CSV leads, enrich them using a deterministic provider waterfall, and export enriched results.

## Prerequisites

- **Node.js 20+** (recommended: latest active LTS)
- npm 10+ (comes with recent Node versions)
- A local database supported by Prisma (default setup usually uses SQLite for local dev)
- An OpenAI API key for AI-assisted enrichment fallbacks

Check your Node version:

```bash
node -v
```

## Install

Install dependencies from the project root:

```bash
npm install
```

## Environment setup

1. Copy environment template (if not already present):

   ```bash
   cp .env.example .env
   ```

2. Add your OpenAI key in `.env`:

   ```env
   OPENAI_API_KEY=sk-...
   ```

3. Add/update any app-specific variables required by your local setup (database URL, app URL, etc.).

## Prisma setup (migrate + generate)

Run Prisma migrations and regenerate the client whenever schema changes are pulled:

```bash
npx prisma migrate dev
npx prisma generate
```

If this is your first setup or you need to reset local data during development:

```bash
npx prisma migrate reset
npx prisma generate
```

## Run the dev server

Start the local application:

```bash
npm run dev
```

Then open the app in your browser at the URL shown in terminal output (commonly `http://localhost:3000`).

## CSV import / enrich / export workflow

### 1) Import CSV

- Use the app's CSV upload/import UI.
- Include a header row with the lead fields expected by the app (for example: name, email, company, website, LinkedIn).
- Keep column names stable between imports to avoid mapping drift.

### 2) Enrich leads

- Run enrichment from the UI/API after import completes.
- Enrichment follows a **deterministic waterfall** strategy (providers are attempted in a fixed order; once sufficient data is found, lower-priority providers are skipped).
- Batch processing is **rate-limited to 1 row every 5 seconds** to reduce provider throttling risk and make retries predictable.

### 3) Export enriched CSV

- Trigger export from the UI once enrichment finishes.
- Export includes original source columns plus enriched fields.
- If some rows fail enrichment, export still succeeds with partial results for completed rows.

## Usage notes

- If OpenAI is not configured, AI fallback steps will fail; deterministic non-AI providers may still populate partial data.
- For large datasets, expect enrichment to take time due to the deliberate 5-second row pacing.
- Re-running enrichment on previously processed rows should preserve deterministic ordering and produce stable behavior when source data has not changed.

## Known limitations and next steps

- Current pacing is intentionally conservative (1 row/5s). Future improvements can add adaptive backoff and provider-specific concurrency controls.
- Deterministic waterfall behavior favors predictability over maximum throughput; introducing caching and provider health scoring can improve speed.
- Retry visibility can be expanded with per-row progress metadata and resumable jobs.
