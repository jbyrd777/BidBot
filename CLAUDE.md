@AGENTS.md

# BidBot: handoff and working notes

Read this before changing anything. It carries the decisions made while building BidBot so far.

## What BidBot is

A team of bots that runs a commercial subcontractor's bid cycle, sold as a subscription (owned by Maverick Takeoff Solutions). People chat with a main bot ("Foreman" by default, renamable per company). It hands each request to the specialist bot that owns it and reports back in the same thread. Any trade: flooring, painting, drywall, electrical, plumbing, HVAC, fire protection, roofing, glazing, concrete (`src/packs/construction/trades.ts`).

It follows the feature set of Orgo's Bops (github.com/OrgoAI/bops), rebuilt from scratch for subcontractors. **Never copy Bops code, wording, names or mascots.** Its license (FSL) forbids using its code in a competing product. Match features, write our own code.

Bot team (`src/packs/construction/roster.ts`, passed to `create_workspace()` in SQL when a workspace is made): Foreman (main), Bid Desk, Scope Analyst, Takeoff Coordinator, Vendor RFQ, Proposal Builder, GC Follow Up, Submittals.

## Rules that never bend

- Reading runs on its own. Changes and anything that goes out (send, create, pay) become an approval card ("Do it" / "Don't") unless a bot is set to "Just do it"; sending and paying still ask.
- Sales owns price. No bot ever suggests a number.
- White label: customers see their company name inside the app. No AI vendor or model name anywhere in the product.
- One workspace per company. Every table carries `workspace_id` and is protected by row level security; queries run under the signed in user's session, never a service key, for customer data.

## How it is built

- Local tooling: Node 22 lives in `~/.local/node/bin` (put it on PATH). Install with `npm ci --legacy-peer-deps` (vitest 5 and `@types/node` 20 disagree on a peer). `.claude/launch.json` has a `demo` server on port 3100 that skips `.env.local` (NODE_ENV=test), so it runs the local demo workspace with no database or model.
- Next.js 16 App Router (read `node_modules/next/dist/docs` first; `proxy.ts` replaces middleware), React 19, Tailwind v4, TypeScript, vitest.
- Pages that read request data use `export const instant = false` plus `await connection()`.
- `src/app/(app)/` is the signed in app shell; `login`, `onboarding`, `invite/[token]`, `auth/callback` sit outside it.
- **Workspace per request:** `getWorkspace()` (`src/lib/workspace/load.ts`) loads the signed in person's company. Every store function takes `ws` explicitly. Mutations record `ws.changes`; `commit(ws)` (`src/lib/workspace/commit.ts`) saves them. Without Supabase env vars it runs one local demo workspace (`src/lib/workspace/demo.ts`).
- **Core and packs.** The core (`src/lib/team`, `src/lib/workspace`) runs the bot team, chat, approvals, tasks and memory and knows no industry. Everything industry specific lives in a pack (`src/packs/<pack>`) that implements `IndustryPack` (`src/lib/team/pack.ts`): roster, main bot name, routing signals, built in replies, model tools, prompt lines, approval kinds it executes, and loading and saving its own records. Packs are registered in `src/packs/index.ts`; the workspace row names its pack (`workspaces.pack`) and the loaded workspace carries the pack object as `ws.pack`. Core code never imports a pack; `src/lib/team/pack.test.ts` fails if it does, and runs a made up second pack through the core. New chat block types go in `src/packs/blocks.ts`. The construction pack is the only one today.
- **Engine:** `src/lib/team/engine.ts` `respond(ws, threadBot, text)`. The main bot's own requests (memory, tasks, approvals) are core. Routing without a model: scored signals (`src/lib/team/router.ts`, pack signals in `src/packs/construction/signals.ts`); on a near tie the main bot asks with choice buttons. With a model: `src/lib/team/model.ts`, any OpenAI compatible API, core tools plus the pack's tools, each owned by a bot (the tool used decides which bot answers; `shared` tools never take the reply over).
- **Construction skills** (`src/packs/construction/skills.ts`) are shared by both paths: scope snapshot, takeoff request, RFQ draft, proposal outline, submittal checklist, GC emails, bid or pass cards. `change()` in the core store queues an approval or runs it when the bot is set to "Just do it".
- **ITB parser** (`src/packs/construction/itb`): BuildingConnected, ConstructConnect, Procore, direct GC email, client job lists. Scope is read through the company's trade (`withTrade`).
- **Bot team in SQL:** `create_workspace(name, pack, trade, your_name, bots)` takes the roster from the app (`startingBots(pack)`), so the roster lives only in the pack.
- Server actions with role checks: `src/app/team-actions.ts`, `src/app/actions.ts`, `src/app/auth-actions.ts`.

