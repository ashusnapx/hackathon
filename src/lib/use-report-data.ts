"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

function save(data: ReportData) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ data, savedAt: new Date().toISOString() })
  );
}

export function useReportData() {
  const [data, setData] = useState<ReportData>(INITIAL_DATA);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setData(parsed.data);
        dataRef.current = parsed.data;
        setSavedAt(parsed.savedAt);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save to localStorage on change (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      save(data);
      setSavedAt(new Date().toISOString());
    }, 300);
    return () => clearTimeout(timeout);
  }, [data]);

  // Flush immediately on unmount
  useEffect(() => {
    return () => {
      save(dataRef.current);
    };
  }, []);

  const updateData = useCallback((patch: Partial<ReportData>) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      dataRef.current = next;
      return next;
    });
  }, []);

  const resetData = useCallback(() => {
    setData(INITIAL_DATA);
    dataRef.current = INITIAL_DATA;
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { data, updateData, resetData, savedAt };
}
