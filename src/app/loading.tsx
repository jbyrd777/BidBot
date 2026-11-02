export default function Loading() {
  return (
    <div className="flex flex-col gap-4 md:gap-5" aria-busy="true" aria-label="Loading">
      <div className="grid grid-cols-3 gap-3 md:gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`bezel ${i === 0 ? "col-span-3 lg:col-span-1" : ""}`}>
            <div className={`${i === 0 ? "core-lime" : "core"} h-[132px] animate-pulse md:h-[168px]`} />
          </div>
        ))}
      </div>
      <div className="bezel">
        <div className="core h-[260px] animate-pulse" />
      </div>
      <div className="bezel">
        <div className="core h-[420px] animate-pulse" />
      </div>
    </div>
  );
}
