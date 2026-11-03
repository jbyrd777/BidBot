import { demoBids } from "@/lib/data/store";
import { seedTeam } from "@/lib/team/store";
import type { Workspace } from "./types";

/**
 * The local demo workspace, used only when no database is configured (development and tests).
 * It is one shared company by design; with the database on, every request loads its own workspace instead.
 */
export function newDemoWorkspace(): Workspace {
  const b = demoBids();
  return { ...b, id: "demo", mode: "demo", team: seedTeam(), me: { userId: "demo", role: "owner", name: "Jesse Byrd", about: "Owner. Makes the final bid or no bid call with the estimating lead." }, changes: [] };
}

const g = globalThis as unknown as { __demoWs?: Workspace };
export function demoWorkspace(): Workspace {
  if (!g.__demoWs) g.__demoWs = newDemoWorkspace();
  g.__demoWs.changes = [];
  return g.__demoWs;
}
