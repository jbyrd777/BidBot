import { describe, expect, it } from "vitest";
import { findDate } from "../dates";
import { detectPlatform, parseItbEmail, projectKey } from "../index";
import { screenItb } from "../screen";
import { bodyText } from "../text";
import * as fx from "../__fixtures__/emails";

const one = (email: Parameters<typeof parseItbEmail>[0]) => {
  const result = parseItbEmail(email);
  expect(result).toHaveLength(1);
  return result[0];
};

describe("dates", () => {
  const ref = new Date("2026-10-28T12:00:00Z");
  it("reads named dates with and without a year", () => {
    expect(findDate("November 12, 2026", ref)?.date).toBe("2026-11-12");
    expect(findDate("Friday, November 6th", ref)?.date).toBe("2026-11-06");
    expect(findDate("Wednesday, November 11, by 5:00 PM.", ref)).toMatchObject({ date: "2026-11-11", time: "17:00" });
  });
  it("reads platform date formats with time and zone", () => {
    expect(findDate("Wed, Nov 04, 2026 02:00 PM ET", ref)).toMatchObject({ date: "2026-11-04", time: "14:00", tz: "ET" });
    expect(findDate("November 5th, 2026, at 3PM EDT", ref)).toMatchObject({ date: "2026-11-05", time: "15:00", tz: "EDT" });
  });
  it("reads short numeric dates and rolls the year forward in December", () => {
    expect(findDate("Due 11/4", ref)?.date).toBe("2026-11-04");
    expect(findDate("due 1/8", new Date("2026-12-20T00:00:00Z"))?.date).toBe("2027-01-08");
  });
});

describe("BuildingConnected", () => {
  it("parses a bid invite", () => {
    const itb = one(fx.bcInviteRaisingCanes);
    expect(itb).toMatchObject({
      kind: "invite",
      platform: "buildingconnected",
      projectName: "Raising Cane's 1344 Burlington, WA",
      packageName: "Tile",
      gcName: "Radix Construction, Inc.",
      state: "WA",
      requestedBy: "United Contract Flooring",
      due: { date: "2026-11-12" },
    });
    expect(itb.location).toBe("1075 South Burlington Boulevard, Burlington, WA 98233");
    expect(itb.contact).toMatchObject({ name: "Jeff Giddings", title: "Owner", email: "jeff@example-radix.com" });
    expect(itb.scope).toContain("Tile");
    expect(itb.links[0]).toMatchObject({ label: "BuildingConnected" });
    expect(itb.links.some((l) => l.url.includes("state="))).toBe(false);
  });

  it("treats a revised schedule message as an update with the new dates", () => {
    const itb = one(fx.bcUpdateKiln);
    expect(itb).toMatchObject({
      kind: "update",
      projectName: "Kiln Woodinville",
      packageName: "Flooring",
      gcName: "Foushée and Associates Company, Inc.",
      due: { date: "2026-11-11" },
      jobWalk: { date: "2026-10-28" },
      rfiDue: { date: "2026-10-30" },
      projectSf: 24000,
      externalRef: "6ad91bfa2414c8003d41ab51",
    });
    expect(itb.updateSummary).toMatch(/New Bid Due Date/);
    expect(itb.contact).toMatchObject({ name: "Jeremy Webb", title: "Project Manager" });
  });

  it("treats a bid invitation sent as a message as an invite", () => {
    const itb = one(fx.bcInviteMensWearhouse);
    expect(itb).toMatchObject({
      kind: "invite",
      projectName: "Men's Wearhouse - Union Gap, WA",
      gcName: "Weekes Construction",
      state: "WA",
      due: { date: "2026-11-06" },
    });
  });
});

describe("ConstructConnect", () => {
  it("parses the invitation, trades and contact", () => {
    const itb = one(fx.ccInviteGuess);
    expect(itb).toMatchObject({
      kind: "invite",
      platform: "constructconnect",
      projectName: "Guess - Sawgrass Mills - Sunrise, FL",
      gcName: "Pinnacle Construction, Inc",
      state: "FL",
      location: "12801 W Sunrise Blvd, Sunrise, FL 33323",
      due: { date: "2026-11-04", time: "14:00", tz: "ET" },
      startDate: { date: "2027-01-11" },
      projectSf: 10703,
    });
    expect(itb.scope).toEqual(expect.arrayContaining(["LVT", "VCT", "Wood"]));
    expect(itb.scope).not.toContain("Resilient");
    expect(itb.contact).toMatchObject({ name: "Annie Esterling", email: "annie@example-pinnacle.com" });
  });
});

