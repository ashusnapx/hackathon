import { STATS, USER_QUOTES } from "@/lib/constants";
import { Quote, TrendingDown, Clock, AlertCircle } from "lucide-react";

export function Problem() {
  return (
    <section className="py-24 px-6 relative">
      {/* Section divider */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-[#1E1E26] to-transparent" />

      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-[#FF4D4D] text-sm font-medium mb-4">
            <AlertCircle className="w-4 h-4" />
            The Problem
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading mb-4">
            People are frustrated.
            <br />
            <span className="text-[#8A8A95]">
              The portal fails when they need it most.
            </span>
          </h2>
        </div>

        {/* Stats - big visual cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-20">
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-[#4F8EFF]/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative bg-[#0D0D12] border border-[#1E1E26] rounded-2xl p-6 text-center hover:border-[#4F8EFF]/30 transition-colors">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-mono font-bold text-gradient mb-3">
                  {stat.value}
                </div>
                <div className="text-sm text-[#8A8A95] leading-snug mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-[#555]">{stat.source}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Visual: Recovery rate drop */}
        <div className="bg-[#0D0D12] border border-[#1E1E26] rounded-2xl p-8 mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#FF4D4D]/10 flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-[#FF4D4D]" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                Time kills your recovery chances
              </h3>
              <p className="text-sm text-[#8A8A95]">
                Financial fraud recovery rate by time elapsed
              </p>
            </div>
          </div>

          {/* Visual bar chart */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[#34D399] font-medium">
                  Within 1 hour
                </span>
                <span className="font-mono text-[#34D399]">~52%</span>
              </div>
              <div className="h-3 bg-[#13131A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#34D399] to-[#34D399]/80 rounded-full"
                  style={{ width: "52%" }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[#FBBF24] font-medium">
                  Within 6 hours
                </span>
                <span className="font-mono text-[#FBBF24]">~25%</span>
              </div>
              <div className="h-3 bg-[#13131A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FBBF24] to-[#FBBF24]/80 rounded-full"
                  style={{ width: "25%" }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[#FF4D4D] font-medium">
                  After 24 hours
                </span>
                <span className="font-mono text-[#FF4D4D]">~3%</span>
              </div>
              <div className="h-3 bg-[#13131A] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#FF4D4D] to-[#FF4D4D]/80 rounded-full"
                  style={{ width: "3%" }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-[#8A8A95]">
            <Clock className="w-4 h-4 text-[#FBBF24]" />
            Every minute counts. The portal&apos;s timeout destroys your chances.
          </div>
        </div>

        {/* User quotes */}
        <div className="grid md:grid-cols-2 gap-4">
          {USER_QUOTES.map((quote) => (
            <div
              key={quote.author}
              className="bg-[#0D0D12] border border-[#1E1E26] rounded-2xl p-6 relative group hover:border-[#FF4D4D]/20 transition-colors"
            >
              <Quote className="w-8 h-8 text-[#FF4D4D]/10 absolute top-4 right-4" />
              <p className="text-[#8A8A95] leading-relaxed mb-4 text-sm italic">
                &ldquo;{quote.text}&rdquo;
              </p>
              <div className="text-sm">
                <span className="text-foreground font-medium">
                  {quote.author}
                </span>
                <span className="text-[#555]"> · {quote.source}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
