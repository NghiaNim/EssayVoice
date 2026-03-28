"use client";

import { useState } from "react";

interface EssayOutputProps {
  essay: string;
  onReset: () => void;
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export default function EssayOutput({ essay, onReset }: EssayOutputProps) {
  const [copied, setCopied] = useState(false);
  const wordCount = countWords(essay);

  async function handleCopy() {
    await navigator.clipboard.writeText(essay);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
        <div>
          <h3 className="font-semibold text-slate-800">Generated Essay</h3>
          <p className="text-xs text-slate-500 mt-0.5">{wordCount} words</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={onReset}
            className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-colors"
          >
            New Essay
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="prose prose-slate max-w-none">
          {essay.split("\n\n").map((paragraph, i) => (
            <p key={i} className="text-slate-700 leading-relaxed mb-4 last:mb-0">
              {paragraph.split("\n").map((line, j) => (
                <span key={j}>
                  {line}
                  {j < paragraph.split("\n").length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
