"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "cybercomplaint-draft";

export interface ReportData {
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
}

const INITIAL_DATA: ReportData = {
  category: "",
  subcategory: "",
  date: "",
  time: "",
  description: "",
  location: "",
  lostMoney: false,
  amount: "",
  files: [],
  notes: "",
  name: "",
  email: "",
  phone: "",
  state: "",
  district: "",
};

export function useReportData() {
  const [data, setData] = useState<ReportData>(INITIAL_DATA);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setData(parsed.data);
        setSavedAt(parsed.savedAt);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ data, savedAt: new Date().toISOString() })
      );
      setSavedAt(new Date().toISOString());
    }, 500);
    return () => clearTimeout(timeout);
  }, [data]);

  const updateData = useCallback((patch: Partial<ReportData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetData = useCallback(() => {
    setData(INITIAL_DATA);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { data, updateData, resetData, savedAt };
}
