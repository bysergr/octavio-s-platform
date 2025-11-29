import { supabase } from "@/integrations/supabase/client";

type TutorMode = "hint" | "daily-challenge" | "riddle" | "feedback";

export async function askTutor<T = unknown>(
  mode: TutorMode,
  payload: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("tutor", {
    body: { mode, ...payload },
  });
  if (error) {
    throw error;
  }
  return data as T;
}


