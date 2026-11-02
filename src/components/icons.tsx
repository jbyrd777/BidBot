type P = { className?: string };
const base = "h-[18px] w-[18px] shrink-0";
const svg = (d: React.ReactNode) =>
  function Icon({ className }: P) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`${base} ${className ?? ""}`}>
        {d}
      </svg>
    );
  };

export const IconBoard = svg(<><rect x="3" y="3" width="7" height="9" rx="2" /><rect x="14" y="3" width="7" height="5" rx="2" /><rect x="14" y="12" width="7" height="9" rx="2" /><rect x="3" y="16" width="7" height="5" rx="2" /></>);
export const IconTeam = svg(<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.8-3 3-4.6 5.5-4.6s4.7 1.6 5.5 4.6" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14.5c2.2.2 3.8 1.6 4.5 4" /></>);
export const IconSearch = svg(<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></>);
export const IconMail = svg(<><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>);
export const IconCalendar = svg(<><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M8 3v4M16 3v4M3.5 10h17" /></>);
export const IconCheck = svg(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const IconClock = svg(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>);
export const IconLayers = svg(<><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>);
export const IconArrowLeft = svg(<path d="M15 5 8 12l7 7" />);
export const IconLink = svg(<><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>);
