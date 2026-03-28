"use client";

import Link from "next/link";
import { Voice } from "@/lib/types";

interface VoiceCardProps {
  voice: Voice;
}

export default function VoiceCard({ voice }: VoiceCardProps) {
  const toneColors: Record<string, string> = {
    reflective: "bg-violet-100 text-violet-700",
    analytical: "bg-blue-100 text-blue-700",
    humorous: "bg-amber-100 text-amber-700",
    passionate: "bg-rose-100 text-rose-700",
    introspective: "bg-teal-100 text-teal-700",
    confident: "bg-emerald-100 text-emerald-700",
    earnest: "bg-orange-100 text-orange-700",
  };

  const tones = voice.tone.split(",").map((t) => t.trim().toLowerCase());

  function getToneColor(tone: string): string {
    for (const key of Object.keys(toneColors)) {
      if (tone.includes(key)) return toneColors[key];
    }
    return "bg-slate-100 text-slate-600";
  }

  const voiceNumber = voice.id.match(/\d+/)?.[0] ?? "?";

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-blue-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="p-6 flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {voiceNumber}
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                Voice Profile
              </p>
              <p className="text-sm font-semibold text-slate-700 leading-tight">
                #{voiceNumber}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tones.map((tone) => (
            <span
              key={tone}
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getToneColor(tone)}`}
            >
              {tone}
            </span>
          ))}
        </div>

        <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 flex-1">
          {voice.persona_prompt}
        </p>

        <blockquote className="border-l-2 border-violet-300 pl-3 text-sm text-slate-500 italic line-clamp-2">
          &ldquo;{voice.sample_sentence}&rdquo;
        </blockquote>

        <div className="mt-1 pt-4 border-t border-slate-100 flex gap-2">
          <Link
            href={`/voices/${voice.id}`}
            className="flex-1 text-center text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl py-2 transition-colors"
          >
            View Voice
          </Link>
          <Link
            href={`/write?voice=${voice.id}`}
            className="flex-1 text-center text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-xl py-2 transition-colors"
          >
            Write Essay
          </Link>
        </div>
      </div>
    </div>
  );
}
