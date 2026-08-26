"use client";

import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Chatbot } from "@/components/chatbot/Chatbot";

const STEPS = [
  { path: "/report/category", label: "Category", id: 1 },
  { path: "/report/incident", label: "Incident", id: 2 },
  { path: "/report/evidence", label: "Evidence", id: 3 },
  { path: "/report/details", label: "Details", id: 4 },
  { path: "/report/review", label: "Review", id: 5 },
];

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentIdx = STEPS.findIndex((s) => s.path === pathname);
  const currentStep = currentIdx >= 0 ? currentIdx + 1 : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <Logo size="sm" />
          </Link>
          <div className="text-xs text-muted-foreground">
            {currentStep > 0 && `Step ${currentStep} of ${STEPS.length}`}
          </div>
        </div>
      </header>

      {/* Progress stepper */}
      {currentStep > 0 && (
        <div className="max-w-4xl mx-auto px-6 pt-6">
          <div className="hidden sm:flex items-center justify-between relative max-w-2xl mx-auto mb-8">
            <div className="absolute top-5 left-[10%] right-[10%] h-[2px] bg-border" />
            <div
              className="absolute top-5 left-[10%] h-[2px] bg-primary transition-all duration-500"
              style={{
                width: `${((currentStep - 1) / (STEPS.length - 1)) * 80}%`,
              }}
            />
            {STEPS.map((step) => {
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <Link
                  key={step.id}
                  href={step.path}
                  className="relative z-10 flex flex-col items-center"
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                        ? "bg-primary/10 text-primary border-2 border-primary"
                        : "bg-card text-muted-foreground border border-border"
                    }`}
                  >
                    {isCompleted ? "✓" : step.id}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium ${
                      isCurrent
                        ? "text-primary"
                        : isCompleted
                        ? "text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </Link>
              );
            })}
          </div>
          {/* Mobile stepper */}
          <div className="sm:hidden mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-primary">
                Step {currentStep} of {STEPS.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {STEPS[currentStep - 1]?.label}
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 pb-32">{children}</div>

      {/* Chatbot */}
      <Chatbot currentStep={currentStep} pathname={pathname} />
    </div>
  );
}
