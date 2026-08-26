"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  ArrowRight,
  Copy,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { CRIME_CATEGORIES } from "@/lib/constants";
import { Kavach } from "@/components/Kavach";

interface ReviewStepProps {
  data: {
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
  };
  onBack: () => void;
}

export function ReviewStep({ data, onBack }: ReviewStepProps) {
  const [submitted, setSubmitted] = useState(false);
  const [trackingId, setTrackingId] = useState("");
  const [copied, setCopied] = useState(false);

  const category = CRIME_CATEGORIES.find((c) => c.id === data.category);

  const handleSubmit = () => {
    const id = "38" + Math.random().toString().slice(2, 12);
    setTrackingId(id);
    setSubmitted(true);
  };

  const copyTrackingId = () => {
    navigator.clipboard.writeText(trackingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <Kavach mood="celebrating" size="lg" className="mx-auto mb-6" />

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
          Complaint submitted!
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Your complaint has been prepared. Use the tracking ID below to
          file it on the official portal.
        </p>

        {/* Tracking ID */}
        <div className="inline-block bg-card border border-success/30 rounded-2xl p-6 mb-8">
          <div className="text-xs text-muted-foreground mb-2">
            Your tracking ID
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-mono font-bold text-success">
              {trackingId}
            </span>
            <button
              onClick={copyTrackingId}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Copy
                className={`w-4 h-4 ${
                  copied ? "text-success" : "text-muted-foreground"
                }`}
              />
            </button>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            {copied ? "Copied!" : "Copy this ID"}
          </div>
        </div>

        {/* Next steps */}
        <div className="bg-card border border-border rounded-2xl p-6 text-left max-w-md mx-auto mb-8">
          <h3 className="font-semibold mb-4">What to do next:</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <div className="text-sm font-medium">
                  Call 1930 immediately
                </div>
                <div className="text-xs text-muted-foreground">
                  If you lost money, call the cyber crime helpline right now
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ExternalLink className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">
                  File on cybercrime.gov.in
                </div>
                <div className="text-xs text-muted-foreground">
                  Use your tracking ID to complete the filing on the official
                  portal
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <div className="text-sm font-medium">
                  Visit your local cyber cell
                </div>
                <div className="text-xs text-muted-foreground">
                  For faster action, visit the Cyber Crime Police Station in
                  your district
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://www.cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl">
              Open Official Portal
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </a>
          <a href="/">
            <Button variant="ghost" className="text-muted-foreground">
              Back to Home
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start gap-4 mb-6">
        <Kavach mood="thinking" size="sm" />
        <div>
          <h2
            tabIndex={-1}
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 outline-none"
          >
            Review your complaint
          </h2>
          <p className="text-muted-foreground text-sm">
            Check everything looks correct before submitting.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Category */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Category</div>
          <div className="text-sm font-medium">
            {category?.label || data.category}
          </div>
          {data.subcategory && (
            <div className="text-xs text-muted-foreground mt-1">
              {data.subcategory}
            </div>
          )}
        </div>

        {/* Incident */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">
            Incident details
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Date:</span>{" "}
            {data.date || "Not specified"}
            {data.time && ` at ${data.time}`}
          </div>
          <div className="text-sm mt-2 text-muted-foreground leading-relaxed">
            {data.description}
          </div>
          {data.lostMoney && (
            <div className="text-sm mt-2">
              <span className="text-amber-600">Lost amount:</span> ₹
              {Number(data.amount).toLocaleString("en-IN")}
            </div>
          )}
        </div>

        {/* Evidence */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">Evidence</div>
          <div className="text-sm">
            {data.files.length > 0
              ? `${data.files.length} file(s) attached`
              : "No files attached"}
          </div>
          {data.notes && (
            <div className="text-xs text-muted-foreground mt-2">
              {data.notes}
            </div>
          )}
        </div>

        {/* Personal details */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-xs text-muted-foreground mb-1">
            Your details
          </div>
          <div className="text-sm">{data.name}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {data.email} · {data.phone}
          </div>
          <div className="text-xs text-muted-foreground">
            {data.district}, {data.state}
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-xs text-amber-700">
          By submitting, you confirm that the information provided is
          accurate to the best of your knowledge. False complaints are
          punishable under IPC Section 182.
        </p>
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
          className="px-8 py-3 bg-success hover:bg-success/90 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          Submit Complaint
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
