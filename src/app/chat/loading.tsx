export default function ChatLoading() {
  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar skeleton */}
      <aside className="w-full md:w-[400px] flex flex-col border-r border-white/[0.06] bg-black shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-7 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/5" />
            <div className="w-24 h-5 rounded-lg bg-white/5" />
          </div>
          <div className="w-9 h-9 rounded-full bg-white/5" />
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="h-10 rounded-2xl bg-[#1c1c1e] animate-pulse" />
        </div>

        {/* Stories strip skeleton */}
        <div className="border-b border-white/[0.05] pb-4 pt-2">
          <div className="flex gap-4 px-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2 min-w-[64px]">
                <div className="w-[62px] h-[62px] rounded-full bg-white/[0.04] animate-pulse" />
                <div className="w-10 h-2.5 rounded bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>

        {/* Conversation skeletons */}
        <div className="flex-1 pt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3" style={{ opacity: 1 - i * 0.15 }}>
              <div className="w-14 h-14 rounded-full bg-white/[0.04] animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-28 h-3.5 rounded bg-white/[0.04] animate-pulse" />
                <div className="w-44 h-3 rounded bg-white/[0.03] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Chat area skeleton (desktop) */}
      <main className="hidden md:flex flex-1 flex-col items-center justify-center bg-black">
        <div className="w-24 h-24 rounded-full border border-white/[0.06] flex items-center justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-white/[0.03]" />
        </div>
        <div className="w-32 h-4 rounded bg-white/[0.04] mb-2" />
        <div className="w-52 h-3 rounded bg-white/[0.03]" />
      </main>
    </div>
  );
}
