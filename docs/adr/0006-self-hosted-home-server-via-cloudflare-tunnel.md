# The server is self-hosted at home, exposed through Cloudflare Tunnel

The backend (TypeScript on Node, Postgres, S3-compatible storage for Scans, and the Conversion worker) runs on a home machine with Docker Compose, not on a hosted platform such as Supabase or a cloud VPS. It is reached at a public HTTPS domain through Cloudflare Tunnel, so the web version and Google sign-in work from any computer without opening router ports. We chose this for zero hosting cost and full control. The server shares the Notation model and sync rules with the app as the same TypeScript code.

## Consequences

- Nightly database and storage backups must go off-site (Cloudflare R2 or Backblaze B2). A single home disk is the only server-side copy.
- When the home machine is down, devices keep working local-first, and sync, Conversion and the web version's first load wait until it's back.
