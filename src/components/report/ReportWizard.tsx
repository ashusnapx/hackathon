"use client";

import { useState, useEffect, useCallback } from "react";
import { ProgressStepper } from "./ProgressStepper";
import { CategoryStep } from "./steps/CategoryStep";
import { IncidentStep } from "./steps/IncidentStep";
import { EvidenceStep } from "./steps/EvidenceStep";
import { DetailsStep } from "./steps/DetailsStep";
import { ReviewStep } from "./steps/ReviewStep";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const STORAGE_KEY = "cybercomplaint-draft";

interface ReportData {
  category: string;
  subcategory: string;
  date: string;
  time: string;
  description: string;
  location: string;
  lostMoney: boolean;
  amount: string;
  files: Array<{ name: string; size: number; type: string }>;
  notes: string;
  name: string;
  email: string;
  phone: string;
  state: string;
  district: string;
}

const INITIAL_DATA: ReportData = {
  category: "",
  subcategory: "",
  date: "",
  time: "",
  description: "",
  location: "",
  lostMoney: false,
  amount: "",
  files: [],
  notes: "",
  name: "",
  email: "",
  phone: "",
  state: "",
  district: "",
};

export function ReportWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [data, setData] = useState<ReportData>(INITIAL_DATA);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setData(parsed.data);
        setCurrentStep(parsed.currentStep);
        setCompletedSteps(parsed.completedSteps);
        setSavedAt(parsed.savedAt);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          data,
          currentStep,
          completedSteps,
          savedAt: new Date().toISOString(),
        })
      );
      setSavedAt(new Date().toISOString());
    }, 500);

    return () => clearTimeout(timeout);
  }, [data, currentStep, completedSteps]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 1 && step <= 5) {
        setCurrentStep(step);
      }
    },
    []
  );

  const handleSelect = useCallback((stepData: Partial<ReportData>) => {
    setData((prev) => ({ ...prev, ...stepData }));
  }, []);

  const handleNext = useCallback(
    (stepData: Partial<ReportData>) => {
      setData((prev) => ({ ...prev, ...stepData }));
      setCompletedSteps((prev) =>
        prev.includes(currentStep) ? prev : [...prev, currentStep]
      );
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    },
    [currentStep]
  );

  const handleBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CategoryStep
            data={{ category: data.category, subcategory: data.subcategory }}
            onSelect={handleSelect}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <IncidentStep
            data={{
              date: data.date,
              time: data.time,
              description: data.description,
              location: data.location,
              lostMoney: data.lostMoney,
              amount: data.amount,
            }}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <EvidenceStep
            data={{ files: data.files, notes: data.notes }}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <DetailsStep
            data={{
              name: data.name,
              email: data.email,
              phone: data.phone,
              state: data.state,
              district: data.district,
            }}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 5:
        return <ReviewStep data={data} onBack={handleBack} />;
      default:
        return null;
    }
  };

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
            {savedAt && (
              <span>
                Saved{" "}
                {new Date(savedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Progress stepper */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <ProgressStepper
          currentStep={currentStep}
          completedSteps={completedSteps}
        />
      </div>

      {/* Step content */}
      <div className="max-w-2xl mx-auto px-6 py-8 pb-24">
        {renderStep()}
      </div>
    </div>
  );
}
