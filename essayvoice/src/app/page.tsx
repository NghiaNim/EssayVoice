import { getAllVoices } from "@/lib/voices";
import VoiceCard from "@/components/VoiceCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const voices = await getAllVoices();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Choose Your Voice
        </h1>
        <p className="text-slate-500 mt-2 text-base max-w-xl">
          Each voice is extracted from a real, successful college essay. Select
          one to write a new essay or refine an existing draft in that style.
        </p>
      </div>

      {voices.length === 0 ? (
        <div className="text-center py-24 text-slate-400">
          <p className="text-lg">No voices found.</p>
          <p className="text-sm mt-1">
            Voices will appear here once they are added to the database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {voices.map((voice) => (
            <VoiceCard key={voice.id} voice={voice} />
          ))}
        </div>
      )}
    </div>
  );
}
