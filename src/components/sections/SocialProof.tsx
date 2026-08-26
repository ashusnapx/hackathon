import { TrendingDown, Clock } from "lucide-react";

export function SocialProof() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Big stat */}
        <div className="text-center mb-16">
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
      </div>
    </section>
  );
}
