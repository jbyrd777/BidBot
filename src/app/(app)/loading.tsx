export default function Loading() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_200px]">
          <div className="card h-[340px] animate-pulse" />
          <div className="card h-[340px] animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card h-[140px] animate-pulse" />
          <div className="card h-[140px] animate-pulse" />
        </div>
      </div>
      <div className="card h-[520px] animate-pulse" />
    </div>
  );
}
