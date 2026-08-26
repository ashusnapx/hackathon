import { FileText, Send, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: FileText,
    number: "01",
    title: "Answer simple questions",
    description: "We ask in plain language. No legal jargon.",
  },
  {
    icon: Send,
    number: "02",
    title: "We file it for you",
    description: "Auto-formats for the government portal. No copy-paste.",
  },
  {
    icon: CheckCircle,
    number: "03",
    title: "Get your receipt",
    description: "Download PDF. Track status. Know your next steps.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-surface-elevated/50">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Three steps. Five minutes.
          </h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Your progress auto-saves. Close the browser, come back later.
          </p>
        </div>

        {/* Steps - horizontal */}
        <div className="grid sm:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="relative group">
                {/* Connector line - desktop only */}
                {i < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-8 left-[calc(50%+40px)] right-[calc(-50%+40px)] h-[1px] bg-border" />
                )}

                <div className="relative text-center">
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary/15 transition-colors">
                    <Icon className="w-7 h-7 text-primary" />
                  </div>

                  {/* Step number */}
                  <div className="text-xs font-mono text-muted-foreground mb-2">
                    STEP {step.number}
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
