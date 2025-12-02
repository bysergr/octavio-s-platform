import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Supabase Edge Function: story-generator
// Genera cuentos mágicos y preguntas de lectura crítica usando Gemini

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "*";
  const reqHeaders =
    req.headers.get("Access-Control-Request-Headers") ??
    "authorization, x-client-info, apikey, content-type";

  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Headers": reqHeaders,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
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

// Temas para cuentos según la edad
const STORY_THEMES = {
  young: [
    "animales mágicos del bosque",
    "un pequeño dragón que aprende a volar",
    "la estrella que quería brillar más",
    "el conejo valiente y sus amigos",
    "la mariposa de colores",
    "el árbol que hablaba",
    "la nube viajera",
    "el pez dorado aventurero",
  ],
  middle: [
    "el misterio del jardín encantado",
    "viaje a una isla desconocida",
    "el inventor y su máquina del tiempo",
    "el reino de las palabras perdidas",
    "la aventura en la biblioteca mágica",
    "el secreto del faro antiguo",
    "los guardianes del bosque mágico",
    "el mapa del tesoro escondido",
  ],
  older: [
    "el enigma del científico desaparecido",
    "la leyenda del pueblo olvidado",
    "el diario secreto del explorador",
    "la misión para salvar el ecosistema",
    "el código oculto en las estrellas",
    "la historia del músico callejero",
    "el misterio del museo nocturno",
    "la conexión entre dos mundos",
  ],
};

const VOCABULARY_WORDS = {
  young: ["brillante", "misterioso", "valiente", "curioso", "especial"],
  middle: [
    "intrépido",
    "extraordinario",
    "enigmático",
    "perseverante",
    "ingenioso",
  ],
  older: ["perspicaz", "resiliente", "meticuloso", "empático", "audaz"],
};

interface StoryRequest {
  mode: "generate-story" | "generate-questions" | "evaluate-answer";
  age?: number;
  story?: string;
  storyTitle?: string;
  question?: string;
  userAnswer?: string;
  pillar?: string;
  correctAnswer?: string;
}

