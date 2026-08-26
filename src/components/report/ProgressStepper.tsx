"use client";

import { Check } from "lucide-react";

const STEPS = [
  { id: 1, label: "Category" },
  { id: 2, label: "Incident" },
  { id: 3, label: "Evidence" },
  { id: 4, label: "Details" },
  { id: 5, label: "Review" },
];

interface ProgressStepperProps {
  currentStep: number;
  completedSteps: number[];
}

export function ProgressStepper({
  currentStep,
  completedSteps,
}: ProgressStepperProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      {/* Desktop stepper */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Connection line */}
        <div className="absolute top-5 left-[10%] right-[10%] h-[2px] bg-[#1E1E26]" />
        <div
          className="absolute top-5 left-[10%] h-[2px] bg-[#4F8EFF] transition-all duration-500"
          style={{
            width: `${((currentStep - 1) / (STEPS.length - 1)) * 80}%`,
          }}
        />

        {STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isUpcoming = !isCompleted && !isCurrent;

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  isCompleted
                    ? "bg-[#4F8EFF] text-white"
                    : isCurrent
                    ? "bg-[#4F8EFF]/20 text-[#4F8EFF] border-2 border-[#4F8EFF]"
                    : "bg-[#13131A] text-[#555] border border-[#1E1E26]"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={`text-xs mt-2 font-medium ${
                  isCurrent
                    ? "text-[#4F8EFF]"
                    : isCompleted
                    ? "text-foreground"
                    : "text-[#555]"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile stepper */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-[#4F8EFF]">
            Step {currentStep} of {STEPS.length}
          </span>
          <span className="text-sm text-[#555]">
            {STEPS[currentStep - 1].label}
          </span>
        </div>
        <div className="h-1.5 bg-[#13131A] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#4F8EFF] rounded-full transition-all duration-500"
            style={{
              width: `${(currentStep / STEPS.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
