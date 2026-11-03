import type { AnyPack } from "@/lib/team/pack";
import { construction } from "./construction";
import type { BidHolder } from "./construction/store";

/**
 * Every industry pack the product offers. A workspace names its pack in `workspaces.pack`; the core
 * looks it up here and never imports a pack directly.
 */
export const PACKS: AnyPack[] = [construction];

export const DEFAULT_PACK = "construction";

export function packFor(key: string | undefined | null): AnyPack {
  return PACKS.find((p) => p.key === key) ?? PACKS.find((p) => p.key === DEFAULT_PACK)!;
}

/** The records each pack keeps on a workspace. One pack today; later packs join this union. */
export type PackState = BidHolder;
