"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useReportData } from "@/lib/use-report-data";
import { Kavach } from "@/components/Kavach";
import { motion } from "framer-motion";
import { Upload, X, FileText, Image, File, ArrowLeft, ArrowRight } from "lucide-react";

export default function EvidencePage() {
  const router = useRouter();
  const { data, updateData } = useReportData();
  const [files, setFiles] = useState(data.files);
  const [notes, setNotes] = useState(data.notes);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []).map((f) => ({
      name: f.name,
      size: f.size,
      type: f.type,
    }));
    setFiles([...files, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return Image;
    if (type.includes("pdf")) return FileText;
    return File;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleContinue = () => {
    updateData({ files, notes });
    router.push("/report/details");
  };

  return (
    <div>
      <div className="flex items-start gap-4 mb-8">
        <Kavach mood="happy" size="sm" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">
            Upload evidence
          </h1>
          <p className="text-muted-foreground text-sm">
            Screenshots, transaction confirmations, messages — anything that
            supports your complaint.
          </p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-card border border-border rounded-xl">
        <div className="text-sm font-medium mb-3">What to upload:</div>
        <div className="grid sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
          {[
            "Screenshot of chat/SMS/email",
            "Transaction confirmation (UTR/RRN)",
            "Bank SMS showing debit",
            "Fraudster's phone/UPI/email",
            "Government ID (Aadhaar/PAN)",
            "Any other documents",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              {item}
            </div>
          ))}
        </div>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/30 hover:bg-primary/[0.02] transition-all"
      >
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <div className="text-sm font-medium mb-1">Tap to browse files</div>
        <div className="text-xs text-muted-foreground">
          JPG, PNG, PDF — Max 5MB each
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={handleFileAdd}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, i) => {
            const Icon = getFileIcon(file.type);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
              >
                <Icon className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatSize(file.size)}
                  </div>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="p-1 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <label className="block text-sm text-muted-foreground mb-1.5">
          Any additional notes?
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else that might help..."
          rows={3}
          className="w-full px-4 py-3 bg-card border border-border rounded-xl text-foreground text-sm placeholder-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors resize-none"
        />
      </div>

      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => router.push("/report/incident")}
          className="px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <button
          onClick={handleContinue}
          className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
        >
          Continue <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
