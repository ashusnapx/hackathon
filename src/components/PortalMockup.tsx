"use client";

import { motion } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  Clock,
  X,
  RefreshCw,
  ChevronDown,
} from "lucide-react";

export function PortalMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="relative w-full max-w-lg mx-auto lg:mx-0"
    >
      {/* Glow effect behind */}
      <div className="absolute -inset-4 bg-[#4F8EFF]/10 rounded-2xl blur-2xl" />

      {/* Browser chrome */}
      <div className="relative rounded-xl overflow-hidden border border-[#1E1E26] shadow-2xl">
        {/* Browser bar */}
        <div className="bg-[#0D0D12] px-4 py-2.5 flex items-center gap-2 border-b border-[#1E1E26]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28CA41]" />
          </div>
          <div className="flex-1 mx-2">
            <div className="bg-[#13131A] rounded-md px-3 py-1 text-[10px] text-[#8A8A95] font-mono truncate">
              cybercrime.gov.in/Webform/Accept.aspx
            </div>
          </div>
          <RefreshCw className="w-3 h-3 text-[#8A8A95]" />
        </div>

        {/* Portal content */}
        <div className="portal-mockup">
          {/* Portal header */}
          <div className="portal-header px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <div className="text-[9px] text-white/60 font-medium tracking-wide">
                  Government of India
                </div>
                <div className="text-[11px] text-white font-semibold">
                  National Cyber Crime Reporting Portal
                </div>
              </div>
            </div>
          </div>

          {/* Form content - intentionally cluttered */}
          <div className="p-4 space-y-3">
            {/* Breadcrumb - confusing */}
            <div className="text-[8px] text-[#8A8A95] font-mono">
              Home &gt; Report Other Cyber Crime &gt; File a Complaint &gt; Accept
            </div>

            {/* Accept checkbox - small, hard to find */}
            <div className="bg-[#1a1a2e] rounded p-2 border border-[#2a2a3e]">
              <div className="text-[9px] text-[#8A8A95] leading-relaxed mb-2">
                Please read the following instructions carefully before filing a
                complaint...
              </div>
              <label className="flex items-start gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 w-3 h-3 rounded border-[#2a2a3e]"
                  readOnly
                />
                <span className="text-[9px] text-[#8A8A95]">
                  I Accept the terms and conditions
                </span>
              </label>
            </div>

            {/* OTP section - the broken part */}
            <div className="bg-[#0d1117] rounded p-3 border border-[#2a2a3e] space-y-2">
              <div className="text-[10px] text-white/80 font-medium">
                Citizen Login
              </div>

              {/* Name field */}
              <div>
                <label className="text-[8px] text-[#8A8A95] block mb-0.5">
                  User Name *
                </label>
                <div className="bg-[#1a1a2e] rounded px-2 py-1.5 border border-[#2a2a3e] text-[9px] text-[#555]">
                  Enter your name
                </div>
              </div>

              {/* Mobile field */}
              <div>
                <label className="text-[8px] text-[#8A8A95] block mb-0.5">
                  Mobile Number *
                </label>
                <div className="flex gap-1">
                  <div className="bg-[#1a1a2e] rounded px-2 py-1.5 border border-[#2a2a3e] text-[9px] text-[#555] w-16">
                    +91
                  </div>
                  <div className="flex-1 bg-[#1a1a2e] rounded px-2 py-1.5 border border-[#2a2a3e] text-[9px] text-[#555]">
                    Enter mobile number
                  </div>
                </div>
              </div>

              {/* OTP - disabled/greyed out */}
              <div className="opacity-50">
                <label className="text-[8px] text-[#8A8A95] block mb-0.5">
                  OTP *
                </label>
                <div className="flex gap-1">
                  <div className="flex-1 bg-[#1a1a2e] rounded px-2 py-1.5 border border-[#2a2a3e] text-[9px] text-[#333]">
                    Enter OTP
                  </div>
                  <div className="bg-[#2a2a3e] rounded px-2 py-1.5 text-[8px] text-[#555]">
                    Get OTP
                  </div>
                </div>
              </div>

              {/* Captcha - confusing */}
              <div className="opacity-50">
                <label className="text-[8px] text-[#8A8A95] block mb-0.5">
                  Captcha *
                </label>
                <div className="flex gap-1 items-center">
                  <div className="bg-[#1a1a2e] rounded px-2 py-1.5 border border-[#2a2a3e] text-[9px] text-[#333] flex-1">
                    Enter captcha
                  </div>
                  <div className="bg-[#2a2a3e] rounded px-2 py-1.5 text-[8px] text-[#555]">
                    Refresh
                  </div>
                </div>
              </div>

              {/* Submit button - but it won't work */}
              <div className="pt-1">
                <div className="bg-[#0d47a1] rounded px-3 py-1.5 text-center text-[9px] text-white font-medium cursor-not-allowed">
                  Submit
                </div>
              </div>
            </div>

            {/* Error message overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 2 }}
              className="bg-[#FF4D4D]/10 border border-[#FF4D4D]/30 rounded p-2 flex items-start gap-2"
            >
              <AlertTriangle className="w-3 h-3 text-[#FF4D4D] mt-0.5 shrink-0" />
              <div className="text-[9px] text-[#FF4D4D]">
                Session expired. Please login again.
              </div>
              <X className="w-3 h-3 text-[#FF4D4D]/50 ml-auto cursor-pointer" />
            </motion.div>

            {/* Timer - showing urgency */}
            <div className="flex items-center justify-center gap-1.5 text-[9px] text-[#FBBF24]">
              <Clock className="w-3 h-3" />
              <span>Session expires in: 04:32</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating error badges */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 1.2 }}
        className="absolute -left-4 top-1/4 bg-[#FF4D4D] text-white text-[10px] font-medium px-2.5 py-1 rounded-full shadow-lg"
      >
        Session Timeout
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 1.6 }}
        className="absolute -right-4 top-2/3 bg-[#FBBF24] text-[#06060A] text-[10px] font-medium px-2.5 py-1 rounded-full shadow-lg"
      >
        OTP Failed
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 2 }}
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-[#8A8A95] text-white text-[10px] font-medium px-2.5 py-1 rounded-full shadow-lg"
      >
        No Auto-Save
      </motion.div>
    </motion.div>
  );
}
