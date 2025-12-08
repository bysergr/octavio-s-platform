import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Supabase Edge Function: daily-challenge
// Genera challenges diarios enfocados en los 4 pilares de lectura crítica usando Gemini

function buildCorsHeaders(req: Request) {
  try {
    const origin = req.headers.get("Origin") ?? "*";
    const reqHeaders =
      req.headers.get("Access-Control-Request-Headers") ??
      "authorization, x-client-info, apikey, content-type";

    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": reqHeaders,
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
  } catch (error) {
    // Fallback si hay algún error construyendo los headers
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
      "Access-Control-Max-Age": "86400",
    };
  }
}

const VERTEX_PROJECT_ID = Deno.env.get("VERTEX_PROJECT_ID");
const VERTEX_LOCATION = Deno.env.get("VERTEX_LOCATION") || "us-central1";
const VERTEX_MODEL = Deno.env.get("VERTEX_MODEL") || "gemini-1.5-flash";
const VERTEX_ACCESS_TOKEN = Deno.env.get("VERTEX_ACCESS_TOKEN");
const GOOGLE_SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
const GOOGLE_CLIENT_EMAIL = Deno.env.get("GOOGLE_CLIENT_EMAIL");
const GOOGLE_PRIVATE_KEY = Deno.env.get("GOOGLE_PRIVATE_KEY");
const GOOGLE_TOKEN_URI =
  Deno.env.get("GOOGLE_TOKEN_URI") || "https://oauth2.googleapis.com/token";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash-lite";

// In-memory cache for access token
let cachedAccessToken: { token: string; exp: number } | null = null;

function base64urlFromString(input: string): string {
  const b64 = btoa(input);
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64urlFromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 = btoa(binary);
  return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function derFromPkcs8(pem: string): ArrayBuffer {
  const normalized = pem
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\r?\n|\r/g, "")
    .trim();
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function signJwtRS256(
  header: Record<string, string>,
  payload: Record<string, unknown>,
  privateKeyPem: string
): Promise<string> {
  const enc = new TextEncoder();
  const headerB64u = base64urlFromString(JSON.stringify(header));
  const payloadB64u = base64urlFromString(JSON.stringify(payload));
  const unsigned = `${headerB64u}.${payloadB64u}`;
  const keyData = derFromPkcs8(privateKeyPem);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    enc.encode(unsigned)
  );
  const sigB64u = base64urlFromBytes(new Uint8Array(signature));
  return `${unsigned}.${sigB64u}`;
}

function loadServiceAccount() {
  if (GOOGLE_CLIENT_EMAIL && GOOGLE_PRIVATE_KEY) {
    return {
      clientEmail: GOOGLE_CLIENT_EMAIL,
      privateKey: GOOGLE_PRIVATE_KEY,
      tokenUri: GOOGLE_TOKEN_URI,
    };
  }
  if (GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const sa = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
      if (sa.client_email && sa.private_key) {
        return {
          clientEmail: sa.client_email,
          privateKey: sa.private_key,
          tokenUri: sa.token_uri || GOOGLE_TOKEN_URI,
        };
      }
    } catch {
      // ignore parse error
    }
  }
  return null;
}

async function getVertexAccessToken(): Promise<string> {
  if (VERTEX_ACCESS_TOKEN) return VERTEX_ACCESS_TOKEN;

  const nowSec = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedAccessToken.exp - 60 > nowSec) {
    return cachedAccessToken.token;
  }

  const creds = loadServiceAccount();
  if (!creds) {
    throw new Error(
      "Vertex not configured: missing OAuth credentials (set GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY or GOOGLE_SERVICE_ACCOUNT_JSON)."
    );
  }

  const iat = nowSec;
  const exp = iat + 3600;
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const payload = {
    iss: creds.clientEmail,
    sub: creds.clientEmail,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: creds.tokenUri,
    iat,
    exp,
  };

  const privateKeyPem = creds.privateKey.includes("BEGIN PRIVATE KEY")
    ? creds.privateKey
    : `-----BEGIN PRIVATE KEY-----\n${creds.privateKey}\n-----END PRIVATE KEY-----\n`;

  const assertion = await signJwtRS256(header, payload, privateKeyPem);

  const form = new URLSearchParams();
  form.set("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  form.set("assertion", assertion);

  const resp = await fetch(creds.tokenUri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(
      `Failed to obtain Vertex access token: ${resp.status} ${errText}`
    );
  }

  const data = await resp.json();
  const token = data.access_token;
  if (!token) throw new Error("No access_token in token response");

  const expiresIn = data.expires_in ?? 3600;
  cachedAccessToken = {
    token,
    exp: nowSec + expiresIn,
  };

  return token;
}

