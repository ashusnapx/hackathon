"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useReportData } from "@/lib/use-report-data";
import { Kavach } from "@/components/Kavach";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu and Kashmir",
  "Ladakh","Puducherry","Chandigarh","Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu","Lakshadweep",
];

export default function DetailsPage() {
  const router = useRouter();
  const { data, updateData } = useReportData();
  const [form, setForm] = useState({
    name: data.name,
    email: data.email,
    phone: data.phone,
    state: data.state,
    district: data.district,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim() || !form.email.includes("@"))
      e.email = "Valid email is required";
    if (!form.phone.trim() || form.phone.length < 10)
      e.phone = "Valid phone number is required";
    if (!form.state) e.state = "State is required";
    if (!form.district.trim()) e.district = "District is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = () => {
    if (!validate()) return;
    updateData(form);
    router.push("/report/review");
  };

  const inputClass = (field: string) =>
    `w-full h-12 px-4 bg-card border rounded-xl text-foreground text-sm placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${
      errors[field] ? "border-destructive" : "border-border"
    }`;

  return (
    <div>
      <div className="flex items-start gap-4 mb-8">
        <Kavach mood="happy" size="sm" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">
            Your details
          </h1>
          <p className="text-muted-foreground text-sm">
            We need your contact info. Your data stays in your browser.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">Full name *</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="As per your ID" className={inputClass("name")} />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">Email *</label>
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com" className={inputClass("email")} />
          {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">Phone *</label>
          <div className="flex gap-2">
            <div className="w-20 h-12 px-3 bg-muted border border-border rounded-xl text-foreground text-sm flex items-center justify-center">+91</div>
            <input type="tel" value={form.phone} maxLength={10}
              onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })}
              placeholder="10-digit mobile" className={`flex-1 ${inputClass("phone")}`} />
          </div>
          {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">State *</label>
          <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}
            className={inputClass("state")}>
            <option value="">Select state</option>
            {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.state && <p className="text-xs text-destructive mt-1">{errors.state}</p>}
        </div>

        <div>
          <label className="block text-sm text-muted-foreground mb-1.5">District *</label>
          <input type="text" value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })}
            placeholder="Your district" className={inputClass("district")} />
          {errors.district && <p className="text-xs text-destructive mt-1">{errors.district}</p>}
        </div>

        <div className="p-3 bg-muted border border-border rounded-xl flex items-start gap-2">
          <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            Saved locally in your browser. Never stored on our servers.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-8">
        <button onClick={() => router.push("/report/evidence")}
          className="px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button onClick={handleContinue}
          className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
