/** The frame around sign in, setup and invite screens: BidBot's own brand, before any company is chosen. */
export function AuthShell({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="w-full max-w-[420px]">
        <p className="mb-6 flex items-center justify-center gap-2 text-[18px] font-bold tracking-[-0.02em]">
          <span aria-hidden className="card-lime grid h-8 w-8 place-items-center !rounded-[9px] text-[13px]">B</span>
          BidBot
        </p>
        <section className="card p-6 md:p-7">
          <h1 className="text-[22px] font-bold tracking-[-0.02em]">{title}</h1>
          {sub && <p className="mt-1 text-[13px] text-ink-soft">{sub}</p>}
          <div className="mt-5">{children}</div>
        </section>
      </div>
    </main>
  );
}

export const field = "h-11 w-full rounded-[10px] bg-sunk px-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-lime-deep";
export const primary = "press h-11 w-full cursor-pointer rounded-[10px] bg-ink text-[14px] font-semibold text-core hover:opacity-90";

export function Notice({ tone, children }: { tone: "error" | "info"; children: React.ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`mb-4 rounded-[10px] px-3 py-2 text-[13px] ${tone === "error" ? "bg-ember/15 text-ember-deep" : "bg-lime-wash text-lime-deep"}`}>
      {children}
    </p>
  );
}
