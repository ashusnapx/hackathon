"use client";

import { useRouter } from "next/navigation";
import { useReportData } from "@/lib/use-report-data";
import { CRIME_CATEGORIES } from "@/lib/constants";
import { Kavach } from "@/components/Kavach";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  CreditCard,
  Share2,
  Globe,
  Bitcoin,
  Truck,
  Gamepad2,
  HelpCircle,
  ChevronRight,
} from "lucide-react";

const ICONS: Record<string, React.ElementType> = {
  "women-child": Users,
  "financial-fraud": CreditCard,
  "social-media": Share2,
  hacking: Globe,
  crypto: Bitcoin,
  trafficking: Truck,
  gambling: Gamepad2,
  other: HelpCircle,
};

const COLORS: Record<string, string> = {
  "women-child": "from-pink-500 to-pink-400",
  "financial-fraud": "from-amber-500 to-amber-400",
  "social-media": "from-violet-500 to-violet-400",
  hacking: "from-red-500 to-red-400",
  crypto: "from-orange-500 to-orange-400",
  trafficking: "from-cyan-500 to-cyan-400",
  gambling: "from-emerald-500 to-emerald-400",
  other: "from-gray-500 to-gray-400",
};

export default function CategoryPage() {
  const router = useRouter();
  const { data, updateData } = useReportData();

  const selectedCategory = CRIME_CATEGORIES.find(
    (c) => c.id === data.category
  );
  const hasSubs =
    selectedCategory && "subcategories" in selectedCategory;

  const handleCategoryClick = (catId: string) => {
    const cat = CRIME_CATEGORIES.find((c) => c.id === catId);
    const catHasSubs = cat && "subcategories" in cat;
    if (catHasSubs) {
      updateData({ category: catId, subcategory: "" });
    } else {
      updateData({ category: catId, subcategory: "" });
      router.push("/report/incident");
    }
  };

  const handleSubcategoryClick = (sub: string) => {
    updateData({ subcategory: sub });
    router.push("/report/incident");
  };

  return (
    <div>
      <div className="flex items-start gap-4 mb-8">
        <Kavach mood="happy" size="sm" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">
            What happened?
          </h1>
          <p className="text-muted-foreground text-sm">
            Select the type of cybercrime you want to report.
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {CRIME_CATEGORIES.map((cat) => {
          const Icon = ICONS[cat.id] || HelpCircle;
          const color = COLORS[cat.id] || "from-gray-500 to-gray-400";
          const isSelected = data.category === cat.id;

          return (
            <motion.button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{cat.label}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {cat.description}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </motion.button>
          );
        })}
      </div>

      {/* Subcategory selection */}
      <AnimatePresence>
        {hasSubs && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="mt-6 p-4 bg-card border border-border rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Kavach mood="thinking" size="sm" />
                <span className="text-sm font-medium">
                  Select sub-category:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedCategory!.subcategories!.map((sub) => (
                  <motion.button
                    key={sub}
                    onClick={() => handleSubcategoryClick(sub)}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      data.subcategory === sub
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {sub}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
