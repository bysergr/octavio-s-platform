import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Sparkles,
  Trophy,
  Star,
  Zap,
  Brain,
  Puzzle,
  BookOpen,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { askGames } from "@/integrations/ai/games";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import octavioCelebrating from "@/assets/octavio-celebrating.png";
import octavioThinking from "@/assets/octavio-thinking.png";

type GameType = "comprehension" | "sequence" | "vocabulary" | "inference";

type ComprehensionText = {
  title: string;
  text: string;
  questions: Array<{
    question: string;
    options: string[];
    correct: number;
    skill: string;
  }>;
};

type SequenceStory = {
  title: string;
  events: string[];
};

type VocabularyExercise = {
  sentence: string;
  options: string[];
  correct: number;
  explanation: string;
};

const Games = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeGame, setActiveGame] = useState<GameType>("comprehension");
  const [totalScore, setTotalScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // Comprensión lectora state
  const [comprehensionText, setComprehensionText] =
    useState<ComprehensionText | null>(null);
  const [comprehensionLoading, setComprehensionLoading] = useState(false);
  const [selectedComprehensionAnswer, setSelectedComprehensionAnswer] =
    useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [comprehensionFeedback, setComprehensionFeedback] = useState<
    string | null
  >(null);
  const [comprehensionCompleted, setComprehensionCompleted] = useState(false);
  const [comprehensionLocked, setComprehensionLocked] = useState(false);

  // Secuencia de eventos state
  const [sequenceStory, setSequenceStory] = useState<SequenceStory | null>(
    null
  );
  const [sequenceLoading, setSequenceLoading] = useState(false);
  const [sequenceOrder, setSequenceOrder] = useState<number[]>([]);
  const [sequenceFeedback, setSequenceFeedback] = useState<string | null>(null);
  const [sequenceLocked, setSequenceLocked] = useState(false);

  // Vocabulario state
  const [vocabularyExercise, setVocabularyExercise] =
    useState<VocabularyExercise | null>(null);
  const [vocabularyLoading, setVocabularyLoading] = useState(false);
  const [selectedVocabOption, setSelectedVocabOption] = useState<number | null>(
    null
  );
  const [vocabFeedback, setVocabFeedback] = useState<string | null>(null);
  const [vocabularyLocked, setVocabularyLocked] = useState(false);

  // Inferencia state
  const [inferenceQuestion, setInferenceQuestion] = useState<{
    text: string;
    question: string;
    options: string[];
    correct: number;
    explanation: string;
    skill: string;
  } | null>(null);
  const [selectedInferenceOption, setSelectedInferenceOption] = useState<
    number | null
  >(null);
  const [inferenceFeedback, setInferenceFeedback] = useState<string | null>(
    null
  );
  const [inferenceLoading, setInferenceLoading] = useState(false);
  const [inferenceLocked, setInferenceLocked] = useState(false);

  // AI section state
  const [_aiLoading, setAiLoading] = useState(false);
  const [storyInput, _setStoryInput] = useState("");
  const [_hintText, setHintText] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<{
    type: "multiple_choice";
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  } | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [_challengeFeedback, setChallengeFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);

  // Initialize games
  useEffect(() => {
    if (activeGame === "comprehension" && !comprehensionText) {
      generateComprehensionText();
    }
    if (activeGame === "sequence" && !sequenceStory) {
      generateSequenceStory();
    }
    if (activeGame === "vocabulary" && !vocabularyExercise) {
      generateVocabularyExercise();
    }
    if (activeGame === "inference" && !inferenceQuestion) {
      generateInferenceQuestion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGame]);

  const generateComprehensionText = async () => {
    setComprehensionLoading(true);
    try {
      const res = await askGames<{
        text: {
          title: string;
          content: string;
          questions: Array<{
            question: string;
            options: string[];
            correctIndex: number;
            skill: string;
          }>;
        };
      }>("daily-challenge", {
        story:
          "Genera un cuento corto para niños de 8 años con 2 preguntas de comprensión lectora. Una debe ser de interpretación y otra de inferencia o reflexión.",
        age: 8,
        level: 1,
      });

      if (res.text) {
        setComprehensionText({
          title: res.text.title || "Cuento Mágico",
          text: res.text.content || "",
          questions: res.text.questions.map((q) => ({
            question: q.question,
            options: q.options,
            correct: q.correctIndex,
            skill: q.skill || "Interpretación",
          })),
        });
      } else {
        // Fallback
        setComprehensionText({
          title: "El Tesoro Perdido",
          text: "María encontró un mapa antiguo en el ático de su abuela. El mapa tenía marcas rojas que señalaban un lugar en el bosque. Decidió seguir las pistas con su mejor amigo Tomás. Después de caminar dos horas, encontraron un árbol muy grande con una X marcada. Cavaron y encontraron una caja llena de monedas antiguas.",
          questions: [
            {
              question: "¿Cuál es la idea principal de este texto?",
              options: [
                "María y Tomás encontraron un tesoro siguiendo un mapa",
                "El ático de la abuela tenía cosas viejas",
                "Los mapas antiguos son difíciles de leer",
              ],
              correct: 0,
              skill: "Interpretación",
            },
            {
              question: "¿Por qué María decidió seguir el mapa?",
              options: [
                "Porque tenía marcas rojas que señalaban un lugar",
                "Porque su abuela se lo pidió",
                "Porque estaba aburrida",
              ],
              correct: 0,
              skill: "Inferencia",
            },
          ],
        });
      }
    } catch {
      // Fallback on error
      setComprehensionText({
        title: "El Tesoro Perdido",
        text: "María encontró un mapa antiguo en el ático de su abuela. El mapa tenía marcas rojas que señalaban un lugar en el bosque. Decidió seguir las pistas con su mejor amigo Tomás. Después de caminar dos horas, encontraron un árbol muy grande con una X marcada. Cavaron y encontraron una caja llena de monedas antiguas.",
        questions: [
          {
            question: "¿Cuál es la idea principal de este texto?",
            options: [
              "María y Tomás encontraron un tesoro siguiendo un mapa",
              "El ático de la abuela tenía cosas viejas",
              "Los mapas antiguos son difíciles de leer",
            ],
            correct: 0,
            skill: "Interpretación",
          },
          {
            question: "¿Por qué María decidió seguir el mapa?",
            options: [
              "Porque tenía marcas rojas que señalaban un lugar",
              "Porque su abuela se lo pidió",
              "Porque estaba aburrida",
            ],
            correct: 0,
            skill: "Inferencia",
          },
        ],
      });
    } finally {
      setComprehensionLoading(false);
      setComprehensionLocked(false);
    }
  };

  const generateSequenceStory = async () => {
    setSequenceLoading(true);
    try {
      const res = await askGames<{
        sequence: {
          title: string;
          events: string[];
        };
      }>("daily-challenge", {
        story:
          "Genera una secuencia de 5 eventos para ordenar. Debe ser una actividad simple y clara para niños de 8 años, como preparar algo, hacer una actividad, o seguir un proceso.",
        age: 8,
        level: 1,
      });

      if (res.sequence) {
        setSequenceStory({
          title: res.sequence.title || "Actividad",
          events: res.sequence.events || [],
        });
        const shuffled = [...Array(res.sequence.events.length).keys()].sort(
          () => Math.random() - 0.5
        );
        setSequenceOrder(shuffled);
      } else {
        // Fallback
        const fallback = {
          title: "Preparando el Pastel",
          events: [
            "Prender el horno a 180 grados",
            "Mezclar los ingredientes en un bowl",
            "Verter la mezcla en el molde",
            "Hornear por 30 minutos",
            "Dejar enfriar y decorar",
          ],
        };
        setSequenceStory(fallback);
        const shuffled = [...Array(fallback.events.length).keys()].sort(
          () => Math.random() - 0.5
        );
        setSequenceOrder(shuffled);
      }
    } catch {
      // Fallback on error
      const fallback = {
        title: "Preparando el Pastel",
        events: [
          "Prender el horno a 180 grados",
          "Mezclar los ingredientes en un bowl",
          "Verter la mezcla en el molde",
          "Hornear por 30 minutos",
          "Dejar enfriar y decorar",
        ],
      };
      setSequenceStory(fallback);
      const shuffled = [...Array(fallback.events.length).keys()].sort(
        () => Math.random() - 0.5
      );
      setSequenceOrder(shuffled);
    } finally {
      setSequenceLoading(false);
      setSequenceLocked(false);
    }
  };

  const generateVocabularyExercise = async () => {
    setVocabularyLoading(true);
    try {
      const res = await askGames<{
        exercise: {
          sentence: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        };
      }>("daily-challenge", {
        story:
          "Genera un ejercicio de vocabulario en contexto. Debe tener una oración con un espacio en blanco (___________), 3 opciones de palabras, y una explicación de por qué la respuesta correcta es la adecuada.",
        age: 8,
        level: 1,
      });

      if (res.exercise) {
        setVocabularyExercise({
          sentence: res.exercise.sentence || "",
          options: res.exercise.options || [],
          correct: res.exercise.correctIndex || 0,
          explanation: res.exercise.explanation || "",
        });
      } else {
        // Fallback
        setVocabularyExercise({
          sentence:
            "El científico hizo un ___________ importante que cambiará la medicina.",
          options: ["descubrimiento", "libro", "viaje"],
          correct: 0,
          explanation:
            "Un descubrimiento es algo que se encuentra o se aprende por primera vez.",
        });
      }
    } catch {
      // Fallback on error
      setVocabularyExercise({
        sentence:
          "El científico hizo un ___________ importante que cambiará la medicina.",
        options: ["descubrimiento", "libro", "viaje"],
        correct: 0,
        explanation:
          "Un descubrimiento es algo que se encuentra o se aprende por primera vez.",
      });
    } finally {
      setVocabularyLoading(false);
      setVocabularyLocked(false);
    }
  };

  const moveSequenceItem = (index: number, direction: "up" | "down") => {
    if (sequenceLocked) return;
    const newOrder = [...sequenceOrder];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newOrder.length) return;
    [newOrder[index], newOrder[newIndex]] = [
      newOrder[newIndex],
      newOrder[index],
    ];
    setSequenceOrder(newOrder);
    setSequenceFeedback(null);
  };

  const checkSequence = () => {
    if (!sequenceStory) return;
    const isCorrect = sequenceOrder.every((val, idx) => val === idx);
    if (isCorrect) {
      setSequenceFeedback("¡Perfecto! Ordenaste los eventos correctamente 🎉");
      celebrate("¡Excelente comprensión de secuencias! 🌟", 10);
    } else {
      setSequenceFeedback(
        "Revisa el orden. Piensa en qué debe pasar primero y qué después."
      );
      setSequenceLocked(true);
      toast({
        title: "Intenta de nuevo",
        description: "Piensa en el orden lógico de los eventos",
      });
    }
  };

  const handleComprehensionAnswer = () => {
    if (selectedComprehensionAnswer === null || !comprehensionText) return;
    const question = comprehensionText.questions[currentQuestion];
    const correct = selectedComprehensionAnswer === question.correct;

    if (correct) {
      setComprehensionFeedback(
        `¡Correcto! 🎉 Desarrollaste tu habilidad de ${question.skill}`
      );
      celebrate(`¡Excelente ${question.skill}! ⭐`, 8);

      if (currentQuestion < comprehensionText.questions.length - 1) {
        setTimeout(() => {
          setCurrentQuestion((c) => c + 1);
          setSelectedComprehensionAnswer(null);
          setComprehensionFeedback(null);
        }, 2000);
      } else {
        setComprehensionCompleted(true);
        setTimeout(() => {
          // Generate new text
          generateComprehensionText();
          setCurrentQuestion(0);
          setSelectedComprehensionAnswer(null);
          setComprehensionFeedback(null);
          setComprehensionCompleted(false);
          celebrate("¡Completaste el texto! 🌟", 15);
        }, 3000);
      }
    } else {
      setComprehensionFeedback("Piensa mejor. Relee el texto y busca pistas.");
      setComprehensionLocked(true);
      toast({
        title: "Intenta de nuevo",
        description: "Vuelve a leer el texto cuidadosamente",
      });
    }
  };

  const proceedAfterComprehensionWrong = () => {
    if (!comprehensionText) return;
    if (currentQuestion < comprehensionText.questions.length - 1) {
      setCurrentQuestion((c) => c + 1);
      setSelectedComprehensionAnswer(null);
      setComprehensionFeedback(null);
      setComprehensionLocked(false);
    } else {
      generateComprehensionText();
      setCurrentQuestion(0);
      setSelectedComprehensionAnswer(null);
      setComprehensionFeedback(null);
      setComprehensionLocked(false);
    }
  };

  const handleVocabularyAnswer = () => {
    if (selectedVocabOption === null || !vocabularyExercise) return;
    const correct = selectedVocabOption === vocabularyExercise.correct;

    if (correct) {
      setVocabFeedback(`¡Correcto! 🎉 ${vocabularyExercise.explanation}`);
      celebrate("¡Excelente comprensión de vocabulario! 🌟", 8);
      setTimeout(() => {
        // Generate new exercise
        generateVocabularyExercise();
        setSelectedVocabOption(null);
        setVocabFeedback(null);
      }, 2000);
    } else {
      setVocabFeedback(`No es correcto. ${vocabularyExercise.explanation}`);
      setVocabularyLocked(true);
      toast({
        title: "Intenta de nuevo",
        description: "Piensa en qué palabra tiene más sentido en el contexto",
      });
    }
  };

  const generateInferenceQuestion = async () => {
    setInferenceLoading(true);
    try {
      const res = await askGames<{
        challenge?: {
          type: "multiple_choice";
          question: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        };
        text?:
          | string
          | {
              content?: string;
              questions?: Array<{
                question: string;
                options: string[];
                correctIndex?: number;
                explanation?: string;
                skill?: string;
              }>;
            };
      }>("daily-challenge", {
        // Pide explícitamente una pregunta de inferencia con mini texto para obtener { challenge, text }
        story:
          "Genera una pregunta de INFERENCIA de opción múltiple (3 opciones) con explicación breve, basada en un MINI TEXTO. Devuelve el formato de challenge con 'text' de contexto.",
        age: 8,
        level: 1,
      });
      const data = res;
      if (data?.challenge?.question) {
        setInferenceQuestion({
          text:
            (typeof data?.text === "object"
              ? data?.text?.content
              : data?.text) ||
            "Un niño encontró una planta especial que brillaba de noche.",
          question: data.challenge.question,
          options: data.challenge.options,
          correct: data.challenge.correctIndex,
          explanation: data.challenge.explanation,
          skill: "Inferencia",
        });
        return;
      }
      // Si vino un objeto 'text' (fallback de la función) con preguntas, intenta extraer la de inferencia
      const questions =
        typeof data?.text === "object" ? data?.text?.questions : undefined;
      if (Array.isArray(questions) && questions.length > 0) {
        const inferQ =
          questions.find(
            (q) =>
              typeof q?.skill === "string" &&
              q.skill.toLowerCase().includes("infer")
          ) || questions[0];
        if (inferQ?.question && Array.isArray(inferQ?.options)) {
          setInferenceQuestion({
            text:
              (typeof data?.text === "object" && data?.text?.content) ||
              "Texto breve de contexto.",
            question: inferQ.question,
            options: inferQ.options,
            correct:
              typeof inferQ.correctIndex === "number" ? inferQ.correctIndex : 0,
            explanation:
              inferQ.explanation ||
              "Piensa en lo que puedes deducir a partir de las pistas del texto.",
            skill: "Inferencia",
          });
          return;
        }
      }
      // Si nada de lo anterior aplica, cae al fallback local
      throw new Error("Invalid response shape for inference");
    } catch {
      setInferenceQuestion({
        text: "Ana siempre leía antes de dormir. Sus libros favoritos eran de aventuras. Un día, su mamá le regaló un libro nuevo sobre piratas. Ana lo leyó en una sola noche porque le encantó tanto.",
        question: "¿Qué podemos inferir sobre Ana?",
        options: [
          "Le gusta mucho leer y disfruta las historias de aventuras",
          "No le gusta leer",
          "Solo lee libros de piratas",
        ],
        correct: 0,
        explanation:
          "El texto muestra que Ana lee mucho, especialmente historias de aventuras, y se emociona con los libros nuevos.",
        skill: "Inferencia",
      });
    } finally {
      setInferenceLoading(false);
      setInferenceLocked(false);
    }
  };

  const handleInferenceAnswer = () => {
    if (!inferenceQuestion || selectedInferenceOption === null) return;
    const correct = selectedInferenceOption === inferenceQuestion.correct;

    if (correct) {
      setInferenceFeedback(`¡Correcto! 🎉 ${inferenceQuestion.explanation}`);
      celebrate(`¡Excelente ${inferenceQuestion.skill}! 🌟`, 10);
      setTimeout(() => {
        generateInferenceQuestion();
        setSelectedInferenceOption(null);
        setInferenceFeedback(null);
      }, 3000);
    } else {
      setInferenceFeedback(`No es correcto. ${inferenceQuestion.explanation}`);
      setInferenceLocked(true);
      toast({
        title: "Intenta de nuevo",
        description: "Piensa en qué información puedes deducir del texto",
      });
    }
  };

  const celebrate = (message: string, points: number) => {
    setShowConfetti(true);
    setTotalScore((s) => s + points);
    toast({
      title: message,
      description: `+${points} puntos ⭐`,
    });
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("total_points")
          .eq("id", user.id)
          .single();
        const newTotalPoints = (profile?.total_points ?? 0) + points;
        await supabase
          .from("profiles")
          .update({ total_points: newTotalPoints })
          .eq("id", user.id);
      } catch {
        // Ignored intentionally to not interrupt the UX
      }
    })();
    setTimeout(() => setShowConfetti(false), 2000);
  };

  const _askHint = async () => {
    setAiLoading(true);
    setHintText(null);
    setChallenge(null);
    setSelectedOption(null);
    setChallengeFeedback(null);
    try {
      const res = await askGames<{ text: string }>("hint", {
        story: storyInput,
        age: 8,
        level: 1,
      });
      setHintText(res.text);
    } catch {
      setHintText("Piensa en qué idea se repite más en el texto. ¡Tú puedes!");
    } finally {
      setAiLoading(false);
    }
  };

  const _generateDailyChallenge = async () => {
    setAiLoading(true);
    setHintText(null);
    setChallenge(null);
    setSelectedOption(null);
    setChallengeFeedback(null);
    try {
      const res = await askGames<{
        challenge: {
          type: "multiple_choice";
          question: string;
          options: string[];
          correctIndex: number;
          explanation: string;
        };
      }>("daily-challenge", {
        story: storyInput,
        age: 8,
        level: 1,
      });
      setChallenge(res.challenge);
    } catch {
      setChallenge({
        type: "multiple_choice",
        question: "¿Cuál es la idea principal del texto?",
        options: [
          "La búsqueda del tesoro",
          "El color del mapa",
          "El número de páginas",
        ],
        correctIndex: 0,
        explanation: "Piensa en qué habla la mayor parte del texto.",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const _submitChallengeAnswer = () => {
    if (!challenge || selectedOption === null) return;
    const correct = selectedOption === challenge.correctIndex;
    setChallengeFeedback({
      correct,
      message: correct
        ? `¡Correcto! ${challenge.explanation}`
        : `Casi, revisa las pistas del texto. ${challenge.explanation}`,
    });
    if (correct) {
      celebrate("¡Respuesta correcta! 🎉", 8);
    }
  };

  return (
    <div className="min-h-screen p-4 py-8 relative overflow-hidden">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <span className="text-2xl">
                {
                  ["🎉", "⭐", "🌟", "✨", "🎊", "🎈"][
                    Math.floor(Math.random() * 6)
                  ]
                }
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button
            onClick={() => navigate("/menu")}
            variant="ghost"
            className="text-gray-700 hover:text-gray-600 text-lg hover:bg-transparent font-bold transition-all"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al Menú
          </Button>
          <div className="flex items-center gap-3 bg-gradient-to-r from-accent/20 to-secondary/20 border-2 border-accent/40 rounded-2xl px-6 py-3">
            <Trophy className="w-6 h-6 text-accent" />
            <div>
              <div className="text-xs text-muted-foreground">
                Puntos Totales
              </div>
              <div className="text-2xl font-black text-foreground">
                {totalScore}
              </div>
            </div>
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
          </div>
        </div>

        <Card className="bg-card/95 backdrop-blur-sm border-4 border-secondary/30 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <img
                src={
                  activeGame === "comprehension"
                    ? octavioThinking
                    : octavioCelebrating
                }
                alt="Octavio"
                className="w-20 h-20 animate-float"
              />
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-foreground mb-2">
                📚 Lectura Crítica 📚
              </h1>
              <p className="text-lg text-muted-foreground">
                Desarrolla tus habilidades de lectura crítica mientras juegas
              </p>
            </div>
          </div>

          <Tabs
            value={activeGame}
            onValueChange={(v) => setActiveGame(v as GameType)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 mb-6 h-auto p-2 bg-muted/50 rounded-2xl">
              <TabsTrigger
                value="comprehension"
                className="text-base font-bold data-[state=active]:bg-primary data-[state=active]:text-white rounded-xl"
              >
                <Brain className="w-5 h-5 mr-2" />
                Comprensión
              </TabsTrigger>
              <TabsTrigger
                value="sequence"
                className="text-base font-bold data-[state=active]:bg-secondary data-[state=active]:text-white rounded-xl"
              >
                <Puzzle className="w-5 h-5 mr-2" />
                Secuencias
              </TabsTrigger>
              <TabsTrigger
                value="vocabulary"
                className="text-base font-bold data-[state=active]:bg-accent data-[state=active]:text-white rounded-xl"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Vocabulario
              </TabsTrigger>
              <TabsTrigger
                value="inference"
                className="text-base font-bold data-[state=active]:bg-success data-[state=active]:text-white rounded-xl"
              >
                <Zap className="w-5 h-5 mr-2" />
                Inferencias
              </TabsTrigger>
            </TabsList>

            {/* Comprensión Lectora Tab */}
            <TabsContent value="comprehension" className="space-y-6">
              <Card className="bg-gradient-to-br from-primary/20 to-secondary/20 border-2 border-primary/40 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-6 h-6 text-primary" />
                  <h2 className="text-2xl font-black text-foreground">
                    📖 Comprensión de Texto
                  </h2>
                </div>
                {comprehensionLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : comprehensionText ? (
                  <>
                    <div className="bg-white/80 rounded-xl p-6 mb-4 border-2 border-primary/30">
                      <h3 className="text-xl font-bold text-foreground mb-3">
                        {comprehensionText.title}
                      </h3>
                      <p className="text-lg text-foreground leading-relaxed">
                        {comprehensionText.text}
                      </p>
                    </div>
                    {!comprehensionCompleted && (
                      <div className="bg-accent/10 border-2 border-accent/30 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                          <Badge className="bg-primary">
                            {comprehensionText.questions[currentQuestion].skill}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Pregunta {currentQuestion + 1} de{" "}
                            {comprehensionText.questions.length}
                          </span>
                        </div>
                        <p className="text-xl font-bold text-foreground mb-4">
                          {
                            comprehensionText.questions[currentQuestion]
                              .question
                          }
                        </p>
                        <div className="space-y-3 mb-4">
                          {comprehensionText.questions[
                            currentQuestion
                          ].options.map((opt, idx) => (
                            <Button
                              key={idx}
                              variant={
                                selectedComprehensionAnswer === idx
                                  ? "default"
                                  : "outline"
                              }
                              disabled={comprehensionLocked}
                              onClick={() =>
                                setSelectedComprehensionAnswer(idx)
                              }
                              className="w-full text-left justify-start h-auto py-3 text-lg"
                            >
                              {opt}
                            </Button>
                          ))}
                        </div>
                        {comprehensionFeedback && (
                          <div
                            className={`mb-4 p-4 rounded-xl font-bold ${
                              comprehensionFeedback.includes("Correcto")
                                ? "bg-success/20 text-success"
                                : "bg-destructive/20 text-destructive"
                            }`}
                          >
                            {comprehensionFeedback}
                          </div>
                        )}
                        {!comprehensionLocked ? (
                          <Button
                            onClick={handleComprehensionAnswer}
                            disabled={selectedComprehensionAnswer === null}
                            className="w-full text-lg h-12 bg-gradient-to-r from-primary to-primary/80"
                          >
                            Verificar Respuesta
                          </Button>
                        ) : (
                          <Button
                            onClick={proceedAfterComprehensionWrong}
                            className="w-full text-lg h-12 bg-gradient-to-r from-primary to-primary/80"
                          >
                            Continuar
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                ) : null}
              </Card>
            </TabsContent>

            {/* Secuencia de Eventos Tab */}
            <TabsContent value="sequence" className="space-y-6">
              <Card className="bg-gradient-to-br from-secondary/20 to-accent/20 border-2 border-secondary/40 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-6">
                  <Puzzle className="w-6 h-6 text-secondary" />
                  <h2 className="text-2xl font-black text-foreground">
                    📋 Ordena la Secuencia
                  </h2>
                </div>
                {sequenceLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : sequenceStory ? (
                  <div className="bg-white/80 rounded-xl p-6 mb-4 border-2 border-secondary/30">
                    <h3 className="text-xl font-bold text-foreground mb-4">
                      {sequenceStory.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Ordena los eventos en el orden correcto usando las
                      flechas:
                    </p>
                    <div className="space-y-2">
                      {sequenceOrder.map((eventIndex, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-4 bg-muted/50 rounded-xl border-2 border-secondary/30"
                        >
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveSequenceItem(idx, "up")}
                              disabled={idx === 0 || sequenceLocked}
                              className="h-6 w-6 p-0"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveSequenceItem(idx, "down")}
                              disabled={
                                idx === sequenceOrder.length - 1 ||
                                sequenceLocked
                              }
                              className="h-6 w-6 p-0"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex-1">
                            <span className="text-lg font-bold text-primary mr-2">
                              {idx + 1}.
                            </span>
                            <span className="text-lg text-foreground">
                              {sequenceStory.events[eventIndex]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {sequenceFeedback && (
                      <div
                        className={`mt-4 p-4 rounded-xl font-bold text-center ${
                          sequenceFeedback.includes("Perfecto")
                            ? "bg-success/20 text-success"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {sequenceFeedback}
                      </div>
                    )}
                    <div className="mt-4 flex gap-3">
                      <Button
                        onClick={checkSequence}
                        disabled={sequenceLocked}
                        className="flex-1 text-lg h-12 bg-gradient-to-r from-secondary to-secondary/80"
                      >
                        Verificar Orden
                      </Button>
                      <Button
                        onClick={() => {
                          generateSequenceStory();
                        }}
                        variant="outline"
                        className="flex-1 text-lg h-12"
                      >
                        Nueva Secuencia
                      </Button>
                    </div>
                  </div>
                ) : null}
              </Card>
            </TabsContent>

            {/* Vocabulario en Contexto Tab */}
            <TabsContent value="vocabulary" className="space-y-6">
              <Card className="bg-gradient-to-br from-accent/20 to-success/20 border-2 border-accent/40 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-6 h-6 text-accent" />
                  <h2 className="text-2xl font-black text-foreground">
                    📝 Vocabulario en Contexto
                  </h2>
                </div>
                {vocabularyLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : vocabularyExercise ? (
                  <div className="bg-white/80 rounded-xl p-6 mb-4 border-2 border-accent/30">
                    <p className="text-xl text-foreground mb-6 leading-relaxed">
                      {vocabularyExercise.sentence
                        .split("___________")
                        .map((part, idx, arr) => (
                          <span key={idx}>
                            {part}
                            {idx < arr.length - 1 && (
                              <span className="inline-block mx-2 px-3 py-1 bg-accent/20 border-2 border-accent/40 rounded-lg font-bold text-accent">
                                ¿?
                              </span>
                            )}
                          </span>
                        ))}
                    </p>
                    <div className="space-y-3 mb-4">
                      {vocabularyExercise.options.map((opt, idx) => (
                        <Button
                          key={idx}
                          variant={
                            selectedVocabOption === idx ? "default" : "outline"
                          }
                          disabled={vocabularyLocked}
                          onClick={() => setSelectedVocabOption(idx)}
                          className="w-full text-lg h-16"
                        >
                          {opt}
                        </Button>
                      ))}
                    </div>
                    {vocabFeedback && (
                      <div
                        className={`mb-4 p-4 rounded-xl font-bold ${
                          vocabFeedback.includes("Correcto")
                            ? "bg-success/20 text-success"
                            : "bg-destructive/20 text-destructive"
                        }`}
                      >
                        {vocabFeedback}
                      </div>
                    )}
                    {!vocabularyLocked ? (
                      <Button
                        onClick={handleVocabularyAnswer}
                        disabled={selectedVocabOption === null}
                        className="w-full text-lg h-12 bg-gradient-to-r from-accent to-accent/80"
                      >
                        Verificar Respuesta
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          setSelectedVocabOption(null);
                          setVocabFeedback(null);
                          setVocabularyLocked(false);
                          generateVocabularyExercise();
                        }}
                        className="w-full text-lg h-12 bg-gradient-to-r from-accent to-accent/80"
                      >
                        Nuevo ejercicio
                      </Button>
                    )}
                  </div>
                ) : null}
              </Card>
            </TabsContent>

            {/* Inferencias Tab */}
            <TabsContent value="inference" className="space-y-6">
              <Card className="bg-gradient-to-br from-success/20 to-primary/20 border-2 border-success/40 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-6 h-6 text-success" />
                  <h2 className="text-2xl font-black text-foreground">
                    🔍 Inferencias y Reflexión
                  </h2>
                </div>
                {inferenceLoading || !inferenceQuestion ? (
                  <div className="space-y-3">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white/80 rounded-xl p-6 border-2 border-success/30">
                      <div className="mb-4">
                        <Badge className="bg-success mb-2">
                          {inferenceQuestion.skill}
                        </Badge>
                        <p className="text-lg text-foreground leading-relaxed mb-4 italic">
                          "{inferenceQuestion.text}"
                        </p>
                      </div>
                      <p className="text-xl font-bold text-foreground mb-6">
                        {inferenceQuestion.question}
                      </p>
                      <div className="space-y-3 mb-4">
                        {inferenceQuestion.options.map((opt, idx) => (
                          <Button
                            key={idx}
                            variant={
                              selectedInferenceOption === idx
                                ? "default"
                                : "outline"
                            }
                            disabled={
                              inferenceLocked || inferenceFeedback !== null
                            }
                            onClick={() => setSelectedInferenceOption(idx)}
                            className="w-full text-left justify-start h-auto py-3 text-lg"
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                      {inferenceFeedback && (
                        <div
                          className={`mb-4 p-4 rounded-xl font-bold ${
                            inferenceFeedback.includes("Correcto")
                              ? "bg-success/20 text-success"
                              : "bg-destructive/20 text-destructive"
                          }`}
                        >
                          {inferenceFeedback}
                        </div>
                      )}
                      <Button
                        onClick={handleInferenceAnswer}
                        disabled={
                          selectedInferenceOption === null ||
                          inferenceFeedback !== null ||
                          inferenceLocked
                        }
                        className="w-full text-lg h-12 bg-gradient-to-r from-success to-success/80"
                      >
                        Verificar Respuesta
                      </Button>
                      {inferenceFeedback !== null && (
                        <Button
                          onClick={() => {
                            generateInferenceQuestion();
                            setSelectedInferenceOption(null);
                            setInferenceFeedback(null);
                            setInferenceLocked(false);
                          }}
                          variant="outline"
                          className="w-full text-lg h-12 mt-3"
                        >
                          Nueva pregunta
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Games;
