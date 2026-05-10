"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Voice,
  BrainstormQuestion,
  Bullet,
  BulletCategory,
  BULLET_CATEGORIES,
} from "@/lib/types";
import EssayOutput from "@/components/EssayOutput";
import { useAuth } from "@/context/AuthContext";

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";
type Step = "setup" | "brainstorm" | "summary" | "essay";

const STEPS: { key: Step; label: string }[] = [
  { key: "setup", label: "Setup" },
  { key: "brainstorm", label: "Brainstorm" },
  { key: "summary", label: "Summary" },
  { key: "essay", label: "Essay" },
];

function StepIndicator({ current }: { current: Step }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, i) => {
        const isActive = i === idx;
        const isDone = i < idx;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                isActive
                  ? "bg-violet-600 text-white"
                  : isDone
                  ? "bg-violet-100 text-violet-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {isDone ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                isActive ? "text-violet-700" : isDone ? "text-violet-500" : "text-slate-400"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-6 h-px ${isDone ? "bg-violet-300" : "bg-slate-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function WriteClientInner({ voices }: { voices: Voice[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, token } = useAuth();

  // Setup state
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(
    searchParams.get("voice") ?? ""
  );
  const [essayPrompt, setEssayPrompt] = useState("");
  const [wordLimit, setWordLimit] = useState("650");

  // Flow state
  const [step, setStep] = useState<Step>("setup");

  // Brainstorm state
  const [questions, setQuestions] = useState<BrainstormQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [questionsLoading, setQuestionsLoading] = useState(false);

  // Summary state
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [summarizing, setSummarizing] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  // Essay state
  const [isStreaming, setIsStreaming] = useState(false);
  const [essay, setEssay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const savedRef = useRef(false);

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId);
  const answeredCount = Object.values(answers).filter((a) => a.trim().length > 0).length;

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
          metadata: {
            essayPrompt,
            wordLimit,
            bullets,
            answers: questions.map((q) => ({
              question: q.text,
              answer: answers[q.id] ?? "",
            })),
          },
        }),
      })
        .then((r) => (r.ok ? setSaveStatus("saved") : setSaveStatus("error")))
        .catch(() => setSaveStatus("error"));
    }
  }, [
    isStreaming,
    essay,
    user,
    token,
    selectedVoiceId,
    selectedVoice,
    essayPrompt,
    wordLimit,
    bullets,
    questions,
    answers,
  ]);

  function handleVoiceChange(id: string) {
    setSelectedVoiceId(id);
    router.replace(`/write?voice=${id}`, { scroll: false });
  }

  async function handleStartBrainstorm() {
    if (!selectedVoiceId || !essayPrompt) return;
    setError(null);
    setStep("brainstorm");
    if (questions.length > 0) return;

    setQuestionsLoading(true);
    try {
      const res = await fetch("/api/brainstorm/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayPrompt }),
      });
      if (!res.ok) throw new Error("Failed to load questions");
      const data = (await res.json()) as { questions: BrainstormQuestion[] };
      setQuestions(data.questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load questions");
    } finally {
      setQuestionsLoading(false);
    }
  }

  async function handleSummarize() {
    if (answeredCount === 0) return;
    setError(null);
    setSummarizing(true);
    setStep("summary");
    try {
      const payload = {
        essayPrompt,
        answers: questions
          .map((q) => ({ question: q.text, answer: answers[q.id] ?? "" }))
          .filter((a) => a.answer.trim().length > 0),
      };
      const res = await fetch("/api/brainstorm/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to summarize");
      const data = (await res.json()) as { bullets: Bullet[] };
      setBullets(data.bullets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not summarize");
    } finally {
      setSummarizing(false);
    }
  }

  async function handleSuggest() {
    setError(null);
    setSuggesting(true);
    try {
      const res = await fetch("/api/brainstorm/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayPrompt, bullets }),
      });
      if (!res.ok) throw new Error("Failed to get suggestions");
      const data = (await res.json()) as { bullets: Bullet[] };
      setBullets((prev) => [...prev, ...data.bullets]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not suggest bullets");
    } finally {
      setSuggesting(false);
    }
  }

  function updateBullet(id: string, text: string) {
    setBullets((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
  }

  function deleteBullet(id: string) {
    setBullets((prev) => prev.filter((b) => b.id !== id));
  }

  function acceptBullet(id: string) {
    setBullets((prev) =>
      prev.map((b) => (b.id === id ? { ...b, source: "user" as const } : b))
    );
  }

  function addBullet(category: BulletCategory) {
    const id = `b${Date.now()}-new`;
    setBullets((prev) => [...prev, { id, category, text: "", source: "user" }]);
  }

  async function handleWriteEssay() {
    if (!selectedVoiceId || !essayPrompt) return;
    const acceptedBullets = bullets.filter(
      (b) => b.source === "user" && b.text.trim().length > 0
    );
    if (acceptedBullets.length === 0) {
      setError("Add at least one bullet before generating the essay.");
      return;
    }

    setIsStreaming(true);
    setError(null);
    setEssay("");
    setSaveStatus("idle");
    savedRef.current = false;
    setStep("essay");

    try {
      const res = await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: selectedVoiceId,
          essayPrompt,
          bullets: acceptedBullets,
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

  function resetAll() {
    setEssay(null);
    setSaveStatus("idle");
    savedRef.current = false;
    setStep("setup");
  }

  // ---------- Essay step ----------
  if (step === "essay" && essay !== null) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <StepIndicator current="essay" />
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
          onReset={resetAll}
        />
      </div>
    );
  }

  // ---------- Summary step ----------
  if (step === "summary") {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <StepIndicator current="summary" />
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Brainstorm Summary
          </h1>
          <p className="text-slate-500 mt-2">
            These bullets are what the essay writer will actually use. Edit them,
            delete what&apos;s off, and ask for suggestions to fill gaps.
          </p>
        </div>

        {summarizing ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-500">Extracting bullets from your brainstorm…</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleSuggest}
                disabled={suggesting}
                className="px-4 py-2 bg-violet-50 hover:bg-violet-100 disabled:bg-slate-50 disabled:text-slate-400 text-violet-700 font-medium rounded-xl border border-violet-200 transition-colors text-sm flex items-center gap-2"
              >
                {suggesting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
                    Thinking…
                  </>
                ) : (
                  <>✨ Suggest more bullets</>
                )}
              </button>
              <button
                onClick={handleSummarize}
                disabled={summarizing}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium text-sm"
              >
                Regenerate from answers
              </button>
            </div>

            {BULLET_CATEGORIES.map((category) => {
              const items = bullets.filter((b) => b.category === category);
              return (
                <div key={category} className="mb-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-800 text-sm">
                      {category}
                      <span className="ml-2 text-xs text-slate-400 font-normal">
                        {items.length} {items.length === 1 ? "bullet" : "bullets"}
                      </span>
                    </h3>
                    <button
                      onClick={() => addBullet(category)}
                      className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                    >
                      + Add bullet
                    </button>
                  </div>

                  {items.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No bullets in this category yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {items.map((b) => (
                        <BulletRow
                          key={b.id}
                          bullet={b}
                          onChange={(text) => updateBullet(b.id, text)}
                          onDelete={() => deleteBullet(b.id)}
                          onAccept={() => acceptBullet(b.id)}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 mt-8">
              <button
                onClick={() => setStep("brainstorm")}
                className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-medium text-sm"
              >
                ← Back to Brainstorm
              </button>
              <button
                onClick={handleWriteEssay}
                disabled={bullets.filter((b) => b.source === "user" && b.text.trim()).length === 0}
                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                Write My Essay →
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ---------- Brainstorm step ----------
  if (step === "brainstorm") {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <StepIndicator current="brainstorm" />
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Brainstorm
          </h1>
          <p className="text-slate-500 mt-2">
            Answer what you can — short answers are fine. The more specific, the
            better the essay. Skip questions that don&apos;t apply.
          </p>
        </div>

        {questionsLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-8 h-8 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-slate-500">Designing brainstorm questions for your prompt…</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800 leading-relaxed">
                        {q.text}
                      </p>
                      {q.hint && (
                        <p className="text-xs text-slate-400 mt-1 italic">{q.hint}</p>
                      )}
                    </div>
                  </div>
                  <textarea
                    value={answers[q.id] ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    placeholder="Your answer…"
                    className="w-full min-h-[80px] resize-y rounded-xl border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 outline-none p-3 text-sm text-slate-700 placeholder-slate-400 transition-colors"
                  />
                </div>
              ))}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl mt-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 mt-8">
              <button
                onClick={() => setStep("setup")}
                className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-medium text-sm"
              >
                ← Back
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400">
                  {answeredCount} of {questions.length} answered
                </span>
                <button
                  onClick={handleSummarize}
                  disabled={answeredCount === 0 || summarizing}
                  className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  Summarize Answers →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ---------- Setup step ----------
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <StepIndicator current="setup" />
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Essay Writer
        </h1>
        <p className="text-slate-500 mt-2">
          Pick a voice and paste your essay prompt. We&apos;ll guide you through a
          brainstorm, turn your answers into bullets, and write the essay in
          that voice.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleStartBrainstorm();
        }}
        className="space-y-6"
      >
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
          disabled={!selectedVoiceId || !essayPrompt}
          className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          Start Brainstorm →
        </button>
      </form>
    </div>
  );
}

function BulletRow({
  bullet,
  onChange,
  onDelete,
  onAccept,
}: {
  bullet: Bullet;
  onChange: (text: string) => void;
  onDelete: () => void;
  onAccept: () => void;
}) {
  const isSuggested = bullet.source === "suggested";
  return (
    <li
      className={`flex items-start gap-2 p-3 rounded-xl border transition-colors ${
        isSuggested
          ? "border-violet-300 bg-violet-50/40"
          : "border-slate-100 bg-slate-50/50"
      }`}
    >
      <span
        className={`mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          isSuggested ? "bg-violet-500" : "bg-slate-400"
        }`}
      />
      <div className="flex-1 min-w-0">
        {isSuggested && (
          <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-violet-600 bg-violet-100 px-1.5 py-0.5 rounded mb-1">
            Suggested
          </span>
        )}
        <textarea
          value={bullet.text}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isSuggested ? "Edit and accept, or reject" : "Bullet text…"}
          rows={2}
          className="w-full resize-none bg-transparent border-0 outline-none focus:ring-0 text-sm text-slate-700 placeholder-slate-400 leading-relaxed p-0"
        />
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {isSuggested && (
          <button
            type="button"
            onClick={onAccept}
            disabled={bullet.text.trim().length === 0}
            className="px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:text-slate-300 rounded transition-colors"
            title="Accept this suggestion"
          >
            Accept
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          title={isSuggested ? "Reject" : "Delete"}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </li>
  );
}

export default function WriteClient({ voices }: { voices: Voice[] }) {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading…</div>}>
      <WriteClientInner voices={voices} />
    </Suspense>
  );
}
