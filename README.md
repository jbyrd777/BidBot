# Bid Desk

The first working piece of the flooring bot team: a multi tenant web app where the Bid Desk bot reads invitations to bid, pulls out the facts, screens each one against the company's rules, and puts it on a bid board for a person to make the bid or no bid call.

## What works today

- **ITB parser** (`src/lib/itb`) for the five ways invitations actually arrive: BuildingConnected invites and messages, ConstructConnect invites and reminders, Procore invites (including forwarded ones), direct GC emails (plain or HTML), and a client's list of several jobs in one email.
- It extracts project, package, GC, contact, location and state, bid due date and time, job walk, questions due, start date, project size, flooring scope (carpet, carpet tile, LVT, VCT, sheet vinyl, rubber, tile, wood, resinous, polished concrete, base, floor prep), plan links and reference numbers.
- Updates (revised due dates, addenda, site walks) fold into the bid they belong to and show in its history.
- **Screening** (`src/lib/itb/screen.ts`) recommends bid, review or likely pass with reasons: service area, lead time, flooring scope, preferred and blocked GCs. It only recommends; a person decides.
- **Bid board** with a three week due date rule, filters by decision, and a detail page with the bid or no bid call and history.
- **Team page** with the seven bot roster.
- **Database schema** (`supabase/migrations/0001_init.sql`): companies, members with flooring roles, settings, bots, inbound messages, ITBs and events, all behind row level security by company.

Tests cover every parser against real invitations from the Maverick inboxes (personal details replaced with example values).

## Run it

```bash
npm install
npm test
DEMO_TODAY=2026-11-02 npm run dev
```

`DEMO_TODAY` pins the date so the sample invitations from early November 2026 show realistic due dates. Leave it off to use the real date.

## Not built yet

- The demo store (`src/lib/data/store.ts`) keeps everything in memory and resets on restart. Next step is a Supabase store behind the same functions, with sign in.
- Reading email live: a Gmail and Microsoft 365 connector that feeds `parseItbEmail`, plus a bot inbox per company.
- Phone numbers, bot computers and the other six bots.
- Attachments: ITB PDFs and Word files are not read yet.

## Where things live

| Path | What it is |
| --- | --- |
| `src/lib/itb/parsers` | One parser per platform |
| `src/lib/itb/index.ts` | `parseItbEmail`, platform detection, project matching |
| `src/lib/itb/__fixtures__` | Real sample invitations |
| `src/lib/data/store.ts` | Demo data store the pages read from |
| `src/lib/bots/roster.ts` | Default bot team |
| `src/app` | Team page, bid board, bid detail |
| `supabase/migrations` | Database schema |

This is our own code. BOPS was used only as a reference for the bot team idea; none of its code is in this repo.
