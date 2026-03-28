"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Voice } from "@/lib/types";
import EssayOutput from "@/components/EssayOutput";
import { useAuth } from "@/context/AuthContext";

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

function RefineClientInner({ voices }: { voices: Voice[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, token } = useAuth();

  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(
    searchParams.get("voice") ?? ""
  );
  const [draft, setDraft] = useState("");
  const [wordLimit, setWordLimit] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [essay, setEssay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const savedRef = useRef(false);

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId);

  useEffect(() => {
    const voiceParam = searchParams.get("voice");
    if (voiceParam) setSelectedVoiceId(voiceParam);
  }, [searchParams]);

  // Auto-save after streaming completes
  useEffect(() => {
    if (!isStreaming && essay && essay.length > 0 && !savedRef.current && user && token) {
      savedRef.current = true;
      setSaveStatus("saving");
      fetch("/api/essays", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          voiceId: selectedVoiceId,
          voiceTone: selectedVoice?.tone ?? "",
          outputText: essay,
          type: "refined",
          wordCount: countWords(essay),
          metadata: { draft },
        }),
      })
        .then((r) => (r.ok ? setSaveStatus("saved") : setSaveStatus("error")))
        .catch(() => setSaveStatus("error"));
    }
  }, [isStreaming, essay, user, token, selectedVoiceId, selectedVoice, draft]);

  function handleVoiceChange(id: string) {
    setSelectedVoiceId(id);
    router.replace(`/refine?voice=${id}`, { scroll: false });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVoiceId || !draft) return;

    setIsStreaming(true);
    setError(null);
    setEssay("");
    setSaveStatus("idle");
    savedRef.current = false;

    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: selectedVoiceId,
          draft,
          wordLimit: wordLimit ? parseInt(wordLimit) : null,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to refine essay");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setEssay((prev) => (prev ?? "") + chunk);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setEssay(null);
    } finally {
      setIsStreaming(false);
    }
  }

  if (essay !== null) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Refined Essay</h1>
            {selectedVoice && (
              <p className="text-sm text-slate-500 mt-0.5">
                Refined with{" "}
                <span className="text-violet-600 font-medium">
                  Voice #{selectedVoice.id.match(/\d+/)?.[0]}
                </span>{" "}
                · {selectedVoice.tone}
              </p>
            )}
          </div>
          {!isStreaming && !user && (
            <p className="text-xs text-slate-400">Sign in to save essays</p>
          )}
        </div>

        {!isStreaming && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-3">
            <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-emerald-700">
              Your story is preserved. Only targeted edits were made to elevate
              voice, word choice, and rhythm.
            </p>
          </div>
        )}

        <EssayOutput
          essay={essay}
          isStreaming={isStreaming}
          saveStatus={saveStatus}
          onReset={() => { setEssay(null); setSaveStatus("idle"); savedRef.current = false; }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Essay Refiner
        </h1>
        <p className="text-slate-500 mt-2">
          Paste your existing draft and choose a voice. The refiner makes
          surgical, high-quality edits to elevate your essay while preserving
          your story.
        </p>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex gap-3">
        <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm text-blue-700">
          The refiner preserves your narrative arc, specific details, and
          personal voice while applying stylistic improvements. Fewer changes,
          higher impact.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <label className="block text-sm font-semibold text-slate-700 mb-3">
            Select Voice <span className="text-red-400">*</span>
          </label>
          {voices.length === 0 ? (
            <p className="text-sm text-slate-400">No voices available.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {voices.map((v) => {
                const vNum = v.id.match(/\d+/)?.[0] ?? "?";
                const isSelected = selectedVoiceId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handleVoiceChange(v.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? "border-violet-500 bg-violet-50"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                          isSelected
                            ? "bg-violet-500 text-white"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {vNum}
                      </div>
                      <span
                        className={`text-sm font-semibold ${
                          isSelected ? "text-violet-700" : "text-slate-700"
                        }`}
                      >
                        Voice #{vNum}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {v.tone}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
          {selectedVoice && (
            <div className="mt-4 p-3 bg-violet-50 rounded-xl border border-violet-100">
              <p className="text-xs text-violet-700 leading-relaxed">
                <span className="font-semibold">Selected:</span>{" "}
                {selectedVoice.persona_prompt.slice(0, 120)}…
              </p>
              <Link
                href={`/voices/${selectedVoice.id}`}
                className="text-xs text-violet-500 hover:text-violet-700 underline underline-offset-1 mt-1 inline-block"
              >
                View full voice profile →
              </Link>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <label
            htmlFor="draft"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Your Draft Essay <span className="text-red-400">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Paste your full draft here. The refiner will make targeted edits only.
          </p>
          <textarea
            id="draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Paste your draft essay here…"
            className="w-full min-h-[280px] resize-y rounded-xl border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none p-3 text-sm text-slate-700 placeholder-slate-400 transition-colors"
            required
          />
          <p className="text-xs text-slate-400 mt-2 text-right">
            {countWords(draft)} words
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <label
            htmlFor="wordLimitRefine"
            className="block text-sm font-semibold text-slate-700 mb-2"
          >
            Word Limit{" "}
            <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              id="wordLimitRefine"
              type="number"
              value={wordLimit}
              onChange={(e) => setWordLimit(e.target.value)}
              min="100"
              max="1000"
              placeholder="e.g. 650"
              className="w-32 rounded-xl border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none px-3 py-2 text-sm text-slate-700 placeholder-slate-400 transition-colors"
            />
            <span className="text-sm text-slate-500">
              words (leave blank to keep current length)
            </span>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!selectedVoiceId || !draft}
          className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Refine My Essay
        </button>
      </form>
    </div>
  );
}

export default function RefineClient({ voices }: { voices: Voice[] }) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading…</div>}>
      <RefineClientInner voices={voices} />
    </Suspense>
  );
}
