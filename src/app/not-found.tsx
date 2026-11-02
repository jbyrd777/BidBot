import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <section className="card mx-auto w-full max-w-xl">
      <div className="p-8 text-center md:p-10">
        <h1 className="text-[24px] font-semibold tracking-[-0.01em]">That bid is not on the board</h1>
        <p className="mt-2 text-[14px] text-ink-soft">The link may be from an old invitation, or the bid was removed. Search the board or go back to it.</p>
        <Link href="/bids" className="press mt-6 inline-flex items-center gap-2 rounded-[10px] bg-ink px-5 py-2.5 text-[14px] font-semibold text-core hover:opacity-90">
          <ArrowLeft size={16} aria-hidden /> Go to the bid board
        </Link>
      </div>
    </section>
  );
}
