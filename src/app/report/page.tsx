"use client";

import { useRouter } from "next/navigation";
import { useReportData } from "@/lib/use-report-data";
import { Kavach } from "@/components/Kavach";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Clock, CheckCircle2 } from "lucide-react";

export default function ReportPage() {
  const router = useRouter();
  const { data } = useReportData();

  const hasDraft = !!data.category;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70dvh] text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <Kavach mood="happy" size="lg" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl sm:text-4xl font-bold tracking-tight mt-6 mb-3"
      >
        {hasDraft ? "Continue your complaint" : "Let's file your complaint"}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground max-w-md mb-8"
      >
        {hasDraft
          ? "You have a draft saved. Pick up where you left off."
          : "Kavach will guide you through each step. Your progress auto-saves, so you can close the browser and come back anytime."}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground mb-10"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-success" />
          Auto-saves
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          ~5 minutes
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Data stays in browser
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        onClick={() => router.push("/report/category")}
        className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl text-lg font-medium transition-all shadow-lg shadow-primary/20 group flex items-center gap-2"
      >
        {hasDraft ? "Continue" : "Start"}
        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </motion.button>
    </div>
  );
}
