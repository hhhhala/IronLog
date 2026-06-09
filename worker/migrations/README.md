# D1 Migrations

Run migrations in order against the production database:

```bash
cd worker
npx wrangler d1 execute ironlog-db --file=migrations/001_add_deepseek_api_key.sql
```

For local development:
```bash
npx wrangler d1 execute ironlog-db --file=migrations/001_add_deepseek_api_key.sql --local
```