function buildPrompt(mode: string, payload: StoryRequest): string {
  const age = payload.age ?? 8;

  if (mode === "generate-story") {
    const ageGroup = age <= 8 ? "young" : age <= 11 ? "middle" : "older";
    const themes = STORY_THEMES[ageGroup];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    const vocabulary = VOCABULARY_WORDS[ageGroup];
    const randomVocab =
      vocabulary[Math.floor(Math.random() * vocabulary.length)];

    const wordCount = age <= 8 ? "200-300" : age <= 11 ? "300-400" : "400-500";

    return `Eres un autor de cuentos infantiles colombiano. Creas historias mágicas, educativas y apropiadas para niños.

REGLAS IMPORTANTES:
- El cuento debe ser en español, usando lenguaje apropiado para la edad.
- Debe tener un mensaje positivo o una enseñanza.
- Incluir diálogos y descripciones vívidas.
- La historia debe ser completa con inicio, desarrollo y final.
- Longitud: ${wordCount} palabras.
- Incluir al menos una palabra de vocabulario interesante que el niño pueda aprender.

RESPONDE ÚNICAMENTE EN FORMATO JSON (sin texto adicional, sin markdown):
{
  "title": "Título del cuento",
  "content": "El cuento completo...",
  "vocabularyWord": "palabra",
  "vocabularyDefinition": "definición simple de la palabra",
  "readingTimeMinutes": 3,
  "theme": "tema del cuento",
  "ageAppropriate": "${age} años"
}

Crea un cuento original sobre "${randomTheme}" para un niño de ${age} años. 
Incluye la palabra "${randomVocab}" de forma natural en la historia y proporciona su definición.`;
  }

  if (mode === "generate-questions") {
    const storyTitle = payload.storyTitle || "Sin título";
    const story = payload.story || "";

    // Limitar la longitud del cuento para evitar problemas con el prompt
    const storyPreview =
      story.length > 2000 ? story.substring(0, 2000) + "..." : story;

    return `Eres un experto en pedagogía y lectura crítica para niños colombianos.

Debes crear EXACTAMENTE 4 preguntas basadas en los 4 pilares de la lectura crítica:

1. INTERPRETACIÓN (¿Qué dice el texto?): Comprensión literal, identificar ideas principales, secuenciar eventos.
2. INFERENCIA (¿Qué quiere decir?): Deducir información implícita, entender motivaciones, predecir consecuencias.
3. REFLEXIÓN (¿Qué pienso yo?): Conectar con experiencias personales, formar opiniones, evaluar valores.
4. ARGUMENTACIÓN (¿Cómo lo justifico?): Defender una postura, usar evidencia del texto, comparar perspectivas.

REGLAS IMPORTANTES:
- 2 preguntas de opción múltiple (interpretación e inferencia) con exactamente 4 opciones cada una
- 2 preguntas abiertas (reflexión y argumentación)
- Lenguaje apropiado para niños
- Las preguntas deben ser desafiantes pero justas
- Incluir al menos 2 pistas útiles para cada pregunta
- Las respuestas correctas deben coincidir EXACTAMENTE con una de las opciones

Cuento: "${storyTitle}"

${storyPreview}

IMPORTANTE: Responde SOLO con un objeto JSON válido. No incluyas texto adicional, explicaciones, ni markdown. El JSON debe empezar con { y terminar con }.

Formato JSON requerido:
{
  "questions": [
    {
      "id": "q1",
      "pillar": "interpretacion",
      "pillarName": "Interpretación",
      "pillarEmoji": "📖",
      "question": "pregunta aquí",
      "type": "multiple_choice",
      "options": ["opción A", "opción B", "opción C", "opción D"],
      "correctAnswer": "opción correcta exacta",
      "hints": ["pista 1", "pista 2"]
    },
    {
      "id": "q2",
      "pillar": "inferencia",
      "pillarName": "Inferencia",
      "pillarEmoji": "🔮",
      "question": "pregunta aquí",
      "type": "multiple_choice",
      "options": ["opción A", "opción B", "opción C", "opción D"],
      "correctAnswer": "opción correcta exacta",
      "hints": ["pista 1", "pista 2"]
    },
    {
      "id": "q3",
      "pillar": "reflexion",
      "pillarName": "Reflexión",
      "pillarEmoji": "💭",
      "question": "pregunta aquí",
      "type": "open_ended",
      "hints": ["pista 1", "pista 2"]
    },
    {
      "id": "q4",
      "pillar": "argumentacion",
      "pillarName": "Argumentación",
      "pillarEmoji": "🎯",
      "question": "pregunta aquí",
      "type": "open_ended",
      "hints": ["pista 1", "pista 2"]
    }
  ]
}

Crea las 4 preguntas de lectura crítica para este cuento.`;
  }

  if (mode === "evaluate-answer") {
    return `Eres un tutor amigable que evalúa las respuestas de niños con mucho cariño y apoyo.

REGLAS DE EVALUACIÓN:
- Sé siempre positivo y alentador
- Reconoce el esfuerzo del niño
- Da feedback constructivo
- Usa lenguaje simple y amigable
- Incluye emojis para hacerlo más divertido

Para preguntas de opción múltiple:
- Si es correcta: 3 estrellas
- Si es incorrecta: 1 estrella (por intentarlo)

Para preguntas abiertas, evalúa:
- Coherencia con el cuento
- Profundidad de la reflexión
- Claridad de expresión
- Da entre 1-3 estrellas según la calidad

Pilar evaluado: ${payload.pillar || "general"}
Pregunta: ${payload.question || ""}
${
  payload.correctAnswer
    ? `Respuesta correcta esperada: ${payload.correctAnswer}`
    : ""
}
Respuesta del estudiante: ${payload.userAnswer || ""}

RESPONDE ÚNICAMENTE EN FORMATO JSON (sin texto adicional, sin markdown):
{
  "isCorrect": true,
  "stars": 3,
  "feedback": "mensaje motivador personalizado",
  "explanation": "por qué la respuesta es correcta/incorrecta o cómo mejorar",
  "encouragement": "frase de ánimo final"
}

Evalúa esta respuesta de manera amigable y constructiva.`;
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
  try {
    const corsHeaders = buildCorsHeaders(req);

    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (req.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    const body = (await req.json()) as StoryRequest;
    const mode = body?.mode ?? "generate-story";

    // Validar parámetros según el modo
    if (mode === "generate-questions") {
      if (!body.story || !body.storyTitle) {
        return new Response(
          JSON.stringify({
            error:
              "Faltan parámetros requeridos: story y storyTitle son necesarios",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

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
      // Validar que para generate-questions tenga la estructura correcta
      if (mode === "generate-questions") {
        if (!parsed.questions || !Array.isArray(parsed.questions)) {
          console.error("Invalid questions structure:", parsed);
          return new Response(
            JSON.stringify({
              error: "La respuesta no contiene preguntas válidas",
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
