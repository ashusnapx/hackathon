"use client";

import { useState } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { Kavach } from "@/components/Kavach";

interface IncidentStepProps {
  data: {
    date: string;
    time: string;
    description: string;
    location: string;
    lostMoney: boolean;
    amount: string;
  };
  onNext: (data: IncidentStepProps["data"]) => void;
  onBack: () => void;
}

export function IncidentStep({ data, onNext, onBack }: IncidentStepProps) {
  const [form, setForm] = useState(data);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.date) newErrors.date = "Date is required";
    if (!form.description || form.description.length < 20)
      newErrors.description = "Description must be at least 20 characters";
    if (form.lostMoney && !form.amount)
      newErrors.amount = "Amount is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onNext(form);
  };

  return (
    <div>
      <div className="flex items-start gap-4 mb-6">
        <Kavach mood="thinking" size="sm" />
        <div>
          <h2
            tabIndex={-1}
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 outline-none"
          >
            Tell us what happened
          </h2>
          <p className="text-muted-foreground text-sm">
            Describe the incident. Be as detailed as possible.
          </p>
        </div>
      </div>

      {/* Golden hour warning */}
      {form.lostMoney && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-medium text-amber-700">
              Golden Hour Alert
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Financial fraud recovery drops from 52% to 3% after 24 hours.
              Call 1930 immediately if you haven&apos;t already.
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Date and Time */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              Date of incident *
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={`w-full h-12 px-4 bg-card border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${
                errors.date ? "border-destructive" : "border-border"
              }`}
            />
            {errors.date && (
              <p className="text-xs text-destructive mt-1">{errors.date}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              Approximate time
            </label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="w-full h-12 px-4 bg-card border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">
            What happened? *
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            placeholder="Describe the incident in detail. What happened? How did you discover it? What information was involved?"
            rows={4}
            className={`w-full px-4 py-3 bg-card border rounded-xl text-foreground text-sm placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none ${
              errors.description ? "border-destructive" : "border-border"
            }`}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : (
              <span />
            )}
            <span
              className={`text-xs ${
                form.description.length < 20
                  ? "text-muted-foreground"
                  : "text-success"
              }`}
            >
              {form.description.length}/200 min
            </span>
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">
            Where did it happen?
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g., WhatsApp, Instagram, email, phone call, website"
            className="w-full h-12 px-4 bg-card border border-border rounded-xl text-foreground text-sm placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

        {/* Lost money */}
        <div>
          <label className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl cursor-pointer hover:border-primary/30 transition-colors">
            <input
              type="checkbox"
              checked={form.lostMoney}
              onChange={(e) =>
                setForm({ ...form, lostMoney: e.target.checked })
              }
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <div className="text-sm font-medium">
                I lost money in this incident
              </div>
              <div className="text-xs text-muted-foreground">
                If yes, you&apos;ll need to provide transaction details
              </div>
            </div>
          </label>
        </div>

        {/* Amount */}
        {form.lostMoney && (
          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">
              How much did you lose? (INR) *
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g., 50000"
              className={`w-full h-12 px-4 bg-card border rounded-xl text-foreground text-sm placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${
                errors.amount ? "border-destructive" : "border-border"
              }`}
            />
            {errors.amount && (
              <p className="text-xs text-destructive mt-1">{errors.amount}</p>
            )}
          </div>
        )}

        {/* Warning */}
        <div className="p-3 bg-muted border border-border rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Do not include special characters (#@$@^*&apos;*~|!) in your
            description. The official portal does not accept them.
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
