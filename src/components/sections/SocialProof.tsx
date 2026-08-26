import { TrendingDown, Clock, AlertTriangle } from "lucide-react";
import { Kavach } from "@/components/Kavach";

export function SocialProof() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Big stat with Kavach */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <Kavach mood="worried" size="md" />
          </div>
          <div className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tighter text-gradient mb-4">
            78%
          </div>
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-lg mx-auto">
            of cybercrime complaints are financial frauds.
            <br />
            <span className="text-foreground font-medium">
              Recovery drops to 3% after 24 hours.
            </span>
          </p>
        </div>

        {/* Urgency indicators */}
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-border">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-success" />
            </div>
            <div>
              <div className="font-semibold mb-1">52% recovery</div>
              <div className="text-sm text-muted-foreground">
                if filed within 1 hour
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 p-6 rounded-2xl bg-card border border-border">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <TrendingDown className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <div className="font-semibold mb-1">3% recovery</div>
              <div className="text-sm text-muted-foreground">
                if filed after 24 hours
              </div>
            </div>
          </div>
        </div>

        {/* Portal broken callout with SVG */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="relative p-6 rounded-2xl bg-card border border-border overflow-hidden">
            {/* Decorative SVG */}
            <div className="absolute top-4 right-4 opacity-10">
              <AlertTriangle className="w-24 h-24 text-amber-500" />
            </div>

            <div className="relative flex items-start gap-4">
              <Kavach mood="worried" size="sm" />
              <div>
                <h3 className="font-semibold mb-1">
                  The official portal has problems
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Session timeouts, broken OTP, captcha errors. Users report
                  8+ failed attempts before giving up. We built CyberComplaint
                  to fix this.
                </p>
                {/* Inline SVG — broken portal illustration */}
                <svg
                  className="mt-4 w-full max-w-xs"
                  viewBox="0 0 200 80"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-label="Broken portal illustration"
                >
                  {/* Browser window */}
                  <rect
                    x="10"
                    y="5"
                    width="180"
                    height="70"
                    rx="6"
                    fill="#F9FAFB"
                    stroke="#E5E7EB"
                    strokeWidth="1.5"
                  />
                  {/* Title bar */}
                  <rect x="10" y="5" width="180" height="14" rx="6" fill="#F3F4F6" />
                  <circle cx="20" cy="12" r="2.5" fill="#DC2626" opacity="0.6" />
                  <circle cx="28" cy="12" r="2.5" fill="#F59E0B" opacity="0.6" />
                  <circle cx="36" cy="12" r="2.5" fill="#16A34A" opacity="0.6" />
                  {/* URL bar */}
                  <rect x="50" y="9" width="80" height="6" rx="3" fill="#E5E7EB" />
                  {/* Content lines */}
                  <rect x="20" y="26" width="60" height="4" rx="2" fill="#E5E7EB" />
                  <rect x="20" y="34" width="100" height="3" rx="1.5" fill="#F3F4F6" />
                  <rect x="20" y="40" width="80" height="3" rx="1.5" fill="#F3F4F6" />
                  {/* Error indicators */}
                  <rect x="20" y="50" width="70" height="18" rx="4" fill="#FEF2F2" stroke="#FECACA" strokeWidth="1" />
                  <text x="30" y="62" fontSize="7" fill="#DC2626" fontFamily="monospace">Session Timeout</text>
                  {/* Crack lines */}
                  <path d="M 140 30 L 145 40 L 138 50 L 150 60" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                  <path d="M 160 25 L 155 38 L 162 48" stroke="#F59E0B" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                  {/* X marks */}
                  <g opacity="0.4">
                    <path d="M 155 45 L 160 50 M 160 45 L 155 50" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
