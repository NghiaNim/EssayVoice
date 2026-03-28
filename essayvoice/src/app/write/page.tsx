import { getAllVoices } from "@/lib/voices";
import WriteClient from "./WriteClient";

export const dynamic = "force-dynamic";

export default async function WritePage() {
  const voices = await getAllVoices();
  return <WriteClient voices={voices} />;
}
