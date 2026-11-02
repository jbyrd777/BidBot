import { describe, expect, it } from "vitest";
import { ingest, type Bid, type Company } from "./store";
import { bcInviteRaisingCanes } from "@/lib/itb/__fixtures__/emails";

const company: Company = {
  id: "t",
  name: "Test",
  settings: { serviceStates: ["WA"], minLeadDays: 3, requireFlooring: true, preferredGcs: [], blockedGcs: [] },
  weeklyCapacity: 8,
};

describe("ingest", () => {
  it("folds a later update into the bid it belongs to", () => {
    const state = { company, bids: [] as Bid[] };
    const update = {
      ...bcInviteRaisingCanes,
      id: "gmail:update-1",
      subject: "Addendum 1 - Raising Cane's 1344 Burlington, WA",
      receivedAt: "2026-11-03T10:00:00Z",
      text: bcInviteRaisingCanes.text!
        .replace("has invited\nyou to\nbid on", "sent your company a message about")
        .replace("Raising Cane&#39;s 1344 Burlington, WA: Tile\n----------------------------------------------------------",
          "Raising Cane&#39;s 1344 Burlington, WA: Tile\n------\n\nAddendum 1 posted, bid due moved\n------\n\nNew bid due date is November 16, 2026.\n\nReply to\nJeff")
        .replace("Jeff Giddings from\nRadix Construction, Inc.", "Jeff Giddings of Radix Construction, Inc.")
        .replace("November 12, 2026", "November 16, 2026"),
    };
    ingest(state, [bcInviteRaisingCanes, update]);
    expect(state.bids).toHaveLength(1);
    expect(state.bids[0].due?.date).toBe("2026-11-16");
    expect(state.bids[0].events.map((e) => e.kind)).toEqual(["invite", "update"]);
  });
});
