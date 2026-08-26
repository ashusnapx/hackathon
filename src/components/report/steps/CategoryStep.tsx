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
  "women-child": "from-[#EC4899] to-[#EC4899]/80",
  "financial-fraud": "from-[#FBBF24] to-[#FBBF24]/80",
  "social-media": "from-[#8B5CF6] to-[#8B5CF6]/80",
  hacking: "from-[#EF4444] to-[#EF4444]/80",
  crypto: "from-[#F97316] to-[#F97316]/80",
  trafficking: "from-[#06B6D4] to-[#06B6D4]/80",
  gambling: "from-[#10B981] to-[#10B981]/80",
  other: "from-[#6B7280] to-[#6B7280]/80",
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
      // Just select — show subcategories, don't advance
      onSelect({ category: catId, subcategory: "" });
    } else {
      // No subcategories — advance immediately
      onNext({ category: catId, subcategory: "" });
    }
  };

  return (
    <div>
      <h2
        tabIndex={-1}
        className="text-2xl sm:text-3xl font-heading mb-2 outline-none"
      >
        What happened?
      </h2>
      <p className="text-[#8A8A95] mb-8">
        Select the type of cybercrime you want to report.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        {CRIME_CATEGORIES.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.id] || HelpCircle;
          const color =
            CATEGORY_COLORS[cat.id] || "from-[#6B7280] to-[#6B7280]/80";
          const isSelected = data.category === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? "border-[#4F8EFF] bg-[#4F8EFF]/10"
                  : "border-[#1E1E26] bg-[#0D0D12] hover:border-[#4F8EFF]/30"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{cat.label}</div>
                <div className="text-xs text-[#555] truncate">
                  {cat.description}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#555] shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Subcategory selection */}
      {hasSubcategories && (
        <div className="mt-6 p-4 bg-[#0D0D12] border border-[#1E1E26] rounded-xl">
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
                    ? "bg-[#4F8EFF] text-white"
                    : "bg-[#13131A] text-[#8A8A95] hover:bg-[#1E1E26]"
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
