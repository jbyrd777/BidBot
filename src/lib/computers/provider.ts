/**
 * A cloud computer a bot can work on: a desktop with a browser, for the jobs that have no direct
 * connection (bid platform portals, GC payment portals, desktop only software). The core talks to it
 * only through this contract, so the company behind the computers can change without touching the rest.
 * Customers never see that company's name.
 */

export interface RunResult {
  /** What the computer's agent said when it finished. */
  text: string;
  steps: number;
  costCents: number;
}

export interface ComputerProvider {
  key: string;
  /** Make a computer and return its id. */
  create: (name: string) => Promise<string>;
  /** Start it and wait until it runs. A running computer is left as it is. */
  start: (id: string) => Promise<void>;
  stop: (id: string) => Promise<void>;
  /** Hand the computer a task in plain words; it works until it answers. */
  run: (id: string, task: string) => Promise<RunResult>;
  /** What a browser needs to watch and take over the screen. The password controls the whole computer. */
  viewer: (id: string) => Promise<{ url: string; password: string }>;
}

let override: ComputerProvider | null | undefined;

/** Tests swap in a stand in computer here. */
export function setComputerProvider(p: ComputerProvider | null | undefined) {
  override = p;
}

/** The configured provider, or null when no computer key is set. */
export async function computerProvider(): Promise<ComputerProvider | null> {
  if (override !== undefined) return override;
  if (!process.env.COMPUTER_API_KEY) return null;
  const { orgo } = await import("./orgo");
  return orgo;
}
