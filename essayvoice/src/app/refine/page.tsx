import { getAllVoices } from "@/lib/voices";
import RefineClient from "./RefineClient";

export const dynamic = "force-dynamic";

export default async function RefinePage() {
  const voices = await getAllVoices();
  return <RefineClient voices={voices} />;
}