## Infrastructure

- Supabase project **bidbot** (`xaxustluwpkuvfjeekfd`, us-east-1, org Maverick Takeoff Solutions). Migrations 0001 to 0004 are applied (0003_industry_packs and 0004_computers on 11.03). The security advisor flags `create_workspace` and `accept_invite` as callable by signed in users; that is intended, anonymous callers are revoked. Schema tests run on an in process Postgres (`supabase/schema.test.ts`).
- GitHub: jbyrd777/BidBot, branch main.
- Vercel: not deployed yet. Account `jesse-3234`, default team scope `skopeiq`, Hobby plan (must move to Pro before paying customers).

## Environment (`.env.local`, never committed)

```
NEXT_PUBLIC_SUPABASE_URL=https://xaxustluwpkuvfjeekfd.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key from Supabase>
MODEL_API_KEY=<xAI key>          # Jesse keeps it in "xAI API Key.txt" on his Desktop
MODEL_NAME=<a current Grok model with tool calling; list them from https://api.x.ai/v1/models>
MODEL_BASE_URL=https://api.x.ai/v1
```

The Vercel token is in "BidBot Vercel Token.txt" on the Desktop. Keys go in env settings only, never in code or git.

## Status

Done: chat first bot team, approvals, tasks, memory, Vault (access settings), Settings (trade, rules, people and invites, autonomy, services), dashboard and bid board reports, workspaces with sign up, sign in, reset, company setup with sample invitations, invites by link with roles, scored routing. Core and construction pack split done (11.03). Bot computers v1 built (11.03). 49 tests pass; build and lint pass.

### Vision (11.03)

The goal is a bot team that runs a subcontractor's whole office on its own: win the work, run the jobs, get paid, stay compliant, and report to the owner. People keep the field work, prices, signatures and payments. Working name for the company and platform: STWRD (trademark and domain not checked yet).

Departments and bots:
- Win work: Bid Desk, Scope Analyst, Takeoff Coordinator, Proposal Builder, GC Follow Up (built).
- Get paid: Billing (pay apps, lien waivers, retention, collections), Bookkeeper (invoice to PO matching, job cost), Compliance (insurance certificates, licenses, certified payroll, safety, prequal). Not built.
- Run work: Project Coordinator (submittals, RFIs, change order log, minutes, closeout), Buyer (with Vendor RFQ: POs, lead times, deliveries), Scheduler (crews, GC lookaheads), Field Assistant by text (daily reports, T and M tickets, material requests). Submittals and Vendor RFQ exist; the rest is not built.
- Lead: Foreman, the main bot, writes the weekly owner report (pipeline, backlog, cash, jobs at risk).

Autonomy ladder, set per routine, not per company. A routine moves up only after a track record the company can see (how many times it ran, how often a person changed the draft):
1. Drafts: the bot prepares, a person does it.
2. Asks: approval card, "Do it" / "Don't" (default).
3. Does and reports: runs on its own and posts what it did (internal changes, routine follow ups, reminders).
4. Never on its own: prices, signatures, contracts, payments and anything legal. These always ask.

### Direction (decided 11.03)

