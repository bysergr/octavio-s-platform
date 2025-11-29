// Supabase Edge Function: tutor
// Calls Gemini via Vertex AI if configured (VERTEX_* envs), otherwise falls back to Gemini API key.
// Request body: { mode: 'hint' | 'daily-challenge' | 'riddle' | 'feedback', story?: string, question?: string, userAnswer?: string, age?: number, level?: number }
// Response: JSON with either { text } | { challenge } | { riddle } depending on mode.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type TutorMode = "hint" | "daily-challenge" | "riddle" | "feedback";

const VERTEX_PROJECT_ID = Deno.env.get("VERTEX_PROJECT_ID");
const VERTEX_LOCATION = Deno.env.get("VERTEX_LOCATION") || "us-central1";
const VERTEX_MODEL = Deno.env.get("VERTEX_MODEL") || "gemini-1.5-flash";
const VERTEX_ACCESS_TOKEN = Deno.env.get("VERTEX_ACCESS_TOKEN"); // OAuth 2.0 Bearer token

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";

async function callVertex(prompt: string): Promise<string> {
  if (!VERTEX_PROJECT_ID || !VERTEX_ACCESS_TOKEN) {
    throw new Error("Vertex not configured");
  }
  const url =
    `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL}:generateContent`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 512,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${VERTEX_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vertex error: ${res.status} ${err}`);
  }
  const data = await res.json();
  // Vertex returns candidates[0].content.parts[].text
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ??
    "";
  return text;
}

async function callGeminiAPI(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key not configured");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 512,
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err}`);
  }
  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text).join("") ??
    "";
  return text;
}

function buildPrompt(mode: TutorMode, payload: Record<string, unknown>): string {
  const age = (payload.age as number | undefined) ?? 8;
  const level = (payload.level as number | undefined) ?? 1;
  const story = (payload.story as string | undefined) ?? "";
  const question = (payload.question as string | undefined) ?? "";
  const userAnswer = (payload.userAnswer as string | undefined) ?? "";

  if (mode === "hint") {
    return [
      "Eres un tutor infantil amable y motivador para niños de 6 a 9 años.",
      `Edad: ${age}. Nivel de lectura aproximado: ${level}.`,
      "Contexto del cuento (puede estar vacío):",
      story,
      "Necesito UN consejo breve (1-2 frases) para ayudar a responder la pregunta o entender una palabra difícil.",
      "No des la respuesta directa. Sé positivo y sencillo.",
    ].join("\n\n");
  }

  if (mode === "daily-challenge") {
    return [
      "Genera un reto de comprensión lectora para un niño de 6 a 9 años.",
      "Devuelve SOLO un JSON con este formato exacto, sin texto extra:",
      `{"challenge":{"type":"multiple_choice","question":"...","options":["A","B","C"],"correctIndex":0,"explanation":"..."}}`,
      "La pregunta debe ser corta, clara y relacionada con habilidades de interpretación/inferencia.",
      "Opciones: 3. Exactamente una correcta. Usa lenguaje simple.",
    ].join("\n");
  }

  if (mode === "riddle") {
    return [
      "Crea una adivinanza divertida, apropiada para 6 a 9 años.",
      "Devuelve SOLO JSON con este formato exacto:",
      `{"riddle":{"question":"...","answer":"..."}}`,
      "Lenguaje corto y claro.",
    ].join("\n");
  }

  // feedback
  return [
    "Ofrece una retroalimentación breve y motivadora (1-2 frases) para un niño.",
    `Pregunta: ${question}`,
    `Respuesta del niño: ${userAnswer}`,
    "Refuerza lo positivo y, si es incorrecto, explica brevemente sin revelar todo.",
  ].join("\n\n");
}

function tryParseJSON<T>(text: string): T | null {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean) as T;
  } catch {
    return null;
  }
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }
    const body = await req.json();
    const mode: TutorMode = body?.mode ?? "hint";
    const prompt = buildPrompt(mode, body || {});

    let output = "";
    try {
      output = await callVertex(prompt);
    } catch {
      // Fallback to Gemini API key if Vertex isn't configured
      output = await callGeminiAPI(prompt);
    }

    if (mode === "daily-challenge") {
      const parsed = tryParseJSON<{ challenge: { type: string; question: string; options: string[]; correctIndex: number; explanation: string } }>(output);
      if (parsed?.challenge) {
        return new Response(JSON.stringify(parsed), { headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ challenge: { type: "multiple_choice", question: "¿Cuál es la idea principal?", options: ["A", "B", "C"], correctIndex: 0, explanation: "Piensa en qué habla más el texto." } }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (mode === "riddle") {
      const parsed = tryParseJSON<{ riddle: { question: string; answer: string } }>(output);
      if (parsed?.riddle) {
        return new Response(JSON.stringify(parsed), { headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ riddle: { question: "Blanca por dentro, verde por fuera. Si quieres que te lo diga, espera.", answer: "La pera" } }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // hint or feedback: return plain text
    return new Response(JSON.stringify({ text: output.trim() || "¡Sigue así! Piensa en las pistas del cuento." }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});


