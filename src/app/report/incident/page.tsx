"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReportData } from "@/lib/use-report-data";
import { Kavach } from "@/components/Kavach";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, ArrowLeft, ArrowRight } from "lucide-react";

export default function IncidentPage() {
  const router = useRouter();
  const { data, updateData } = useReportData();
  const [form, setForm] = useState({
    date: data.date,
    time: data.time,
    description: data.description,
    location: data.location,
    lostMoney: data.lostMoney,
    amount: data.amount,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.date) e.date = "Date is required";
    if (!form.description || form.description.length < 20)
      e.description = "Description must be at least 20 characters";
    if (form.lostMoney && !form.amount) e.amount = "Amount is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    updateData(form);
    router.push("/report/evidence");
  };

  return (
    <div>
      <div className="flex items-start gap-4 mb-8">
        <Kavach mood="thinking" size="sm" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">
            Tell us what happened
          </h1>
          <p className="text-muted-foreground text-sm">
            Describe the incident. Be as detailed as possible.
          </p>
        </div>
      </div>

      {form.lostMoney && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3"
        >
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
        </motion.div>
      )}

      <div className="space-y-5">
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

        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">
            What happened? *
          </label>
          <textarea
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
            placeholder="Describe the incident in detail..."
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

        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">
            Where did it happen?
          </label>
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="e.g., WhatsApp, Instagram, email, phone call"
            className="w-full h-12 px-4 bg-card border border-border rounded-xl text-foreground text-sm placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>

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
            <div className="text-sm font-medium">I lost money</div>
            <div className="text-xs text-muted-foreground">
              You&apos;ll need to provide transaction details
            </div>
          </div>
        </label>

        {form.lostMoney && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
          >
            <label className="block text-sm text-muted-foreground mb-1.5">
              How much? (INR) *
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
          </motion.div>
        )}

        <div className="p-3 bg-muted border border-border rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            No special characters (#@$@^*&apos;*~|!) in description. The
            official portal rejects them.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => router.push("/report/category")}
          className="px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleContinue}
          className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
