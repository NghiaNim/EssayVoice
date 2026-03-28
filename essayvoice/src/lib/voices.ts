import { supabase } from "./supabase";
import { Voice } from "./types";

export async function getAllVoices(): Promise<Voice[]> {
  const { data, error } = await supabase
    .from("voices")
    .select("*")
    .order("id");

  if (error) {
    console.error("Failed to fetch voices from Supabase:", error.message);
    return [];
  }

  return (data ?? []) as Voice[];
}

export async function getVoiceById(id: string): Promise<Voice | null> {
  const { data, error } = await supabase
    .from("voices")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Failed to fetch voice ${id}:`, error.message);
    return null;
  }

  return data as Voice;
}
