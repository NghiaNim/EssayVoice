"use client";

import { useState } from "react";

interface EssayOutputProps {
  essay: string;
  isStreaming?: boolean;
  saveStatus?: "idle" | "saving" | "saved" | "error";
  onReset: () => void;
}

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export default function EssayOutput({
  essay,
  isStreaming = false,
  saveStatus = "idle",
  onReset,
}: EssayOutputProps) {
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
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-semibold text-slate-800">
              {isStreaming ? "Writing…" : "Generated Essay"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{wordCount} words</p>
          </div>
          {isStreaming && (
            <span className="w-4 h-4 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === "saving" && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-3 h-3 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
              Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs text-red-500 font-medium">Save failed</span>
          )}

          {!isStreaming && (
            <>
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
            </>
          )}
        </div>
      </div>

      <div className="p-6">
        {isStreaming ? (
          <p className="text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
            {essay}
            <span className="inline-block w-0.5 h-4 bg-violet-500 ml-0.5 animate-pulse align-text-bottom" />
          </p>
        ) : (
          <div className="space-y-4">
            {essay.split("\n\n").map((paragraph, i) => (
              <p key={i} className="text-slate-700 leading-relaxed">
                {paragraph.split("\n").map((line, j) => (
                  <span key={j}>
                    {line}
                    {j < paragraph.split("\n").length - 1 && <br />}
                  </span>
                ))}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
