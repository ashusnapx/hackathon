"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, Phone, Shield, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <section className="relative min-h-[100dvh] flex items-center">
      {/* Background - subtle gradient mesh */}
      <div className="absolute inset-0 grid-bg" />
      <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-blue-50 rounded-full blur-[100px] opacity-60" />
      <div className="absolute bottom-20 left-1/3 w-[400px] h-[400px] bg-purple-50 rounded-full blur-[80px] opacity-40" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 w-full">
        <div className="max-w-3xl mx-auto text-center">
          {/* Emergency callout - subtle */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-medium mb-8"
          >
            <Phone className="w-4 h-4" />
            Lost money? Call{" "}
            <span className="font-mono font-bold">1930</span> now
          </motion.div>

          {/* Headline - bold, minimal */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.05]"
          >
            File your cybercrime
            <br />
            <span className="text-gradient">complaint in 5 min.</span>
          </motion.h1>

          {/* Subheadline - one line only */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto mb-10"
          >
            The government portal is broken. We made a better one.
            Auto-saved, guided, works on your phone.
          </motion.p>

          {/* Single CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <a href="/report">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg rounded-xl group transition-all shadow-lg shadow-primary/20"
              >
                Start Report
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </a>
          </motion.div>

          {/* Trust signals - minimal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Auto-saves progress
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Golden hour timer
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              22.5L complaints filed last year
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
