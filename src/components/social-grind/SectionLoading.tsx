type SectionLoadingProps = {
  title?: string;
  subtitle?: string;
  rows?: number;
};

export function SectionLoading({
  title = "Loading GrindSync",
  subtitle = "Preparing your next section",
  rows = 4,
}: SectionLoadingProps) {
  return (
    <div className="min-h-screen bg-[#0b0b10] text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,71,244,0.18),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(140,37,244,0.14),transparent_35%)] pointer-events-none" />
      <div className="absolute inset-0 bg-grid-white/[0.04] pointer-events-none opacity-50" />
      <div className="absolute inset-0 mask-radial-faded pointer-events-none" />

      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-fuchsia-500/10 blur-3xl animate-pulse pointer-events-none" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-5xl">
          <div className="flex items-center justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 mb-4">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold tracking-[0.2em] uppercase text-white/70">
                  GrindSync
                </span>
              </div>
              <div className="w-52 h-5 rounded-full bg-white/15 animate-pulse mb-3" />
              <div className="w-80 max-w-full h-10 rounded-full bg-white/20 animate-pulse" />
            </div>
            <div className="hidden md:block w-36 h-11 rounded-full bg-white/10 animate-pulse" />
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/6 backdrop-blur-xl p-5 md:p-8 shadow-2xl shadow-black/30">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
              <div>
                <div className="w-24 h-3 rounded-full bg-white/15 animate-pulse mb-3" />
                <div className="w-72 max-w-full h-10 rounded-full bg-white/20 animate-pulse mb-3" />
                <div className="w-96 max-w-full h-4 rounded-full bg-white/10 animate-pulse" />
              </div>
              <div className="flex gap-3">
                <div className="w-24 h-10 rounded-full bg-white/10 animate-pulse" />
                <div className="w-24 h-10 rounded-full bg-white/10 animate-pulse" />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: rows }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-4"
                  style={{ opacity: Math.max(0.35, 1 - index * 0.12) }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400/40 to-fuchsia-500/40 animate-pulse" />
                  <div className="w-3/4 h-4 rounded-full bg-white/15 animate-pulse" />
                  <div className="w-full h-3 rounded-full bg-white/10 animate-pulse" />
                  <div className="w-2/3 h-3 rounded-full bg-white/10 animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center text-xs sm:text-sm text-white/70">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {title}
              <span className="text-white/40">•</span>
              {subtitle}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
