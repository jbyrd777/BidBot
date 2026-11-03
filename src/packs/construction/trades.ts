/**
 * Trade profiles. A company picks its trade in settings, and every part of the product reads scope
 * through that profile: what counts as "our scope" in an invitation, which spec sections matter,
 * and what a submittal package needs. Adding a trade is adding an entry here.
 */

export interface TradeProfile {
  key: string;
  name: string;
  /** Noun for the work, used in sentences: "the flooring", "the electrical". */
  noun: string;
  /** Does an invitation mention this trade at all? Spec divisions and plain words. */
  mention: RegExp;
  /** Scope items to pick out, in display order. Later rules can drop a parent via `drop`. */
  rules: [string, RegExp][];
  drop?: { parent: string; whenAny: string[] };
  /** Extra submittal items beyond data sheets, installation guides, warranties and samples. */
  submittalExtras: string[];
}

export const TRADES: TradeProfile[] = [
  {
    key: "flooring",
    name: "Flooring",
    noun: "flooring",
    mention: /flooring|floor covering|finishes|all trades|096\d{3}|09 6\d/i,
    rules: [
      ["Carpet tile", /carpet\s*tile|\bCPT[- ]?\d|modular carpet/i],
      ["Carpet", /broadloom|carpet\b(?!\s*tile)/i],
      ["LVT", /\bLVT\b|luxury vinyl|vinyl tile flooring|096519\.23/i],
      ["VCT", /\bVCT\b|vinyl composition|096519\.19/i],
      ["Sheet vinyl", /sheet vinyl|homogeneous|heterogeneous|096516/i],
      ["Rubber", /rubber (flooring|tile|sheet)|096516\.13/i],
      ["Resilient", /resilient|096500/i],
      ["Tile", /(?<!carpet\s*|vinyl\s*|composition\s*)\btile\b(?!\s*ceiling)|porcelain|ceramic|093000/i],
      ["Wood", /wood flooring|hardwood|096400/i],
      ["Resinous", /epoxy|resinous|urethane cement|096700/i],
      ["Polished concrete", /polished concrete|concrete polish/i],
      ["Base", /vinyl base|rubber base|resilient base|096513/i],
      ["Floor prep", /floor (demo|prep|leveling)|self[- ]level|moisture mitigation|moisture test/i],
    ],
    drop: { parent: "Resilient", whenAny: ["LVT", "VCT", "Sheet vinyl", "Rubber"] },
    submittalExtras: ["Moisture and pH test procedure for floor prep", "Transition and accessory details"],
  },
  {
    key: "painting",
    name: "Painting and wallcovering",
    noun: "painting",
    mention: /paint|wallcovering|wall covering|coatings|099\d{3}|09 9\d|all trades/i,
    rules: [
      ["Interior paint", /interior (paint|painting)|099123/i],
      ["Exterior paint", /exterior (paint|painting)|099113/i],
      ["Wallcovering", /wallcovering|wall covering|vinyl wall|097200/i],
      ["High performance coatings", /high performance coating|epoxy coating|099600/i],
      ["Special finishes", /faux|venetian|plaster finish|special finish/i],
      ["Staining", /stain(ing)?\b|clear finish/i],
    ],
    submittalExtras: ["Color and sheen schedule", "Drawdowns for each color"],
  },
  {
    key: "drywall",
    name: "Drywall and ceilings",
    noun: "drywall",
    mention: /drywall|gypsum|framing|ceilings?|092\d{3}|095\d{3}|09 2\d|09 5\d|all trades/i,
    rules: [
      ["Metal framing", /metal stud|cold formed|light gauge|framing|092216/i],
      ["Gypsum board", /gypsum board|drywall|sheetrock|092900/i],
      ["Shaft walls", /shaft ?wall/i],
      ["Acoustical ceilings", /acoustical ceiling|act\b|ceiling tile|lay[- ]in|095113/i],
      ["Insulation", /batt insulation|sound attenuation|insulation/i],
      ["Fire rated assemblies", /fire rated|ul design|rated wall/i],
    ],
    submittalExtras: ["Fire rated assembly listings", "Ceiling grid layout"],
  },
  {
    key: "electrical",
    name: "Electrical",
    noun: "electrical",
    mention: /electrical|division 26|\b26 \d|26\d{4}|lighting|all trades|mep/i,
    rules: [
      ["Service and distribution", /switchgear|switchboard|panelboard|transformer|service entrance|262\d{3}/i],
      ["Branch wiring", /branch circuit|conduit|wire and cable|260519/i],
      ["Lighting", /lighting|luminaire|fixtures?|265\d{3}/i],
      ["Lighting controls", /lighting control|occupancy sensor|dimming/i],
      ["Fire alarm", /fire alarm|283\d{3}/i],
      ["Low voltage", /low voltage|data cabling|structured cabling|271\d{3}/i],
      ["Generator", /generator|ats\b|transfer switch/i],
    ],
    submittalExtras: ["Panel schedules", "Lighting fixture cut sheets", "Single line diagram"],
  },
  {
    key: "plumbing",
    name: "Plumbing",
    noun: "plumbing",
    mention: /plumbing|division 22|\b22 \d|22\d{4}|all trades|mep/i,
    rules: [
      ["Domestic water", /domestic water|water piping|221116/i],
      ["Sanitary and vent", /sanitary|waste and vent|dwv|221316/i],
      ["Storm drainage", /storm drain|roof drain|221413/i],
      ["Fixtures", /plumbing fixture|water closet|lavator|sink|224\d{3}/i],
      ["Water heaters", /water heater|223300/i],
      ["Gas piping", /gas piping|natural gas|231123/i],
    ],
    submittalExtras: ["Fixture schedule", "Backflow preventer certifications"],
  },
  {
    key: "hvac",
    name: "HVAC and mechanical",
    noun: "mechanical",
    mention: /hvac|mechanical|division 23|\b23 \d|23\d{4}|all trades|mep/i,
    rules: [
      ["Ductwork", /duct ?work|sheet metal|233113/i],
      ["Rooftop units", /rooftop unit|\brtu\b|packaged unit/i],
      ["Split systems", /split system|mini split|vrf|variable refrigerant/i],
      ["Controls", /controls|bas\b|building automation|230900/i],
      ["Exhaust", /exhaust fan|kitchen hood|exhaust/i],
      ["Test and balance", /test and balance|tab\b|230593/i],
    ],
    submittalExtras: ["Equipment schedules", "Test and balance report"],
  },
  {
    key: "fire_protection",
    name: "Fire protection",
    noun: "fire protection",
    mention: /fire protection|fire sprinkler|division 21|\b21 \d|21\d{4}|all trades/i,
    rules: [
      ["Wet sprinkler", /wet (pipe|sprinkler)|211313/i],
      ["Dry sprinkler", /dry (pipe|sprinkler)|211316/i],
      ["Standpipes", /standpipe/i],
      ["Fire pump", /fire pump|213113/i],
      ["Hydraulic calcs", /hydraulic calc/i],
    ],
    submittalExtras: ["Hydraulic calculations", "Shop drawings stamped by a NICET technician"],
  },
  {
    key: "roofing",
    name: "Roofing",
    noun: "roofing",
    mention: /roofing|roof|division 07|07 5\d|075\d{3}|all trades/i,
    rules: [
      ["TPO", /\btpo\b/i],
      ["PVC", /\bpvc (roof|membrane)/i],
      ["Modified bitumen", /modified bitumen|mod bit/i],
      ["Metal roofing", /metal roof|standing seam/i],
      ["Shingles", /shingle/i],
      ["Insulation", /roof insulation|polyiso|tapered/i],
      ["Flashing and sheet metal", /flashing|coping|076200/i],
    ],
    submittalExtras: ["Manufacturer warranty requirements", "Uplift calculations"],
  },
  {
    key: "glazing",
    name: "Glazing and storefront",
    noun: "glazing",
    mention: /glazing|glass|storefront|curtain ?wall|division 08|08 4\d|084\d{3}|all trades/i,
    rules: [
      ["Storefront", /storefront|084113/i],
      ["Curtain wall", /curtain ?wall|084413/i],
      ["Windows", /windows?\b|085\d{3}/i],
      ["Interior glazing", /interior glass|glass partition|interior glazing/i],
      ["Mirrors", /mirror/i],
      ["Entrances", /entrance|automatic door/i],
    ],
    submittalExtras: ["Shop drawings", "Structural calculations", "Glass samples"],
  },
  {
    key: "concrete",
    name: "Concrete",
    noun: "concrete",
    mention: /concrete|division 03|\b03 \d|03\d{4}|all trades/i,
    rules: [
      ["Slab on grade", /slab on grade|sog\b/i],
      ["Foundations", /foundation|footing|grade beam/i],
      ["Elevated slabs", /elevated slab|post tension|pt slab/i],
      ["Walls", /concrete wall|tilt ?up/i],
      ["Site concrete", /sidewalk|curb|site concrete|paving/i],
      ["Reinforcing", /rebar|reinforcing|032000/i],
    ],
    submittalExtras: ["Mix designs", "Rebar shop drawings"],
  },
];

export const DEFAULT_TRADE = "flooring";

export function tradeProfile(key?: string): TradeProfile {
  return TRADES.find((t) => t.key === key) ?? TRADES[0];
}
