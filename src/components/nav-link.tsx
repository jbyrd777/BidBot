"use client";

import { usePathname } from "next/navigation";
import { GlassSegmented } from "./glass-segmented";

/** The island nav's page switcher, sharing the lens control with the board's filters. */
export function MainNav({ waiting }: { waiting: number }) {
  const path = usePathname();
  const active = path.startsWith("/bids") ? "bids" : "team";
  return (
    <GlassSegmented
      id="main"
      label="Main"
      active={active}
      segments={[
        { key: "bids", label: "Bid board", href: "/bids", count: waiting },
        { key: "team", label: "Bot team", href: "/" },
      ]}
    />
  );
}