describe("Procore", () => {
  it("parses a forwarded invitation and keeps only the flooring scope", () => {
    const itb = one(fx.procoreImmokalee);
    expect(itb).toMatchObject({
      kind: "invite",
      platform: "procore",
      projectName: "Immokalee FHA Apartments Bldgs 2-3-4",
      packageName: "IFHA Buildings 2-3-4",
      gcName: "Heatherwood Construction Company",
      forwardedBy: "Doug Hourihan",
      state: "FL",
      due: { date: "2026-11-13" },
      projectSf: 15386,
    });
    expect(itb.location).toBe("Immokalee, Florida");
    expect(itb.scope).toEqual(expect.arrayContaining(["VCT", "LVT", "Carpet", "Resinous", "Base"]));
    expect(itb.contact).toMatchObject({ name: "Mason Dean", email: "mason@example-heatherwood.com" });
  });
});

describe("direct GC email", () => {
  it("reads labelled fields from a plain email", () => {
    const itb = one(fx.directRimowa);
    expect(itb).toMatchObject({
      platform: "direct",
      projectName: "RIMOWA - Miami Aventura Mall, Aventura, FL",
      gcName: "Mavacon",
      state: "FL",
      due: { date: "2026-11-05", time: "15:00", tz: "EDT" },
      description: "NEW INTERIOR TENANT FIT OUT",
    });
    expect(itb.links[0]).toMatchObject({ label: "Box" });
  });

  it("reads an HTML email with the scope in a sentence", () => {
    const itb = one(fx.directChristianBros);
    expect(itb).toMatchObject({
      projectName: "Christian Bros Auto Ft Myers FL",
      gcName: "Asa Carlton",
      state: "FL",
      due: { date: "2026-11-06" },
    });
    expect(itb.location).toContain("Fort Myers, FL 33905");
    expect(itb.scope).toEqual(expect.arrayContaining(["VCT", "Tile"]));
    expect(itb.contact).toMatchObject({ name: "Scarlett Dresen", title: "Pre-Construction, Bid Coordinator" });
    expect(itb.links[0]).toMatchObject({ label: "Dropbox" });
  });
});

describe("client job list", () => {
  it("splits one email into one bid per job", () => {
    const items = parseItbEmail(fx.batchConsolidated);
    expect(detectPlatform(fx.batchConsolidated, bodyText(fx.batchConsolidated))).toBe("client_batch");
    expect(items).toHaveLength(5);
    expect(items[0]).toMatchObject({
      kind: "batch_item",
      externalRef: "333863",
      projectName: "Mobility Hub Coral Gables iGMP",
      due: { date: "2026-11-04" },
    });
    expect(items[0].notes).toContain("Jake");
    expect(items[4]).toMatchObject({ externalRef: "333979", projectName: "OneStream Software" });
    expect(items[0].requestedBy).toBe("Consolidated Flooring");
    expect(items[0].state).toBe("FL");
  });
});

describe("screening", () => {
  const settings = { serviceStates: ["FL"], minLeadDays: 3, requireTradeMention: true, preferredGcs: [], blockedGcs: [] };

  it("recommends bidding when the job fits", () => {
    const r = screenItb(one(fx.procoreImmokalee), settings, "2026-11-02");
    expect(r.recommendation).toBe("bid");
  });
  it("recommends no bid outside the service area", () => {
    const r = screenItb(one(fx.bcInviteRaisingCanes), settings, "2026-11-02");
    expect(r.recommendation).toBe("no_bid");
    expect(r.reasons[0]).toMatch(/outside the service area/);
  });
  it("counts an invitation to the flooring package as flooring scope", () => {
    const r = screenItb(one(fx.bcInviteMensWearhouse), { ...settings, serviceStates: ["WA"] }, "2026-11-02");
    expect(r.recommendation).toBe("bid");
  });
  it("asks for review when the deadline is too close", () => {
    const r = screenItb(one(fx.ccInviteGuess), settings, "2026-11-02");
    expect(r.recommendation).toBe("review");
    expect(r.reasons[0]).toMatch(/Due in 2 days/);
  });
});

describe("project matching", () => {
  it("matches the same project written two ways", () => {
    expect(projectKey("Raising Cane's 1344 Burlington, WA")).toBe(projectKey("Raising Cane&#39;s 1344 Burlington WA Project"));
  });
});