- The moat is the inbox, the parser, the bid board and the follow up, not the chat. A general assistant can match a chat window; it cannot match reading every invitation from every platform. Build in that order.
- Win on proactive work. The first night after a company connects its inbox, it wakes up to a screened bid board of the last 30 days and a morning digest email. Every later feature should add something the team finds waiting for them.
- Meet people where they work: email first (estimators), phone second (owners). The app is where they go to decide, not where they have to live.
- Sell flooring first, where Maverick already has warm relationships, even though the code supports every trade.
- Pricing is flat, never usage based for the customer. Meter usage in `usage_events` for our own margins only. Two tiers proposed: software, and a higher done with you tier that bundles Maverick takeoffs through the Takeoff Coordinator (open decision; `PRODUCT.md` still says "not tied to an outside estimating service").
- First customers are pilots with existing Maverick flooring clients, billed by invoice. Before building more, screen record each one triaging invitations.

Next, in order:
1. Run locally against Supabase; test sign up, setup, invite, chat, approvals end to end.
2. Deploy a private Vercel preview with the env vars.
3. Bot computers (researched 11.03; moved ahead of the inbox on 11.03 at Jesse's call). A core feature behind a provider interface, Orgo first (orgo.ai; cloud Linux desktops with Chrome, API, noVNC live view). Use a computer only where there is no direct connection: bid platform portals, GC payment portals (Textura, GCPay), prequal forms, desktop only software. Email and data stay on direct connections.
   - One computer per workspace, started for a job and stopped after (Medium: $0.055/hr running, $0.0027/hr stopped, files kept), never always on (about $40/month each).
   - The customer signs into each portal once, themselves, in the live view; the login stays on that computer's disk. We store no portal passwords.
   - The VNC password is root on the computer: fetch it per session on the server, never in a `NEXT_PUBLIC_` variable, and show live view or takeover only to owners and admins.
   - First job: after a bid decision, download the plan set and addenda overnight and attach them to the bid. Later: pay apps in GC portals (always an approval card), prequal forms.
   - Jesse signs up for Orgo and puts the key in `.env.local` as `COMPUTER_API_KEY` (generic name, so no provider name shows in Settings); start on the $5 signup credit, Starter ($29/month) once pilots run. Ask Orgo about white label embedding and resale terms before launch.
   - Built 11.03 (v1): `src/lib/computers` (provider contract, Orgo provider, jobs and runner), approval kind `computer_job`, Scope Analyst's `fetchPlans` skill and `fetch_plans` tool, Computer panel with live view (noVNC 1.7.0) on every bot page, migration 0004_computers. Tested with a stand in computer and against Orgo with a placeholder key. Not yet tested with a real Orgo key.
   - Jobs run in `after()` from the server action, under the person's session. Fine locally; on Vercel a run is capped by the function's max duration, so long jobs need a worker on the computer itself or a queue before launch. Downloaded files stay on the computer for now; moving them into Supabase Storage and onto the bid is the next piece.
4. Real inbox: Gmail and Outlook ingestion (read only) into `inbound_messages` and the parser, with a 30 day backfill on connect. Read PDF attachments.
4a. Bot email address and a morning digest routine (new invitations, what fits, what is due, which GC has not answered).
5. Pilot with two or three current flooring clients; invoice by hand; screen record their triage and adjust.
5a. Before adding departments: add the autonomy ladder with a visible track record per routine. (The core and pack split is done.)
5b. Get paid department: Billing, Bookkeeper, Compliance, plus T and M tickets by text from the foreman. Build next because recovered money is the easiest value to prove.
5c. Run work department: Project Coordinator, Buyer, Scheduler, Field Assistant.
6. Connect Grok (env above); check tool calling works with the chosen model; meter usage into `usage_events`.
7. Billing: Stripe test mode with flat plans and seats; no customer facing credit or stop at zero.
8. Public launch: Vercel Pro, domain, own email sender (Resend), Stripe live, terms and privacy.
9. Later: phone, Slack.

## How Jesse wants things

- Writing: no hyphens in prose (fine in code and product codes), no em or en dashes, dates with periods (11.04).
- Design: follow the Dribbble reference (shots/26816259, finance dashboard: light gray canvas, white cards, hatched lime, yellow and orange) and use his design skills repo jbyrd777/claude-design-skills (impeccable, soft skill, motion and others). `DESIGN.md` documents the current system.
- Ask before spending money or doing anything hard to undo. Otherwise build, test, and report briefly.
