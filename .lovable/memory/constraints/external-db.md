---
name: External Supabase DB validation
description: Always validate code changes against the external Supabase database, not the Lovable Cloud one
type: constraint
---
This project uses an **external Supabase database** (`npinawelxdtsrcvzzvvs.supabase.co`) via `src/lib/supabaseExternal.ts`.

All client-side queries go to this external DB. When adding new columns or tables:
- The migration tool only affects the Lovable Cloud DB, NOT the external one.
- New columns in `.select()` queries will cause 400 errors if the external DB hasn't been updated manually.
- Always use fallback/resilient patterns: either omit new columns from selects, or handle errors gracefully.
- Tell the user to run the SQL migration manually on their external Supabase project.
- Never assume a migration applied here will be available in the external DB.
