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
    // Mock submission
    const id =
      "38" +
      Math.random().toString().slice(2, 12);
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
        <div className="w-20 h-20 rounded-full bg-[#34D399]/10 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-[#34D399]" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-heading mb-3">
          Complaint submitted!
        </h2>
        <p className="text-[#8A8A95] mb-8 max-w-md mx-auto">
          Your complaint has been prepared. Use the tracking ID below to
          file it on the official portal.
        </p>

        {/* Tracking ID */}
        <div className="inline-block bg-[#0D0D12] border border-[#34D399]/30 rounded-2xl p-6 mb-8">
          <div className="text-xs text-[#555] mb-2">
            Your tracking ID
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-mono font-bold text-[#34D399]">
              {trackingId}
            </span>
            <button
              onClick={copyTrackingId}
              className="p-2 hover:bg-[#1E1E26] rounded-lg transition-colors"
            >
              <Copy
                className={`w-4 h-4 ${
                  copied ? "text-[#34D399]" : "text-[#555]"
                }`}
              />
            </button>
          </div>
          <div className="text-xs text-[#555] mt-2">
            {copied ? "Copied!" : "Copy this ID"}
          </div>
        </div>

        {/* Next steps */}
        <div className="bg-[#0D0D12] border border-[#1E1E26] rounded-2xl p-6 text-left max-w-md mx-auto mb-8">
          <h3 className="font-semibold mb-4">What to do next:</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FBBF24]/10 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-[#FBBF24]" />
              </div>
              <div>
                <div className="text-sm font-medium">
                  Call 1930 immediately
                </div>
                <div className="text-xs text-[#555]">
                  If you lost money, call the cyber crime helpline right now
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#4F8EFF]/10 flex items-center justify-center shrink-0">
                <ExternalLink className="w-4 h-4 text-[#4F8EFF]" />
              </div>
              <div>
                <div className="text-sm font-medium">
                  File on cybercrime.gov.in
                </div>
                <div className="text-xs text-[#555]">
                  Use your tracking ID to complete the filing on the official
                  portal
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-[#8B5CF6]" />
              </div>
              <div>
                <div className="text-sm font-medium">
                  Visit your local cyber cell
                </div>
                <div className="text-xs text-[#555]">
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
            <Button className="bg-[#4F8EFF] hover:bg-[#3D7AE6] text-white px-6 py-3 rounded-xl">
              Open Official Portal
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </a>
          <a href="/">
            <Button variant="ghost" className="text-[#8A8A95]">
              Back to Home
            </Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2
        tabIndex={-1}
        className="text-2xl sm:text-3xl font-heading mb-2 outline-none"
      >
        Review your complaint
      </h2>
      <p className="text-[#8A8A95] mb-8">
        Check everything looks correct before submitting.
      </p>

      <div className="space-y-4">
        {/* Category */}
        <div className="bg-[#0D0D12] border border-[#1E1E26] rounded-xl p-4">
          <div className="text-xs text-[#555] mb-1">Category</div>
          <div className="text-sm font-medium">
            {category?.label || data.category}
          </div>
          {data.subcategory && (
            <div className="text-xs text-[#8A8A95] mt-1">
              {data.subcategory}
            </div>
          )}
        </div>

        {/* Incident */}
        <div className="bg-[#0D0D12] border border-[#1E1E26] rounded-xl p-4">
          <div className="text-xs text-[#555] mb-1">Incident details</div>
          <div className="text-sm">
            <span className="text-[#8A8A95]">Date:</span>{" "}
            {data.date || "Not specified"}
            {data.time && ` at ${data.time}`}
          </div>
          <div className="text-sm mt-2 text-[#8A8A95] leading-relaxed">
            {data.description}
          </div>
          {data.lostMoney && (
            <div className="text-sm mt-2">
              <span className="text-[#FBBF24]">Lost amount:</span> ₹
              {Number(data.amount).toLocaleString("en-IN")}
            </div>
          )}
        </div>

        {/* Evidence */}
        <div className="bg-[#0D0D12] border border-[#1E1E26] rounded-xl p-4">
          <div className="text-xs text-[#555] mb-1">Evidence</div>
          <div className="text-sm">
            {data.files.length > 0
              ? `${data.files.length} file(s) attached`
              : "No files attached"}
          </div>
          {data.notes && (
            <div className="text-xs text-[#8A8A95] mt-2">{data.notes}</div>
          )}
        </div>

        {/* Personal details */}
        <div className="bg-[#0D0D12] border border-[#1E1E26] rounded-xl p-4">
          <div className="text-xs text-[#555] mb-1">Your details</div>
          <div className="text-sm">{data.name}</div>
          <div className="text-xs text-[#8A8A95] mt-1">
            {data.email} · {data.phone}
          </div>
          <div className="text-xs text-[#8A8A95]">
            {data.district}, {data.state}
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="mt-6 p-4 bg-[#FBBF24]/10 border border-[#FBBF24]/30 rounded-xl">
        <p className="text-xs text-[#FBBF24]">
          By submitting, you confirm that the information provided is
          accurate to the best of your knowledge. False complaints are
          punishable under IPC Section 182.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={onBack}
          className="px-6 py-3 text-sm text-[#8A8A95] hover:text-foreground transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          className="px-8 py-3 bg-[#34D399] hover:bg-[#2ABD86] text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          Submit Complaint
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
