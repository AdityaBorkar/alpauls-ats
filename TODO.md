# TODO

- "/" - Fix Forms and solve for React Scan

- GOAL: Add expect and create a test to test filters, display and search "data-view-layout"
- Single line Audit Log
- Add the buttons are ghost-styled links

---

## Search

- actions
- pg_vector bm25 + full text search

## Shortcuts

- Re-using Browser Specific
  - ALT + (-> / <-) = Pages Back / Forward
  - CTRL + P = Print Layout
- Globals
  - CTRL + K = Command Palette
  - CTRL + N = Command Palette (New)
  - Function Keys to navigate navbar
  - (PRESS & HOLD) ALT + ? = Page Help Overlay
  - (PRESS & HOLD) CTRL + ? = Global Help Overlay
- Filter Views
  - Numbers to navigate Filter Views / Alt+Number
  - Type to search in the view
  - ESC = Domain Back
  - Alt + F = Filter
  - Alt + D = Display
  - Alt + S = Search
  - Alt + N = New
  - Alt + V = New View

---

Run daily DB dumps off-host (cron on the VM running a script that dumps, encrypts, and uploads).
- Backblaze B2 backups everyday 3AM
- Retention for 15 days
- Encryption
systemd timers
cron

restic/rclone

A backup is not valid until restore-tested.

Regularly test:
docker volume create restore_test
docker run --rm \
  -v restore_test:/target \
  -v $(pwd):/backup \
  alpine \
  tar xzf /backup/postgres_data.tar.gz -C /target

Enable Caddy’s automatic HTTPS and set appropriate timeouts for long-running requests if your power users do big imports/exports.

Use an image and PULL from github/remote-desktop and BUILD and PUBLISH

---

## Monitoring

- Netdata
- Dozzle
- Uptime Kuma
- Coolify
- Signoz

- /opt/caddy
- /opt/system-manager
- /opt/apps
  - alpauls-ats-0-0-1
  - alpauls-ats-0-0-2
  - alpauls-ats-0-0-3
  - Once all traffic is NULL and 48 hours have been passed, delete the old app.

Cookie

Debian
  ↓
Caddy
  ↓
Version-aware reverse proxy
  ↓
systemd-managed immutable app releases
  ↓
Shared DB/Redis

## Session Compatibility

Critical requirement:

Sessions must remain compatible across versions.

Avoid:

changing session serialization abruptly
incompatible auth token formats
breaking API contracts instantly

Prefer:

backward-compatible deployments
additive schema evolution

Skew protection reduces failures but does not eliminate compatibility requirements.

## Database Migration Strategy

Bad:

Deploy app requiring new DB column immediately

Good:

Add nullable column
Deploy compatible app
Backfill
Switch reads
Remove legacy later

Classic expand-contract migration pattern.

----

When to separate VM for DB and app:

- Allowing API access to external apps/clients
- The free limit has surpassed (4 OCPU + 24 GB RAM)
- The app slows down during DB maintenance or backup windows.
- The app needs multiple replicas (horizontal scaling) to handle concurrent requests, but the database does not.
- You need to move the app to a different machine type (e.g., compute-optimised) while the DB stays on a memory‑ or IO‑optimised instance. You can’t do that on one VM.
- You need database replication (standby, streaming replica) for failover. That demands at least two machines.
- Regulations like PCI DSS, HIPAA, or internal security policies often require the database to be in a separate network segment with stricter firewall rules.
