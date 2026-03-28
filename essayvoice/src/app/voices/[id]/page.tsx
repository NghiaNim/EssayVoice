import { getVoiceById } from "@/lib/voices";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VoiceDetailPage({ params }: Props) {
  const { id } = await params;
  const voice = await getVoiceById(id);
  if (!voice) notFound();

  const voiceNumber = voice.id.match(/\d+/)?.[0] ?? "?";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-8 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to voices
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {voiceNumber}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Voice #{voiceNumber}</h1>
            <p className="text-slate-500 text-sm mt-0.5">{voice.tone}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href={`/write?voice=${voice.id}`}
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Write Essay
          </Link>
          <Link
            href={`/refine?voice=${voice.id}`}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
          >
            Refine Draft
          </Link>
        </div>
      </div>

      <div className="grid gap-6">
        <Section title="Persona">
          <p className="text-slate-700 leading-relaxed">{voice.persona_prompt}</p>
        </Section>

        <div className="grid sm:grid-cols-2 gap-6">
          <Section title="Sentence Style">
            <p className="text-slate-700 leading-relaxed text-sm">{voice.sentence_style}</p>
          </Section>
          <Section title="Vocabulary Level">
            <p className="text-slate-700 leading-relaxed text-sm">{voice.vocabulary_level}</p>
          </Section>
        </div>

        <Section title="Structural Patterns">
          <p className="text-slate-700 leading-relaxed text-sm">{voice.structural_patterns}</p>
        </Section>

        <Section title="Distinctive Moves">
          <ul className="space-y-2">
            {voice.distinctive_moves.map((move, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-violet-400 mt-0.5 flex-shrink-0">•</span>
                {move}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Themes & Preoccupations">
          <div className="flex flex-wrap gap-2">
            {voice.themes_and_preoccupations.map((theme, i) => (
              <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                {theme}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Self-Presentation">
          <p className="text-slate-700 leading-relaxed text-sm">{voice.self_presentation}</p>
        </Section>

        <Section title="Things to Avoid">
          <ul className="space-y-2">
            {voice.avoid_in_imitation.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-rose-400 mt-0.5 flex-shrink-0">✗</span>
                {item}
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Sample Sentence">
          <blockquote className="border-l-4 border-violet-400 pl-4 text-slate-600 italic text-sm leading-relaxed">
            &ldquo;{voice.sample_sentence}&rdquo;
          </blockquote>
        </Section>

        <Section title="Source Essay Excerpt">
          <div className="max-h-64 overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
              {voice.essay_text.slice(0, 800)}
              {voice.essay_text.length > 800 && "…"}
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}
