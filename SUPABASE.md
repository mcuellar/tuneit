# Supabase Workflow Cheatsheet

Keep this reference nearby when working with the TuneIt Supabase stack. It covers local-first development, database operations, and links to official docs.

## 1. Initial Setup

1. **Install the CLI** (once)
   ```bash
   npm install -g supabase
   # or
   brew install supabase/tap/supabase
   ```
2. **Authenticate** (required for remote operations)
   ```bash
   supabase login
   ```
3. **Start the local stack** (Postgres, Auth, Storage, etc.)
   ```bash
   supabase start
   ```
   - API URL and anon key are printed; copy them into `.env.local` (see README for variables).

## 2. Everyday Local Commands

| Action | Command | Notes |
| --- | --- | --- |
| Start containers | `supabase start` | Runs everything via Docker; keep it running while developing. |
| Stop containers | `supabase stop` | Use `--all` to remove the network/volumes. |
| Check status | `supabase status` | Shows URLs, anon key, and health. |
| Apply migrations | `supabase db up` | Apply pending migrations to local database. |
| Reset database | `supabase db reset` | Drops and recreates, then reapplies every migration + seeds. |
| Open SQL prompt | `supabase db query` | Run ad-hoc SQL against the local DB. |

## 3. Working With Migrations

1. **Create a migration**
   ```bash
   supabase migration new add_my_table
   ```
2. Edit the generated SQL under `supabase/migrations/`.
3. **Apply to local DB**
   ```bash
   supabase db push
   ```
4. Verify via Supabase Studio (`supabase status` shows the Studio URL) or run `supabase db query "select * from ..."`.

## 4. Deploying to a Remote Project

> ⚠️ **Be intentional**: Remote pushes affect production data. Double-check the project you’re targeting.

1. Log in (`supabase login`) and set the project ref if prompted.
2. Run migrations against the remote database:
   ```bash
   supabase db push --project-ref <your-project-ref>
   ```
3. To inspect or back up remote data, use `supabase db dump` or connect via standard Postgres tooling with the connection string from the Supabase dashboard.

## 5. Helpful References

- Supabase CLI reference: https://supabase.com/docs/reference/cli/introduction
- Local development guide: https://supabase.com/docs/guides/local-development
- Auth configuration: https://supabase.com/docs/guides/auth
- Database migrations: https://supabase.com/docs/guides/database

## 6. Troubleshooting Tips

- **Containers stuck**: `supabase stop --all && supabase start`.
- **Env mismatch**: After editing `.env.local`, restart `npm run dev`.
- **Migration issues**: Check `supabase/.temp/cli-latest/logs` for SQL errors, or run the SQL manually via `supabase db query` to identify the failing statement.

With these commands and links, you can confidently manage both local and remote Supabase environments for TuneIt.
