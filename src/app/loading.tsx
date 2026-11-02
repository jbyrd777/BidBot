export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr_1fr_1fr]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-[168px] animate-pulse bg-panel" />
        ))}
      </div>
      <div className="card h-[260px] animate-pulse" />
      <div className="card h-[420px] animate-pulse" />
    </div>
  );
}
