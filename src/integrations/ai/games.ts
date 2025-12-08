import { supabase } from "@/integrations/supabase/client";

type GamesMode =
  | "hint"
  | "daily-challenge"
  | "riddle"
  | "feedback"
  | "reading-questions"
  | "diagnosis";

export async function askGames<T = unknown>(
  mode: GamesMode,
  payload: Record<string, unknown>
): Promise<T> {
  const url =
    "https://plpvazfkxveixtsgaybv.supabase.co/functions/v1/games";

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const apiKey =
    (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ??
    (globalThis as any)?.VITE_SUPABASE_PUBLISHABLE_KEY;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (apiKey) {
    headers["apikey"] = apiKey;
  }
  headers["Authorization"] = `Bearer ${session?.access_token ?? apiKey ?? ""}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ mode, ...payload }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Edge function 'games' error: ${res.status} ${res.statusText} ${txt}`
    );
  }

  return (await res.json()) as T;
}