async function callVertex(prompt: string): Promise<string> {
  if (!VERTEX_PROJECT_ID) {
    throw new Error("Vertex not configured: VERTEX_PROJECT_ID is required");
  }

  const url = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${VERTEX_PROJECT_ID}/locations/${VERTEX_LOCATION}/publishers/google/models/${VERTEX_MODEL}:generateContent`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  const accessToken = await getVertexAccessToken();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vertex error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text: string }) => p.text)
      .join("") ?? "";
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
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text: string }) => p.text)
      .join("") ?? "";
  return text;
}

interface TutorRequest {
  mode: "daily-challenge" | "feedback" | "hint" | "riddle";
  pillar?: "interpretacion" | "inferencia" | "reflexion" | "argumentacion";
  completedPillars?: string[];
  question?: string;
  userAnswer?: string;
  correctAnswer?: string;
  challengeType?: string;
}

const PILLAR_INFO = {
  interpretacion: {
    name: "Interpretación",
    emoji: "📖",
    description: "¿Qué dice el texto?",
    focus:
      "Comprensión literal, identificar ideas principales, secuenciar eventos",
  },
  inferencia: {
    name: "Inferencia",
    emoji: "🔮",
    description: "¿Qué quiere decir?",
    focus:
      "Deducir información implícita, entender motivaciones, predecir consecuencias",
  },
  reflexion: {
    name: "Reflexión",
    emoji: "💭",
    description: "¿Qué pienso yo?",
    focus:
      "Conectar con experiencias personales, formar opiniones, evaluar valores",
  },
  argumentacion: {
    name: "Argumentación",
    emoji: "🎯",
    description: "¿Cómo lo justifico?",
    focus:
      "Defender una postura, usar evidencia del texto, comparar perspectivas",
  },
};

function buildPrompt(mode: string, payload: TutorRequest): string {
  if (mode === "daily-challenge") {
    const completedPillars = payload.completedPillars || [];
    const availablePillars = Object.keys(PILLAR_INFO).filter(
      (p) => !completedPillars.includes(p)
    );

    if (availablePillars.length === 0) {
      // Si todos los pilares están completados, elegir uno aleatorio
      const randomPillar = Object.keys(PILLAR_INFO)[
        Math.floor(Math.random() * Object.keys(PILLAR_INFO).length)
      ] as keyof typeof PILLAR_INFO;
      const pillar = PILLAR_INFO[randomPillar];
      return buildChallengePrompt(randomPillar, pillar);
    }

    // Elegir un pilar aleatorio de los disponibles
    const randomPillar = availablePillars[
      Math.floor(Math.random() * availablePillars.length)
    ] as keyof typeof PILLAR_INFO;
    const pillar = PILLAR_INFO[randomPillar];
    return buildChallengePrompt(randomPillar, pillar);
  }

  if (mode === "feedback") {
    return `Eres un tutor amigable que evalúa las respuestas de niños con mucho cariño y apoyo.

REGLAS DE EVALUACIÓN:
- Sé siempre positivo y alentador
- Reconoce el esfuerzo del niño
- Da feedback constructivo
- Usa lenguaje simple y amigable
- Incluye emojis para hacerlo más divertido

Para preguntas de opción múltiple:
- Si es correcta: 3-5 estrellas según la calidad
- Si es incorrecta: 1-2 estrellas (por intentarlo)

Para preguntas abiertas, evalúa:
- Coherencia con el tema
- Profundidad de la reflexión
- Claridad de expresión
- Da entre 1-5 estrellas según la calidad

Pregunta: ${payload.question || ""}
${
  payload.correctAnswer
    ? `Respuesta correcta esperada: ${payload.correctAnswer}`
    : ""
}
Respuesta del estudiante: ${payload.userAnswer || ""}
Tipo de challenge: ${payload.challengeType || "general"}

RESPONDE ÚNICAMENTE EN FORMATO JSON (sin texto adicional, sin markdown):
{
  "stars": 3,
  "feedback": "mensaje motivador personalizado",
  "explanation": "por qué la respuesta es correcta/incorrecta o cómo mejorar",
  "encouragement": "frase de ánimo final"
}

Evalúa esta respuesta de manera amigable y constructiva.`;
  }

  return "";
}

function buildChallengePrompt(
  pillar: keyof typeof PILLAR_INFO,
  pillarInfo: (typeof PILLAR_INFO)[keyof typeof PILLAR_INFO]
): string {
  const isMultipleChoice =
    pillar === "interpretacion" || pillar === "inferencia";
  const isOpenEnded = pillar === "reflexion" || pillar === "argumentacion";

  if (isMultipleChoice) {
    return `Eres un experto en pedagogía y lectura crítica para niños colombianos.

Debes crear un challenge de ${pillarInfo.name} (${pillarInfo.emoji}).

ENFOQUE: ${pillarInfo.description}
${pillarInfo.focus}

REGLAS IMPORTANTES:
- Tipo: Opción múltiple con exactamente 4 opciones
- Lenguaje apropiado para niños de 8-12 años
- El challenge debe ser desafiante pero justo
- Las opciones deben ser claras y distintas
- La respuesta correcta debe ser evidente para quien comprende bien el concepto
- Incluye un texto breve o contexto si es necesario

RESPONDE ÚNICAMENTE EN FORMATO JSON (sin texto adicional, sin markdown):
{
  "type": "multiple_choice",
  "pillar": "${pillar}",
  "pillarName": "${pillarInfo.name}",
  "pillarEmoji": "${pillarInfo.emoji}",
  "question": "pregunta aquí",
  "context": "texto o contexto breve si es necesario (opcional)",
  "options": ["opción A", "opción B", "opción C", "opción D"],
  "correctIndex": 0,
  "explanation": "explicación breve de por qué esta es la respuesta correcta"
}

Crea un challenge original y educativo sobre ${pillarInfo.name}.`;
  }

  if (isOpenEnded) {
    return `Eres un experto en pedagogía y lectura crítica para niños colombianos.

Debes crear un challenge de ${pillarInfo.name} (${pillarInfo.emoji}).

ENFOQUE: ${pillarInfo.description}
${pillarInfo.focus}

REGLAS IMPORTANTES:
- Tipo: Pregunta abierta
- Lenguaje apropiado para niños de 8-12 años
- El challenge debe invitar a la reflexión personal o argumentación
- Debe ser claro y específico
- Incluye un texto breve o contexto si es necesario
- No debe tener una única respuesta correcta, sino evaluar la calidad de la reflexión/argumentación

RESPONDE ÚNICAMENTE EN FORMATO JSON (sin texto adicional, sin markdown):
{
  "type": "open_ended",
  "pillar": "${pillar}",
  "pillarName": "${pillarInfo.name}",
  "pillarEmoji": "${pillarInfo.emoji}",
  "question": "pregunta aquí",
  "context": "texto o contexto breve si es necesario (opcional)",
  "explanation": "qué se espera en una buena respuesta"
}

Crea un challenge original y educativo sobre ${pillarInfo.name}.`;
  }

  return "";
}

function tryParseJSON(text: string) {
  try {
    // Limpiar el texto de posibles marcadores de código
    let clean = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Buscar el primer { y el último } para extraer solo el JSON
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      clean = clean.substring(firstBrace, lastBrace + 1);
    }

    return JSON.parse(clean);
  } catch (error) {
    console.error("JSON parse error:", error);
    console.error("Text to parse:", text.substring(0, 500));
    return null;
  }
}

Deno.serve(async (req: Request) => {
  // CORS preflight - siempre responder primero, antes de cualquier otra cosa
  // Esto debe estar fuera de cualquier try-catch para asegurar que siempre funcione
  if (req.method === "OPTIONS") {
    try {
      const corsHeaders = buildCorsHeaders(req);
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    } catch (error) {
      // Si hay algún error, devolver headers básicos de CORS
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
  }

  const corsHeaders = buildCorsHeaders(req);

  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    let body: TutorRequest;
    try {
      body = (await req.json()) as TutorRequest;
    } catch (parseError) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    const mode = body?.mode ?? "daily-challenge";

    const prompt = buildPrompt(mode, body);

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Invalid mode or missing parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let output = "";
    let lastError: Error | null = null;

    try {
      output = await callVertex(prompt);
    } catch (vertexError) {
      console.error("Vertex error:", vertexError);
      lastError =
        vertexError instanceof Error
          ? vertexError
          : new Error(String(vertexError));
      try {
        // Fallback to Gemini API key if Vertex isn't configured
        output = await callGeminiAPI(prompt);
      } catch (geminiError) {
        console.error("Gemini API error:", geminiError);
        const errorMsg =
          geminiError instanceof Error
            ? geminiError.message
            : String(geminiError);
        return new Response(
          JSON.stringify({
            error: `Error al generar contenido: ${errorMsg}`,
            details: lastError?.message,
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    if (!output || output.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: "No se recibió respuesta del modelo de IA",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const parsed = tryParseJSON(output);
    if (parsed) {
      if (mode === "daily-challenge") {
        // Validar estructura del challenge
        if (!parsed.type || !parsed.question) {
          return new Response(
            JSON.stringify({
              error: "La respuesta no contiene un challenge válido",
              raw: output.substring(0, 500),
            }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }
        return new Response(JSON.stringify({ challenge: parsed }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      if (mode === "feedback") {
        // Validar estructura del feedback
        if (typeof parsed.stars !== "number" || !parsed.feedback) {
          return new Response(
            JSON.stringify({
              error: "La respuesta no contiene feedback válido",
              raw: output.substring(0, 500),
            }),
            {
              status: 500,
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }
        return new Response(JSON.stringify(parsed), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      return new Response(JSON.stringify(parsed), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // Fallback si no se puede parsear JSON
    console.error("Failed to parse JSON. Output:", output.substring(0, 1000));
    return new Response(
      JSON.stringify({
        error: "No se pudo parsear la respuesta JSON. Intenta de nuevo.",
        raw: output.substring(0, 500),
        hint: "La respuesta del modelo no es un JSON válido",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (e) {
    const corsHeaders = buildCorsHeaders(req);
    return new Response(
      JSON.stringify({
        error: String(e),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
