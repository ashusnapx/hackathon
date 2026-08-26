"use client";

import { CRIME_CATEGORIES } from "@/lib/constants";
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

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "women-child": Users,
  "financial-fraud": CreditCard,
  "social-media": Share2,
  hacking: Globe,
  crypto: Bitcoin,
  trafficking: Truck,
  gambling: Gamepad2,
  other: HelpCircle,
};

const CATEGORY_COLORS: Record<string, string> = {
  "women-child": "from-pink-500 to-pink-400",
  "financial-fraud": "from-amber-500 to-amber-400",
  "social-media": "from-violet-500 to-violet-400",
  hacking: "from-red-500 to-red-400",
  crypto: "from-orange-500 to-orange-400",
  trafficking: "from-cyan-500 to-cyan-400",
  gambling: "from-emerald-500 to-emerald-400",
  other: "from-gray-500 to-gray-400",
};

interface CategoryStepProps {
  data: { category: string; subcategory: string };
  onSelect: (data: { category: string; subcategory: string }) => void;
  onNext: (data: { category: string; subcategory: string }) => void;
}

export function CategoryStep({ data, onSelect, onNext }: CategoryStepProps) {
  const selectedCategory = CRIME_CATEGORIES.find(
    (c) => c.id === data.category
  );
  const hasSubcategories =
    selectedCategory && "subcategories" in selectedCategory;

  const handleCategoryClick = (catId: string) => {
    const cat = CRIME_CATEGORIES.find((c) => c.id === catId);
    const catHasSubs = cat && "subcategories" in cat;

    if (catHasSubs) {
      onSelect({ category: catId, subcategory: "" });
    } else {
      onNext({ category: catId, subcategory: "" });
    }
  };

  return (
    <div>
      <h2
        tabIndex={-1}
        className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 outline-none"
      >
        What happened?
      </h2>
      <p className="text-muted-foreground mb-8">
        Select the type of cybercrime you want to report.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {CRIME_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id] || HelpCircle;
          const color =
            CATEGORY_COLORS[cat.id] || "from-gray-500 to-gray-400";
          const isSelected = data.category === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
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
            </button>
          );
        })}
      </div>

      {/* Subcategory selection */}
      {hasSubcategories && (
        <div className="mt-6 p-4 bg-card border border-border rounded-xl">
          <div className="text-sm font-medium mb-3">
            Select sub-category:
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCategory.subcategories.map((sub) => (
              <button
                key={sub}
                onClick={() =>
                  onNext({ category: data.category, subcategory: sub })
                }
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  data.subcategory === sub
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
