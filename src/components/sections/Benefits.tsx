import {
  Save,
  Compass,
  Clock,
  MapPin,
  Camera,
  Smartphone,
  X,
  Check,
} from "lucide-react";

const COMPARISONS = [
  {
    icon: Save,
    feature: "Auto-save",
    us: "Never lose progress. Pick up where you left off.",
    them: "Session timeout = start over",
    usGood: true,
  },
  {
    icon: Compass,
    feature: "Guided flow",
    us: "Clear steps with plain language.",
    them: "Confusing multi-step form",
    usGood: true,
  },
  {
    icon: Clock,
    feature: "Golden hour timer",
    us: "Know your deadline. Time matters.",
    them: "No urgency guidance",
    usGood: true,
  },
  {
    icon: MapPin,
    feature: "Next steps",
    us: "We tell you what to do after filing.",
    them: "Zero post-filing guidance",
    usGood: true,
  },
  {
    icon: Camera,
    feature: "Evidence checklist",
    us: "Know what to gather before you start.",
    them: "No preparation guidance",
    usGood: true,
  },
  {
    icon: Smartphone,
    feature: "Mobile-first",
    us: "Works on any phone, any connection.",
    them: "Desktop-only, breaks on mobile",
    usGood: true,
  },
];

export function Benefits() {
  return (
    <section id="benefits" className="py-24 px-6 relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#34D399]/[0.02] to-transparent" />

      <div className="max-w-6xl mx-auto relative">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-[#34D399] text-sm font-medium mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            Why this is better
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading mb-4">
            Built for stressed people
            <br />
            <span className="text-[#8A8A95]">on their phone.</span>
          </h2>
        </div>

        {/* Comparison table */}
        <div className="bg-[#0D0D12] border border-[#1E1E26] rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-[#1E1E26] bg-[#13131A]">
            <div className="text-sm text-[#555] font-medium">Feature</div>
            <div className="text-sm text-[#34D399] font-medium text-center">
              CyberComplaint
            </div>
            <div className="text-sm text-[#FF4D4D] font-medium text-center">
              Government Portal
            </div>
          </div>

          {/* Comparison rows */}
          {COMPARISONS.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.feature}
                className={`grid grid-cols-3 gap-4 px-6 py-5 items-center ${
                  i < COMPARISONS.length - 1 ? "border-b border-[#1E1E26]" : ""
                }`}
              >
                {/* Feature */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#4F8EFF]/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-[#4F8EFF]" />
                  </div>
                  <span className="font-medium text-sm">{item.feature}</span>
                </div>

                {/* Us */}
                <div className="flex items-center justify-center gap-2 text-center">
                  <div className="w-5 h-5 rounded-full bg-[#34D399]/10 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-[#34D399]" />
                  </div>
                  <span className="text-sm text-[#8A8A95]">{item.us}</span>
                </div>

                {/* Them */}
                <div className="flex items-center justify-center gap-2 text-center">
                  <div className="w-5 h-5 rounded-full bg-[#FF4D4D]/10 flex items-center justify-center shrink-0">
                    <X className="w-3 h-3 text-[#FF4D4D]" />
                  </div>
                  <span className="text-sm text-[#555]">{item.them}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
