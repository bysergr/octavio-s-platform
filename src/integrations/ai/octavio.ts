import { supabase } from "@/integrations/supabase/client";

export type OctavioMode = "hint" | "chat";

export interface OctavioParams {
  mode: OctavioMode;
  story?: string;
  question?: string;
  age?: number;
  level?: number;
}

export interface OctavioResponse {
  text: string;
}

export async function askOctavio(
  params: OctavioParams
): Promise<OctavioResponse> {
  const url =
    "https://plpvazfkxveixtsgaybv.supabase.co/functions/v1/octaviobot";

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
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(
      `Edge function 'octaviobot' error: ${res.status} ${res.statusText} ${txt}`
    );
  }

  return (await res.json()) as OctavioResponse;
}


