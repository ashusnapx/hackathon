"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Image, File } from "lucide-react";

interface EvidenceStepProps {
  data: {
    files: Array<{ name: string; size: number; type: string }>;
    notes: string;
  };
  onNext: (data: EvidenceStepProps["data"]) => void;
  onBack: () => void;
}

export function EvidenceStep({ data, onNext, onBack }: EvidenceStepProps) {
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

  return (
    <div>
      <h2
        tabIndex={-1}
        className="text-2xl sm:text-3xl font-heading mb-2 outline-none"
      >
        Upload evidence
      </h2>
      <p className="text-[#8A8A95] mb-8">
        Screenshots, transaction confirmations, messages — anything that
        supports your complaint.
      </p>

      {/* Evidence checklist */}
      <div className="mb-6 p-4 bg-[#0D0D12] border border-[#1E1E26] rounded-xl">
        <div className="text-sm font-medium mb-3">
          What to upload (if you have it):
        </div>
        <div className="grid sm:grid-cols-2 gap-2 text-xs text-[#8A8A95]">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            Screenshot of chat/SMS/email
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            Transaction confirmation (UTR/RRN)
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            Bank SMS showing debit
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            Fraudster&apos;s phone/UPI/email
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            Government ID (Aadhaar/PAN)
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            Any other identifying documents
          </div>
        </div>
      </div>

      {/* Upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-[#1E1E26] rounded-xl p-8 text-center cursor-pointer hover:border-[#4F8EFF]/30 hover:bg-[#4F8EFF]/[0.02] transition-all"
      >
        <Upload className="w-10 h-10 text-[#555] mx-auto mb-3" />
        <div className="text-sm font-medium mb-1">
          Tap to browse or drag files here
        </div>
        <div className="text-xs text-[#555]">
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

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, i) => {
            const Icon = getFileIcon(file.type);
            return (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-[#0D0D12] border border-[#1E1E26] rounded-xl"
              >
                <Icon className="w-5 h-5 text-[#4F8EFF] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{file.name}</div>
                  <div className="text-xs text-[#555]">
                    {formatSize(file.size)}
                  </div>
                </div>
                <button
                  onClick={() => removeFile(i)}
                  className="p-1 hover:bg-[#1E1E26] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-[#555]" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Additional notes */}
      <div className="mt-6">
        <label className="block text-sm text-[#8A8A95] mb-1.5">
          Any additional notes?
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else that might help with the investigation..."
          rows={3}
          className="w-full px-4 py-3 bg-[#13131A] border border-[#1E1E26] rounded-xl text-foreground text-sm placeholder-[#555] focus:outline-none focus:border-[#4F8EFF] focus:ring-1 focus:ring-[#4F8EFF] transition-colors resize-none"
        />
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
          onClick={() => onNext({ files, notes })}
          className="px-8 py-3 bg-[#4F8EFF] hover:bg-[#3D7AE6] text-white rounded-xl text-sm font-medium transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
