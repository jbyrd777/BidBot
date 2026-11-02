import Link from "next/link";

export default function NotFound() {
  return (
    <section className="card mx-auto max-w-xl p-8 text-center md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">That bid is not on the board</h1>
      <p className="mt-2 text-sm text-ink-soft">The link may be from an old invitation, or the bid was removed. Search the board or go back to it.</p>
      <Link href="/bids" className="press mt-6 inline-block rounded-[10px] bg-ink px-5 py-2.5 text-sm font-semibold text-panel hover:opacity-90">
        Go to the bid board
      </Link>
    </section>
  );
}
