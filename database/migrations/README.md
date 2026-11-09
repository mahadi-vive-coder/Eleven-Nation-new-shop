# Eleven Nation Database Setup & Lifecycle

## Fresh Production Deployment Notice

The Eleven Nation production database is a brand-new Supabase PostgreSQL 15+ database.
**No legacy migration is needed or executed.**

### Authoritative Installation File
To deploy the database, execute the single standalone script:
`/database/sql/eleven_nation_final_fresh_install.sql`

All previous/legacy migrations and prototypes have been moved to:
`/archive/legacy-not-for-execution/`
