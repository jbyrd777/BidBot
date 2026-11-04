import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { beforeAll, describe, expect, it } from "vitest";
import { startingBots } from "@/lib/team/store";
import { construction } from "@/packs/construction";

/**
 * Loads the real migration into an in process Postgres with a small stand in for Supabase's auth schema,
 * then acts as different signed in users to prove the row level security holds.
 */

const AUTH_STUB = `
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email', current_setting('request.jwt.claim.email', true)) $$;
  grant usage on schema public, auth to anon, authenticated;
  grant execute on all functions in schema auth to anon, authenticated;
`;

const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";
const CARL = "00000000-0000-0000-0000-00000000000c";

let db: PGlite;

async function as<T>(user: string, email: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user}', false); select set_config('request.jwt.claim.email', '${email}', false); set role authenticated;`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}

const one = async <T,>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows[0];
const rows = async <T,>(sql: string, params: unknown[] = []) => (await db.query<T>(sql, params)).rows;

/** The bot team the app passes in, straight from the construction pack. */
const BOTS = JSON.stringify(startingBots(construction).map(({ id, name, role }) => ({ id, name, role })));

let wsA: string;
let wsB: string;

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(AUTH_STUB);
  await db.exec(readFileSync(join(__dirname, "migrations/0001_init.sql"), "utf8"));
  await db.exec(readFileSync(join(__dirname, "migrations/0002_private_helpers.sql"), "utf8"));
  await db.exec(readFileSync(join(__dirname, "migrations/0003_industry_packs.sql"), "utf8"));
  await db.exec(readFileSync(join(__dirname, "migrations/0004_computers.sql"), "utf8"));
  await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;`);
  await db.exec(`insert into auth.users values ('${ALICE}', 'alice@a.com'), ('${BOB}', 'bob@b.com'), ('${CARL}', 'carl@a.com');`);
  wsA = (await as(ALICE, "alice@a.com", () => one<{ id: string }>("select create_workspace('Alpha Flooring', 'construction', 'flooring', 'Alice', $1) as id", [BOTS])))!.id;
  wsB = (await as(BOB, "bob@b.com", () => one<{ id: string }>("select create_workspace('Bravo Electric', 'construction', 'electrical', 'Bob', $1) as id", [BOTS])))!.id;
}, 60_000);

describe("workspace schema", () => {
  it("creates a workspace with its owner and the eight bot team", async () => {
    const bots = await as(ALICE, "alice@a.com", () => rows<{ id: string }>("select id from bots where workspace_id = $1 order by sort", [wsA]));
    expect(bots.map((b) => b.id)).toEqual(["chief", "bid_desk", "scope_analyst", "takeoff_coordinator", "vendor_rfq", "proposal_builder", "gc_follow_up", "submittals"]);
    const me = await as(ALICE, "alice@a.com", () => one<{ role: string }>("select role from members where workspace_id = $1", [wsA]));
    expect(me?.role).toBe("owner");
    const w = await as(ALICE, "alice@a.com", () => one<{ pack: string }>("select pack from workspaces where id = $1", [wsA]));
    expect(w?.pack).toBe("construction");
  });

  it("refuses a bot team without the main bot or with a bad bot id", async () => {
    const make = (bots: unknown) => as(ALICE, "alice@a.com", () => db.query("select create_workspace('X', 'construction', 'flooring', 'A', $1)", [JSON.stringify(bots)]));
    await expect(make([{ id: "bid_desk", name: "Bid Desk", role: "" }])).rejects.toThrow(/main bot/);
    await expect(make([{ id: "chief", name: "Foreman", role: "" }, { id: "Bad Id!", name: "x", role: "" }])).rejects.toThrow(/not valid/);
  });

  it("never shows one company's data to another", async () => {
    await as(ALICE, "alice@a.com", () => db.query("insert into bids (workspace_id, id, data) values ($1, 'secret-job', '{}')", [wsA]));
    const seen = await as(BOB, "bob@b.com", () => rows("select * from bids"));
    expect(seen).toHaveLength(0);
    const wsSeen = await as(BOB, "bob@b.com", () => rows<{ name: string }>("select name from workspaces"));
    expect(wsSeen.map((w) => w.name)).toEqual(["Bravo Electric"]);
    const bots = await as(ALICE, "alice@a.com", () => rows("select * from bots where workspace_id = $1", [wsB]));
    expect(bots).toHaveLength(0);
  });

  it("blocks writing into another company's workspace", async () => {
    await expect(as(BOB, "bob@b.com", () => db.query("insert into messages (workspace_id, thread_bot, sender, text) values ($1, 'chief', 'user', 'hi')", [wsA]))).rejects.toThrow();
    const updated = await as(BOB, "bob@b.com", () => db.query("update workspaces set name = 'hacked' where id = $1", [wsA]));
    expect(updated.affectedRows ?? 0).toBe(0);
  });

  it("joins by invite only with the invited email, and roles limit who can make calls", async () => {
    const inv = await as(ALICE, "alice@a.com", () => one<{ token: string }>("insert into invites (workspace_id, email, role) values ($1, 'carl@a.com', 'viewer') returning token", [wsA]));
    await expect(as(BOB, "bob@b.com", () => db.query("select accept_invite($1, 'Bob')", [inv!.token]))).rejects.toThrow(/different email/);
    await as(CARL, "carl@a.com", () => db.query("select accept_invite($1, 'Carl')", [inv!.token]));
    const visible = await as(CARL, "carl@a.com", () => rows("select id from bids where workspace_id = $1", [wsA]));
    expect(visible).toHaveLength(1);
    const decided = await as(CARL, "carl@a.com", () => db.query("update bids set decision = 'bid' where workspace_id = $1", [wsA]));
    expect(decided.affectedRows ?? 0).toBe(0);
  });

  it("hides the membership helpers from the public API", async () => {
    const fns = await rows<{ schema: string }>("select n.nspname as schema from pg_proc p join pg_namespace n on n.oid = p.pronamespace where p.proname in ('is_member', 'has_role')");
    expect(fns.every((f) => f.schema === "private")).toBe(true);
  });

  it("keeps usage and invites away from people without the role", async () => {
    const inv = await as(CARL, "carl@a.com", () => rows("select * from invites"));
    expect(inv).toHaveLength(0);
    await expect(as(CARL, "carl@a.com", () => db.query("insert into usage_events (workspace_id, kind) values ($1, 'model')", [wsA]))).rejects.toThrow();
  });

  it("keeps each company's computer and its jobs to itself, and viewers cannot queue work", async () => {
    const job = (ws: string) => ["insert into computer_jobs (id, workspace_id, bot_id, thread_bot, title, task) values (gen_random_uuid(), $1, 'scope_analyst', 'chief', 'Plans', 'Download the plans')", [ws]] as [string, string[]];
    await as(ALICE, "alice@a.com", async () => {
      await db.query("insert into computers (workspace_id, provider, provider_id) values ($1, 'orgo', 'pc-a')", [wsA]);
      await db.query(...job(wsA));
    });
    expect(await as(BOB, "bob@b.com", () => rows("select * from computers"))).toHaveLength(0);
    expect(await as(BOB, "bob@b.com", () => rows("select * from computer_jobs"))).toHaveLength(0);
    await expect(as(BOB, "bob@b.com", () => db.query(...job(wsA)))).rejects.toThrow();
    // Carl joined Alpha as a viewer: he sees the work but cannot queue any or switch the computer on.
    expect(await as(CARL, "carl@a.com", () => rows("select * from computer_jobs"))).toHaveLength(1);
    await expect(as(CARL, "carl@a.com", () => db.query(...job(wsA)))).rejects.toThrow();
    const flipped = await as(CARL, "carl@a.com", () => db.query("update computers set status = 'running' where workspace_id = $1", [wsA]));
    expect(flipped.affectedRows ?? 0).toBe(0);
  });
});
