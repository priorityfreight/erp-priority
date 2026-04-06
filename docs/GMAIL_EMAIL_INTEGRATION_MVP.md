# Gmail Email Integration MVP

## Goal
- Provide an Outlook-like inbox inside the ERP using Gmail as the source of truth.
- Avoid duplicating full mailbox storage.
- Keep incremental cost near zero by avoiding Nylas, Pub/Sub, and Google Cloud usage-based services.

## Scope
- Shared mailboxes first.
- Gmail API only.
- Lightweight local index in Supabase for fast inbox rendering.
- Full thread body fetched on demand when a user opens a conversation.
- Reply from inside the ERP on existing threads.
- Embedded email tabs in quotations and clients.

## Required Environment Variables
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `MAIL_ENCRYPTION_KEY`
- `CRON_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

## Operational Model
- `manual` sync:
  - Admin or authorized user triggers sync from the inbox UI.
- `polling` sync:
  - A protected cron request hits `/api/cron/mail-sync`.
  - Only mailboxes marked as `polling` are refreshed.
- Gmail remains the source of truth:
  - We store metadata, snippets, labels, timestamps, participants, and ERP links.
  - We do not persist full MIME payloads or attachment binaries.

## Linking Rules
- Primary automatic link:
  - quotation reference in subject, for example `QPRIAIR-000001`
- Secondary automatic link:
  - shipment reference in subject, for example `SHP-20260405-ABC123`
- Supporting context link:
  - contact email matches known CRM contacts
- Domain-only matching is intentionally excluded from automatic linking to reduce false positives.

## Security Model
- Gmail authentication uses OAuth.
- Refresh tokens are encrypted before storage.
- Mailbox visibility is controlled by role-based access through `mailbox_role_access`.
- Admin manages mailbox configuration and OAuth connection.

## Main Surfaces
- `/mail`
  - shared inbox with mailbox selector, sync, connect/reconnect, thread reading, and reply
- quotation detail
  - `Email` tab showing threads linked to the quotation
- client detail
  - `Email` tab showing threads linked to the client

## Current Tradeoffs
- This MVP prioritizes cost and simplicity over true real-time updates.
- Sync currently indexes recent inbox traffic rather than building a full historical mirror.
- Search is optimized for the local indexed slice, not for full-mailbox discovery.

## Go / No-Go Criteria
- Go:
  - shared inbox is useful to operations
  - linking by quotation reference is reliable
  - sync remains lightweight and low-maintenance
- No-Go:
  - Gmail sync becomes operationally noisy
  - linking creates frequent ambiguity
  - the ERP workflow adds less value than opening Gmail directly
