"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface SavedEssay {
  id: string;
  voice_id: string;
  voice_tone: string;
  output_text: string;
  type: "written" | "refined";
  word_count: number;
  metadata: Record<string, string>;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EssaysPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [essays, setEssays] = useState<SavedEssay[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { setLoading(false); return; }

    fetch("/api/essays", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setEssays(d.essays ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, authLoading]);

  async function handleCopy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (authLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center text-slate-400">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <p className="text-slate-500 text-lg mb-4">Sign in to see your saved essays.</p>
        <Link
          href="/"
          className="text-violet-600 hover:text-violet-700 text-sm font-medium underline underline-offset-2"
        >
          Go to voices →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Essays</h1>
        <p className="text-slate-500 mt-1 text-sm">
          {essays.length} essay{essays.length !== 1 ? "s" : ""} saved
        </p>
      </div>

      {essays.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-400 text-base">No essays saved yet.</p>
          <div className="flex gap-3 justify-center mt-4">
            <Link
              href="/write"
              className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors"
            >
              Write an Essay
            </Link>
            <Link
              href="/refine"
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:border-slate-300 transition-colors"
            >
              Refine a Draft
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {essays.map((essay) => {
            const voiceNum = essay.voice_id.match(/\d+/)?.[0] ?? "?";
            const isExpanded = expanded === essay.id;
            const isCopied = copied === essay.id;
            const prompt = essay.metadata?.essayPrompt as string | undefined;

            return (
              <div
                key={essay.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                        {voiceNum}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              essay.type === "written"
                                ? "bg-violet-100 text-violet-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {essay.type === "written" ? "Written" : "Refined"}
                          </span>
                          <span className="text-xs text-slate-400">
                            {essay.word_count} words
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Voice #{voiceNum} · {essay.voice_tone} · {formatDate(essay.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopy(essay.id, essay.output_text)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                      >
                        {isCopied ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : essay.id)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                      >
                        {isExpanded ? "Collapse" : "Read"}
                      </button>
                    </div>
                  </div>

                  {prompt && (
                    <p className="mt-3 text-xs text-slate-500 italic line-clamp-1">
                      Prompt: {prompt}
                    </p>
                  )}

                  {!isExpanded && (
                    <p className="mt-3 text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {essay.output_text}
                    </p>
                  )}
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 px-5 py-5">
                    <div className="space-y-3">
                      {essay.output_text.split("\n\n").map((para, i) => (
                        <p key={i} className="text-slate-700 text-sm leading-relaxed">
                          {para}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
