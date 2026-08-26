"use client";

import { useState } from "react";

interface DetailsStepProps {
  data: {
    name: string;
    email: string;
    phone: string;
    state: string;
    district: string;
  };
  onNext: (data: DetailsStepProps["data"]) => void;
  onBack: () => void;
}

const STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
  "Chandigarh",
  "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Lakshadweep",
];

export function DetailsStep({ data, onNext, onBack }: DetailsStepProps) {
  const [form, setForm] = useState(data);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email.trim() || !form.email.includes("@"))
      newErrors.email = "Valid email is required";
    if (!form.phone.trim() || form.phone.length < 10)
      newErrors.phone = "Valid phone number is required";
    if (!form.state) newErrors.state = "State is required";
    if (!form.district.trim()) newErrors.district = "District is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) onNext(form);
  };

  return (
    <div>
      <h2
        tabIndex={-1}
        className="text-2xl sm:text-3xl font-heading mb-2 outline-none"
      >
        Your details
      </h2>
      <p className="text-[#8A8A95] mb-8">
        We need your contact info to file the complaint. Your data stays in
        your browser.
      </p>

      <div className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm text-[#8A8A95] mb-1.5">
            Full name *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="As per your ID"
            className={`w-full h-12 px-4 bg-[#13131A] border rounded-xl text-foreground text-sm placeholder-[#555] focus:outline-none focus:border-[#4F8EFF] focus:ring-1 focus:ring-[#4F8EFF] transition-colors ${
              errors.name ? "border-[#FF4D4D]" : "border-[#1E1E26]"
            }`}
          />
          {errors.name && (
            <p className="text-xs text-[#EF4444] mt-1">{errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm text-[#8A8A95] mb-1.5">
            Email address *
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@example.com"
            className={`w-full h-12 px-4 bg-[#13131A] border rounded-xl text-foreground text-sm placeholder-[#555] focus:outline-none focus:border-[#4F8EFF] focus:ring-1 focus:ring-[#4F8EFF] transition-colors ${
              errors.email ? "border-[#FF4D4D]" : "border-[#1E1E26]"
            }`}
          />
          {errors.email && (
            <p className="text-xs text-[#EF4444] mt-1">{errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm text-[#8A8A95] mb-1.5">
            Phone number *
          </label>
          <div className="flex gap-2">
            <div className="w-20 h-12 px-3 bg-[#13131A] border border-[#1E1E26] rounded-xl text-foreground text-sm flex items-center justify-center">
              +91
            </div>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })
              }
              placeholder="10-digit mobile number"
              maxLength={10}
              className={`flex-1 h-12 px-4 bg-[#13131A] border rounded-xl text-foreground text-sm placeholder-[#555] focus:outline-none focus:border-[#4F8EFF] focus:ring-1 focus:ring-[#4F8EFF] transition-colors ${
                errors.phone ? "border-[#FF4D4D]" : "border-[#1E1E26]"
              }`}
            />
          </div>
          {errors.phone && (
            <p className="text-xs text-[#EF4444] mt-1">{errors.phone}</p>
          )}
        </div>

        {/* State */}
        <div>
          <label className="block text-sm text-[#8A8A95] mb-1.5">
            State *
          </label>
          <select
            value={form.state}
            onChange={(e) => setForm({ ...form, state: e.target.value })}
            className={`w-full h-12 px-4 bg-[#13131A] border rounded-xl text-foreground text-sm focus:outline-none focus:border-[#4F8EFF] focus:ring-1 focus:ring-[#4F8EFF] transition-colors ${
              errors.state ? "border-[#FF4D4D]" : "border-[#1E1E26]"
            }`}
          >
            <option value="">Select state</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {errors.state && (
            <p className="text-xs text-[#EF4444] mt-1">{errors.state}</p>
          )}
        </div>

        {/* District */}
        <div>
          <label className="block text-sm text-[#8A8A95] mb-1.5">
            District *
          </label>
          <input
            type="text"
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
            placeholder="Your district"
            className={`w-full h-12 px-4 bg-[#13131A] border rounded-xl text-foreground text-sm placeholder-[#555] focus:outline-none focus:border-[#4F8EFF] focus:ring-1 focus:ring-[#4F8EFF] transition-colors ${
              errors.district ? "border-[#FF4D4D]" : "border-[#1E1E26]"
            }`}
          />
          {errors.district && (
            <p className="text-xs text-[#EF4444] mt-1">{errors.district}</p>
          )}
        </div>

        {/* Privacy note */}
        <div className="p-3 bg-[#13131A] border border-[#1E1E26] rounded-xl">
          <p className="text-xs text-[#8A8A95]">
            Your details are saved locally in your browser. They are only
            transmitted when you submit to the official portal. We never
            store your personal data on our servers.
          </p>
        </div>
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
          className="px-8 py-3 bg-[#4F8EFF] hover:bg-[#3D7AE6] text-white rounded-xl text-sm font-medium transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
