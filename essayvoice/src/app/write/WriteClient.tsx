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

function WriteClientInner({ voices }: { voices: Voice[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, token } = useAuth();

  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(
    searchParams.get("voice") ?? ""
  );
  const [essayPrompt, setEssayPrompt] = useState("");
  const [personalContent, setPersonalContent] = useState("");
  const [wordLimit, setWordLimit] = useState("650");
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
          type: "written",
          wordCount: countWords(essay),
          metadata: { essayPrompt, personalContent, wordLimit },
        }),
      })
        .then((r) => (r.ok ? setSaveStatus("saved") : setSaveStatus("error")))
        .catch(() => setSaveStatus("error"));
    }
  }, [isStreaming, essay, user, token, selectedVoiceId, selectedVoice, essayPrompt, personalContent, wordLimit]);

  function handleVoiceChange(id: string) {
    setSelectedVoiceId(id);
    router.replace(`/write?voice=${id}`, { scroll: false });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVoiceId || !essayPrompt || !personalContent) return;

    setIsStreaming(true);
    setError(null);
    setEssay("");
    setSaveStatus("idle");
    savedRef.current = false;

    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: selectedVoiceId,
          essayPrompt,
          personalContent,
          wordLimit: wordLimit ? parseInt(wordLimit) : null,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to generate essay");
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
            <h1 className="text-2xl font-bold text-slate-900">Your Essay</h1>
            {selectedVoice && (
              <p className="text-sm text-slate-500 mt-0.5">
                Written in{" "}
                <span className="text-violet-600 font-medium">
                  Voice #{selectedVoice.id.match(/\d+/)?.[0]}
                </span>{" "}
                · {selectedVoice.tone}
              </p>
            )}
          </div>
          {!isStreaming && (
            <div className="flex items-center gap-3">
              {!user && (
                <p className="text-xs text-slate-400">Sign in to save essays</p>
              )}
              <Link
                href={`/refine?voice=${selectedVoiceId}`}
                className="text-sm font-medium text-violet-600 hover:text-violet-700 underline underline-offset-2"
              >
                Continue to Refiner →
              </Link>
            </div>
          )}
        </div>
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
          Essay Writer
        </h1>
        <p className="text-slate-500 mt-2">
          Choose a voice, paste your essay prompt, and share your story. We'll
          write the essay in that voice for you.
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
            htmlFor="prompt"
            className="block text-sm font-semibold text-slate-700 mb-2"
          >
            Essay Prompt <span className="text-red-400">*</span>
          </label>
          <textarea
            id="prompt"
            value={essayPrompt}
            onChange={(e) => setEssayPrompt(e.target.value)}
            placeholder="Paste the essay prompt here…"
            className="w-full min-h-[100px] resize-y rounded-xl border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none p-3 text-sm text-slate-700 placeholder-slate-400 transition-colors"
            required
          />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <label
            htmlFor="content"
            className="block text-sm font-semibold text-slate-700 mb-1"
          >
            Your Story & Notes <span className="text-red-400">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Share your experiences, anecdotes, key moments, and anything you
            want included. The more specific, the better.
          </p>
          <textarea
            id="content"
            value={personalContent}
            onChange={(e) => setPersonalContent(e.target.value)}
            placeholder="e.g. I grew up in a small town in Vietnam, moved to the US at 14, learned English by watching sitcoms, joined the robotics team even though I didn't know what a circuit was..."
            className="w-full min-h-[160px] resize-y rounded-xl border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none p-3 text-sm text-slate-700 placeholder-slate-400 transition-colors"
            required
          />
          <p className="text-xs text-slate-400 mt-2 text-right">
            {countWords(personalContent)} words
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <label
            htmlFor="wordLimit"
            className="block text-sm font-semibold text-slate-700 mb-2"
          >
            Word Limit
          </label>
          <div className="flex items-center gap-3">
            <input
              id="wordLimit"
              type="number"
              value={wordLimit}
              onChange={(e) => setWordLimit(e.target.value)}
              min="100"
              max="1000"
              className="w-32 rounded-xl border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none px-3 py-2 text-sm text-slate-700 transition-colors"
            />
            <span className="text-sm text-slate-500">
              words (Common App max: 650)
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
          disabled={!selectedVoiceId || !essayPrompt || !personalContent}
          className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Write My Essay
        </button>
      </form>
    </div>
  );
}

export default function WriteClient({ voices }: { voices: Voice[] }) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading…</div>}>
      <WriteClientInner voices={voices} />
    </Suspense>
  );
}
