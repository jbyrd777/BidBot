@AGENTS.md

# BidBot: handoff and working notes

Read this before changing anything. It carries the decisions made while building BidBot so far.

## What BidBot is

A team of bots that runs a commercial subcontractor's bid cycle, sold as a subscription (owned by Maverick Takeoff Solutions). People chat with a main bot ("Foreman" by default, renamable per company). It hands each request to the specialist bot that owns it and reports back in the same thread. Any trade: flooring, painting, drywall, electrical, plumbing, HVAC, fire protection, roofing, glazing, concrete (`src/lib/trades.ts`).

It follows the feature set of Orgo's Bops (github.com/OrgoAI/bops), rebuilt from scratch for subcontractors. **Never copy Bops code, wording, names or mascots.** Its license (FSL) forbids using its code in a competing product. Match features, write our own code.

Bot team (`src/lib/bots/roster.ts`, seeded per workspace by `create_workspace()` in SQL): Foreman (main), Bid Desk, Scope Analyst, Takeoff Coordinator, Vendor RFQ, Proposal Builder, GC Follow Up, Submittals.

## Rules that never bend

- Reading runs on its own. Changes and anything that goes out (send, create, pay) become an approval card ("Do it" / "Don't") unless a bot is set to "Just do it"; sending and paying still ask.
- Sales owns price. No bot ever suggests a number.
- White label: customers see their company name inside the app. No AI vendor or model name anywhere in the product.
- One workspace per company. Every table carries `workspace_id` and is protected by row level security; queries run under the signed in user's session, never a service key, for customer data.

## How it is built

- Next.js 16 App Router (read `node_modules/next/dist/docs` first; `proxy.ts` replaces middleware), React 19, Tailwind v4, TypeScript, vitest.
- Pages that read request data use `export const instant = false` plus `await connection()`.
- `src/app/(app)/` is the signed in app shell; `login`, `onboarding`, `invite/[token]`, `auth/callback` sit outside it.
- **Workspace per request:** `getWorkspace()` (`src/lib/workspace/load.ts`) loads the signed in person's company. Every store function takes `ws` explicitly. Mutations record `ws.changes`; `commit(ws)` (`src/lib/workspace/commit.ts`) saves them. Without Supabase env vars it runs one local demo workspace (`src/lib/workspace/demo.ts`).
- **Engine:** `src/lib/team/engine.ts` `respond(ws, threadBot, text)`. Routing without a model: scored signals in `src/lib/team/router.ts`; on a near tie the main bot asks with choice buttons. With a model: `src/lib/team/model.ts`, any OpenAI compatible API, tools owned by bots (the tool used decides which bot answers).
- **Skills** (`src/lib/team/skills.ts`) are shared by both paths: scope snapshot, takeoff request, RFQ draft, proposal outline, submittal checklist, GC emails, bid or pass cards.
- **ITB parser** (`src/lib/itb`): BuildingConnected, ConstructConnect, Procore, direct GC email, client job lists. Scope is read through the company's trade (`withTrade`).
- Server actions with role checks: `src/app/team-actions.ts`, `src/app/actions.ts`, `src/app/auth-actions.ts`.

## Infrastructure

- Supabase project **bidbot** (`xaxustluwpkuvfjeekfd`, us-east-1, org Maverick Takeoff Solutions). Migrations in `supabase/migrations` are applied. Schema tests run on an in process Postgres (`supabase/schema.test.ts`).
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

Done: chat first bot team, approvals, tasks, memory, Vault (access settings), Settings (trade, rules, people and invites, autonomy, services), dashboard and bid board reports, workspaces with sign up, sign in, reset, company setup with sample invitations, invites by link with roles, scored routing. 38 tests pass; build passes.

Next, in order:
1. Run locally against Supabase; test sign up, setup, invite, chat, approvals end to end.
2. Connect Grok (env above); check tool calling works with the chosen model; meter usage into `usage_events`.
3. Deploy a private Vercel preview with the env vars.
4. Real inbox: Gmail and Outlook ingestion into `inbound_messages` and the parser.
5. Billing: Stripe test mode plans, seats, monthly AI credit, stop at zero.
6. Bot email address, phone, cloud computers, Slack, routines.
7. Public launch: Vercel Pro, domain, own email sender (Resend), Stripe live, terms and privacy.

## How Jesse wants things

- Writing: no hyphens in prose (fine in code and product codes), no em or en dashes, dates with periods (11.04).
- Design: follow the Dribbble reference (shots/26816259, finance dashboard: light gray canvas, white cards, hatched lime, yellow and orange) and use his design skills repo jbyrd777/claude-design-skills (impeccable, soft skill, motion and others). `DESIGN.md` documents the current system.
- Ask before spending money or doing anything hard to undo. Otherwise build, test, and report briefly.
