import { supabase } from "@/integrations/supabase/client";

type TutorMode = "hint" | "daily-challenge" | "riddle" | "feedback";

export async function askTutor<T = unknown>(
  mode: TutorMode,
  payload: Record<string, unknown>
): Promise<T> {
  const { data, error } = await supabase.functions.invoke("daily-challenge", {
    body: { mode, ...payload },
  });
  if (error) {
    throw error;
  }
  return data as T;
}

// Tipos para las respuestas del generador de cuentos
export interface GeneratedStory {
  title: string;
  content: string;
  vocabularyWord: string;
  vocabularyDefinition: string;
  readingTimeMinutes: number;
  theme: string;
  ageAppropriate: string;
}

export interface StoryQuestion {
  id: string;
  pillar: "interpretacion" | "inferencia" | "reflexion" | "argumentacion";
  pillarName: string;
  pillarEmoji: string;
  question: string;
  type: "multiple_choice" | "open_ended";
  options?: string[];
  correctAnswer?: string;
  hints: string[];
}

export interface QuestionsResponse {
  questions: StoryQuestion[];
}

export interface AnswerEvaluation {
  isCorrect: boolean;
  stars: number;
  feedback: string;
  explanation: string;
  encouragement: string;
}

// Tipos para challenges diarios
export interface DailyChallenge {
  type: "multiple_choice" | "open_ended";
  pillar: "interpretacion" | "inferencia" | "reflexion" | "argumentacion";
  pillarName: string;
  pillarEmoji: string;
  question: string;
  context?: string;
  options?: string[];
  correctIndex?: number;
  explanation: string;
}

export interface ChallengeFeedback {
  stars: number;
  feedback: string;
  explanation: string;
  encouragement: string;
}

export async function generateStory(age: number): Promise<GeneratedStory> {
  const { data, error } = await supabase.functions.invoke("books", {
    body: { mode: "generate-story", age },
  });
  if (error) {
    throw error;
  }
  return data as GeneratedStory;
}

export async function generateQuestions(
  story: string,
  storyTitle: string
): Promise<QuestionsResponse> {
  try {
    const { data, error } = await supabase.functions.invoke("books", {
      body: { mode: "generate-questions", story, storyTitle },
    });

    if (error) {
      console.error("Supabase function error:", error);
      throw new Error(
        error.message ||
          "Error al generar las preguntas. Por favor, intenta de nuevo."
      );
    }

    if (!data) {
      throw new Error("No se recibió respuesta del servidor");
    }

    // Verificar si la respuesta contiene un error
    if (data.error) {
      console.error("Error in response:", data.error);
      throw new Error(
        typeof data.error === "string"
          ? data.error
          : "Error al generar las preguntas. Por favor, intenta de nuevo."
      );
    }

    // Validar que la respuesta tenga la estructura esperada
    if (!data.questions || !Array.isArray(data.questions)) {
      console.error("Invalid response format:", data);
      throw new Error(
        "El formato de la respuesta no es válido. Por favor, intenta de nuevo."
      );
    }

    return data as QuestionsResponse;
  } catch (err) {
    console.error("Error in generateQuestions:", err);
    if (err instanceof Error) {
      throw err;
    }
    throw new Error("Error desconocido al generar las preguntas");
  }
}

export async function evaluateAnswer(
  question: string,
  userAnswer: string,
  pillar: string,
  correctAnswer?: string
): Promise<AnswerEvaluation> {
  const { data, error } = await supabase.functions.invoke("books", {
    body: {
      mode: "evaluate-answer",
      question,
      userAnswer,
      pillar,
      correctAnswer,
    },
  });
  if (error) {
    throw error;
  }
  return data as AnswerEvaluation;
}
