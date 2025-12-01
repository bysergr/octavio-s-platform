import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Lightbulb,
  Star,
  BookOpen,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import octavioThinking from "@/assets/octavio-thinking.png";
import octavioCelebrating from "@/assets/octavio-celebrating.png";
import { supabase } from "@/integrations/supabase/client";
import {
  generateStory,
  generateQuestions,
  evaluateAnswer,
  type GeneratedStory,
  type StoryQuestion,
  type AnswerEvaluation,
} from "@/integrations/ai/tutor";

type Phase =
  | "loading-age"
  | "loading-story"
  | "intro"
  | "reading"
  | "vocabulary"
  | "loading-questions"
  | "questions"
  | "feedback"
  | "complete"
  | "error";

interface QuestionResult {
  question: StoryQuestion;
  userAnswer: string;
  evaluation: AnswerEvaluation;
}

const PILLAR_COLORS = {
  interpretacion: "from-blue-500 to-blue-600",
  inferencia: "from-purple-500 to-purple-600",
  reflexion: "from-amber-500 to-amber-600",
  argumentacion: "from-emerald-500 to-emerald-600",
};

const PILLAR_BG = {
  interpretacion: "bg-blue-50 border-blue-200",
  inferencia: "bg-purple-50 border-purple-200",
  reflexion: "bg-amber-50 border-amber-200",
  argumentacion: "bg-emerald-50 border-emerald-200",
};

const Reading = () => {
  const [phase, setPhase] = useState<Phase>("loading-age");
  const [userAge, setUserAge] = useState<number | null>(null);
  const [story, setStory] = useState<GeneratedStory | null>(null);
  const [questions, setQuestions] = useState<StoryQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] =
    useState<AnswerEvaluation | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const currentQuestion = questions[currentQuestionIndex];
  const totalStars = results.reduce((sum, r) => sum + r.evaluation.stars, 0);
  const maxStars = results.length * 3;

  // Obtener la edad del usuario al cargar
  useEffect(() => {
    const loadUserAge = async () => {
      try {
        // Verificar autenticación
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          navigate("/auth");
          return;
        }

        // Intentar obtener la edad desde user_metadata primero
        let age: number | null = null;
        if (session.user.user_metadata?.age) {
          age = session.user.user_metadata.age;
        } else {
          // Si no está en user_metadata, buscar en la tabla profiles
          const { data: profile } = await supabase
            .from("profiles")
            .select("age")
            .eq("id", session.user.id)
            .single();

          if (profile?.age) {
            age = profile.age;
          }
        }

        if (!age || age < 4 || age > 80) {
          setError(
            "No se encontró tu edad en tu perfil. Por favor, actualiza tu información en la configuración."
          );
          setPhase("error");
          return;
        }

        setUserAge(age);
        // Automáticamente generar el cuento con la edad obtenida
        setPhase("loading-story");
        const generatedStory = await generateStory(age);
        setStory(generatedStory);
        setPhase("intro");
      } catch (err) {
        console.error("Error loading user age:", err);
        setError(
          "No se pudo obtener tu información. Por favor, intenta de nuevo."
        );
        setPhase("error");
      }
    };

    loadUserAge();
  }, [navigate]);

  const handleStartReading = () => setPhase("reading");

  const handleContinueToVocabulary = () => setPhase("vocabulary");

  const handleContinueToQuestions = async () => {
    setPhase("loading-questions");
    setError(null);

    try {
      if (!story) {
        throw new Error("No hay cuento disponible");
      }

      if (!story.content || !story.title) {
        throw new Error("El cuento no tiene contenido completo");
      }

      const response = await generateQuestions(story.content, story.title);

      if (!response?.questions) {
        throw new Error("La respuesta no contiene preguntas");
      }

      if (
        !Array.isArray(response.questions) ||
        response.questions.length === 0
      ) {
        throw new Error("No se generaron preguntas válidas");
      }

      // Validar que las preguntas tengan la estructura correcta
      const validQuestions = response.questions.filter(
        (q) =>
          q &&
          q.id &&
          q.pillar &&
          q.question &&
          q.type &&
          (q.type === "multiple_choice" ? q.options && q.correctAnswer : true)
      );

      if (validQuestions.length === 0) {
        throw new Error(
          "Las preguntas generadas no tienen el formato correcto"
        );
      }

      setQuestions(validQuestions);
      setCurrentQuestionIndex(0);
      setPhase("questions");
    } catch (err) {
      console.error("Error generating questions:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "¡Ups! No pudimos crear las preguntas. ¿Intentamos de nuevo?";
      setError(errorMessage);
      setPhase("vocabulary");
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;

    const userAnswer =
      currentQuestion.type === "multiple_choice"
        ? selectedOption || ""
        : answer;

    if (!userAnswer.trim()) return;

    setIsEvaluating(true);
    setError(null);

    try {
      const evaluation = await evaluateAnswer(
        currentQuestion.question,
        userAnswer,
        currentQuestion.pillar,
        currentQuestion.correctAnswer
      );

      setCurrentEvaluation(evaluation);
      setResults((prev) => [
        ...prev,
        {
          question: currentQuestion,
          userAnswer,
          evaluation,
        },
      ]);
      setPhase("feedback");
    } catch (err) {
      console.error("Error evaluating answer:", err);
      // Fallback evaluation
      const isCorrect =
        currentQuestion.type === "multiple_choice"
          ? userAnswer === currentQuestion.correctAnswer
          : userAnswer.length > 10;

      const fallbackEvaluation: AnswerEvaluation = {
        isCorrect,
        stars: isCorrect ? 3 : 1,
        feedback: isCorrect
          ? "¡Muy bien! Tu respuesta es excelente."
          : "Buen intento. Sigue practicando.",
        explanation: "",
        encouragement: "¡Sigue adelante! 💪",
      };

      setCurrentEvaluation(fallbackEvaluation);
      setResults((prev) => [
        ...prev,
        {
          question: currentQuestion,
          userAnswer,
          evaluation: fallbackEvaluation,
        },
      ]);
      setPhase("feedback");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setAnswer("");
      setSelectedOption(null);
      setShowHint(false);
      setHintIndex(0);
      setCurrentEvaluation(null);
      setPhase("questions");
    } else {
      setPhase("complete");
    }
  };

  const handleRestart = async () => {
    if (!userAge) {
      setError("No se pudo obtener tu edad. Recargando...");
      setPhase("loading-age");
      // Recargar la edad
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        let age: number | null = null;
        if (session.user.user_metadata?.age) {
          age = session.user.user_metadata.age;
        } else {
          const { data: profile } = await supabase
            .from("profiles")
            .select("age")
            .eq("id", session.user.id)
            .single();
          if (profile?.age) {
            age = profile.age;
          }
        }
        if (age) {
          setUserAge(age);
        }
      }
    }

    setPhase("loading-story");
    setStory(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswer("");
    setSelectedOption(null);
    setShowHint(false);
    setHintIndex(0);
    setCurrentEvaluation(null);
    setResults([]);
    setError(null);

    try {
      if (userAge) {
        const generatedStory = await generateStory(userAge);
        setStory(generatedStory);
        setPhase("intro");
      }
    } catch (err) {
      console.error("Error generating story:", err);
      setError("¡Ups! No pudimos crear el cuento. ¿Intentamos de nuevo?");
      setPhase("error");
    }
  };

  const renderStars = (count: number, max: number = 3) => {
    return (
      <div className="flex gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <Star
            key={`star-${i}-${count}`}
            className={`w-8 h-8 ${
              i < count
                ? "text-yellow-400 fill-yellow-400 animate-pulse"
                : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const renderContent = () => {
    switch (phase) {
      case "loading-age":
        return (
          <div className="space-y-8 text-center py-12">
            <div className="flex justify-center">
              <img
                src={octavioThinking}
                alt="Octavio pensando"
                className="w-48 h-48 animate-bounce-gentle drop-shadow-2xl"
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-black text-primary">
                Preparando tu cuento...
              </h2>
              <p className="text-xl text-foreground/70">
                Estoy buscando tu información para crear el cuento perfecto para
                ti
              </p>
              <div className="flex justify-center">
                <RefreshCw className="w-12 h-12 text-primary animate-spin" />
              </div>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="space-y-8">
            <div className="flex justify-center">
              <img
                src={octavioThinking}
                alt="Octavio"
                className="w-48 h-48 animate-float drop-shadow-2xl"
              />
            </div>

            <div className="bg-red-100 border-4 border-red-300 rounded-2xl p-8 space-y-4">
              <h2 className="text-2xl md:text-3xl font-black text-red-700 text-center">
                ¡Ups! Algo salió mal 😔
              </h2>
              <p className="text-lg text-red-600 text-center">
                {error ||
                  "No se pudo obtener tu información. Por favor, intenta de nuevo."}
              </p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleRestart}
                className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-primary to-primary/80"
              >
                <RefreshCw className="w-6 h-6 mr-2" />
                Intentar de nuevo
              </Button>
              <Button
                onClick={() => navigate("/menu")}
                variant="outline"
                className="w-full h-14 text-xl font-black rounded-2xl border-2"
              >
                Volver al Menú 🏠
              </Button>
            </div>
          </div>
        );

      case "loading-story":
        return (
          <div className="space-y-8 text-center py-12">
            <div className="flex justify-center">
              <img
                src={octavioThinking}
                alt="Octavio pensando"
                className="w-48 h-48 animate-bounce-gentle drop-shadow-2xl"
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-3xl font-black text-primary">
                Creando tu cuento mágico...
              </h2>
              <p className="text-xl text-foreground/70">
                ¡Estoy inventando una historia especial para ti!
              </p>
              <div className="flex justify-center">
                <RefreshCw className="w-12 h-12 text-primary animate-spin" />
              </div>
            </div>
          </div>
        );

      case "intro":
        return (
          <div className="space-y-8">
            <div className="flex justify-center">
              <img
                src={octavioCelebrating}
                alt="Octavio"
                className="w-48 h-48 animate-float drop-shadow-2xl"
              />
            </div>

            <div className="bg-gradient-to-br from-primary/10 to-secondary/10 border-4 border-primary/30 rounded-2xl p-8 space-y-4">
              <div className="flex items-center gap-3 justify-center">
                <BookOpen className="w-8 h-8 text-primary" />
                <p className="text-2xl md:text-3xl font-bold text-foreground">
                  ¡Tu cuento está listo! 📖
                </p>
              </div>
              <p className="text-xl text-foreground/80 text-center">
                Se llama{" "}
                <span className="font-black text-primary">
                  "{story?.title}"
                </span>
              </p>
              <div className="flex items-center justify-center gap-4 text-lg text-muted-foreground">
                <span>⏱️ {story?.readingTimeMinutes} minutos</span>
                <span>•</span>
                <span>🎭 {story?.theme}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleStartReading}
                className="flex-1 h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                <Sparkles className="w-6 h-6 mr-2" />
                ¡Empezar a leer! 🚀
              </Button>
            </div>

            <Button
              onClick={handleRestart}
              variant="outline"
              className="w-full border-2"
            >
              Quiero otro cuento
            </Button>
          </div>
        );

      case "reading":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-black text-center text-primary mb-6">
              {story?.title}
            </h2>

            <Card className="bg-gradient-to-br from-card/95 to-card/80 border-2 border-primary/20 rounded-2xl p-6 md:p-8 shadow-inner">
              <p className="text-lg md:text-xl leading-relaxed whitespace-pre-line text-foreground/90">
                {story?.content}
              </p>
            </Card>

            <Button
              onClick={handleContinueToVocabulary}
              className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-primary to-primary/80"
            >
              ¡Ya terminé de leer! →
            </Button>
          </div>
        );

      case "vocabulary": {
        if (!story) {
          return (
            <div className="space-y-6 text-center">
              <p className="text-xl text-foreground/80">
                No hay cuento disponible. Por favor, intenta de nuevo.
              </p>
              <Button
                onClick={handleRestart}
                className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-primary to-primary/80"
              >
                Volver a empezar
              </Button>
            </div>
          );
        }

        const vocabularyWord = story.vocabularyWord || "palabra especial";
        const vocabularyDefinition =
          story.vocabularyDefinition ||
          "Una palabra interesante del cuento que acabas de leer.";

        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <img
                src={octavioThinking}
                alt="Octavio"
                className="w-40 h-40 animate-bounce-gentle drop-shadow-xl"
              />
            </div>

            <div className="bg-gradient-to-br from-accent/20 to-secondary/10 border-4 border-accent/40 rounded-2xl p-8 space-y-4">
              <p className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Lightbulb className="w-8 h-8 text-accent" />
                ¡Aprendamos una palabra nueva!
              </p>
              <div className="bg-white/50 rounded-xl p-4 space-y-2">
                <p className="text-2xl font-black text-primary">
                  "{vocabularyWord}"
                </p>
                <p className="text-lg text-foreground/80">
                  {vocabularyDefinition}
                </p>
              </div>
              <p className="text-lg text-muted-foreground flex items-center gap-2">
                <span>🔍</span>
                <span>¿Puedes encontrar esta palabra en el cuento?</span>
              </p>
            </div>

            <Button
              onClick={handleContinueToQuestions}
              className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
            >
              ¡Ahora las preguntas! 🧠
            </Button>
          </div>
        );
      }

      case "loading-questions":
        return (
          <div className="space-y-8 text-center py-12">
            <div className="flex justify-center">
              <img
                src={octavioThinking}
                alt="Octavio pensando"
                className="w-40 h-40 animate-bounce-gentle drop-shadow-xl"
              />
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-black text-primary">
                Preparando preguntas...
              </h2>
              <p className="text-lg text-foreground/70">
                Voy a ponerte a prueba con algunas preguntas sobre el cuento
              </p>
              <div className="flex justify-center">
                <RefreshCw className="w-10 h-10 text-primary animate-spin" />
              </div>
            </div>

            {error && (
              <div className="bg-red-100 border-2 border-red-300 rounded-xl p-4 space-y-3">
                <p className="text-red-700 font-bold">Error: {error}</p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleContinueToQuestions}
                    variant="outline"
                    className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Intentar de nuevo
                  </Button>
                  <Button
                    onClick={() => {
                      setError(null);
                      setPhase("vocabulary");
                    }}
                    variant="outline"
                    className="flex-1 border-gray-300"
                  >
                    Volver
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case "questions": {
        if (!currentQuestion) return null;

        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

        return (
          <div className="space-y-6">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>
                  Pregunta {currentQuestionIndex + 1} de {questions.length}
                </span>
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  {totalStars} estrellas
                </span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>

            {/* Pillar badge */}
            <div
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${
                PILLAR_COLORS[currentQuestion.pillar]
              } text-white font-bold`}
            >
              <span className="text-xl">{currentQuestion.pillarEmoji}</span>
              <span>{currentQuestion.pillarName}</span>
            </div>

            {/* Question */}
            <Card
              className={`border-2 rounded-2xl p-6 ${
                PILLAR_BG[currentQuestion.pillar]
              }`}
            >
              <p className="text-xl md:text-2xl font-bold text-foreground">
                {currentQuestion.question}
              </p>
            </Card>

            {/* Answer options or textarea */}
            {currentQuestion.type === "multiple_choice" ? (
              <div className="space-y-3">
                {currentQuestion.options?.map((option, index) => (
                  <button
                    key={`option-${currentQuestion.id}-${option.slice(0, 10)}`}
                    onClick={() => setSelectedOption(option)}
                    className={`w-full p-4 text-left text-lg rounded-xl border-2 transition-all ${
                      selectedOption === option
                        ? "border-primary bg-primary/10 font-bold"
                        : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                    }`}
                  >
                    <span className="font-bold mr-2">
                      {String.fromCodePoint(65 + index)}.
                    </span>
                    {option}
                  </button>
                ))}
              </div>
            ) : (
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                className="min-h-32 text-lg border-2 rounded-xl"
              />
            )}

            {/* Hint section */}
            {!showHint && currentQuestion.hints.length > 0 && (
              <Button
                onClick={() => setShowHint(true)}
                variant="outline"
                className="w-full border-2 border-secondary/50 text-secondary hover:bg-secondary/10 rounded-xl font-bold"
              >
                <HelpCircle className="w-5 h-5 mr-2" />
                ¿Necesitas una pista?
              </Button>
            )}

            {showHint && (
              <div className="bg-secondary/10 border-2 border-secondary/30 rounded-xl p-4 space-y-2">
                <p className="text-secondary font-bold flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  Pista {hintIndex + 1}:
                </p>
                <p className="text-foreground/80">
                  {currentQuestion.hints[hintIndex]}
                </p>
                {hintIndex < currentQuestion.hints.length - 1 && (
                  <Button
                    onClick={() => setHintIndex((prev) => prev + 1)}
                    variant="ghost"
                    size="sm"
                    className="text-secondary"
                  >
                    Otra pista →
                  </Button>
                )}
              </div>
            )}

            {/* Submit button */}
            <Button
              onClick={handleSubmitAnswer}
              disabled={
                isEvaluating ||
                (currentQuestion.type === "multiple_choice"
                  ? !selectedOption
                  : !answer.trim())
              }
              className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-success to-success/80 disabled:opacity-50"
            >
              {isEvaluating ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Evaluando...
                </>
              ) : (
                "¡Enviar respuesta! ✨"
              )}
            </Button>
          </div>
        );
      }

      case "feedback":
        if (!currentEvaluation || !currentQuestion) return null;

        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <img
                src={
                  currentEvaluation.isCorrect
                    ? octavioCelebrating
                    : octavioThinking
                }
                alt="Octavio"
                className="w-40 h-40 animate-bounce-gentle drop-shadow-xl"
              />
            </div>

            {/* Result indicator */}
            <div
              className={`text-center p-6 rounded-2xl ${
                currentEvaluation.isCorrect
                  ? "bg-success/20 border-4 border-success/40"
                  : "bg-amber-100 border-4 border-amber-300"
              }`}
            >
              <div className="flex justify-center mb-4">
                {currentEvaluation.isCorrect ? (
                  <CheckCircle2 className="w-16 h-16 text-success" />
                ) : (
                  <XCircle className="w-16 h-16 text-amber-500" />
                )}
              </div>

              <p className="text-2xl md:text-3xl font-black mb-4">
                {currentEvaluation.isCorrect
                  ? "¡Excelente! 🎉"
                  : "¡Buen intento! 💪"}
              </p>

              {/* Stars earned */}
              <div className="flex justify-center mb-4">
                {renderStars(currentEvaluation.stars)}
              </div>

              <p className="text-lg text-foreground/80">
                {currentEvaluation.feedback}
              </p>
            </div>

            {/* Explanation */}
            {currentEvaluation.explanation && (
              <Card className="p-4 bg-blue-50 border-blue-200">
                <p className="text-foreground/80">
                  {currentEvaluation.explanation}
                </p>
              </Card>
            )}

            {/* Encouragement */}
            <div className="text-center text-xl font-bold text-primary">
              {currentEvaluation.encouragement}
            </div>

            <Button
              onClick={handleNextQuestion}
              className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-primary to-primary/80"
            >
              {currentQuestionIndex < questions.length - 1
                ? "Siguiente pregunta →"
                : "¡Ver mis resultados! 🏆"}
            </Button>
          </div>
        );

      case "complete": {
        const percentage = maxStars > 0 ? (totalStars / maxStars) * 100 : 0;
        let performanceMessage =
          "¡Buen esfuerzo! La práctica hace al maestro 💪";
        if (percentage >= 80) {
          performanceMessage = "¡Increíble! Eres un super lector 🦸‍♂️";
        } else if (percentage >= 60) {
          performanceMessage = "¡Muy bien! Sigue practicando 🌟";
        }

        return (
          <div className="space-y-8 text-center">
            <div className="flex justify-center">
              <img
                src={octavioCelebrating}
                alt="Octavio celebrando"
                className="w-56 h-56 animate-bounce-gentle drop-shadow-2xl"
              />
            </div>

            <div className="bg-gradient-to-br from-success/20 to-primary/10 border-4 border-success/40 rounded-2xl p-8 space-y-6">
              <p className="text-4xl md:text-5xl font-black text-success">
                ¡Terminaste! 🎉
              </p>

              <div className="space-y-2">
                <p className="text-xl text-foreground/80">Has ganado</p>
                <div className="flex justify-center items-center gap-2">
                  <span className="text-5xl font-black text-yellow-500">
                    {totalStars}
                  </span>
                  <Star className="w-12 h-12 text-yellow-400 fill-yellow-400" />
                </div>
                <p className="text-lg text-muted-foreground">
                  de {maxStars} estrellas posibles
                </p>
              </div>

              <p className="text-xl font-bold">{performanceMessage}</p>

              {/* Results by pillar */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                {results.map((result) => (
                  <div
                    key={`result-${result.question.id}`}
                    className={`p-3 rounded-xl border-2 ${
                      PILLAR_BG[result.question.pillar]
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{result.question.pillarEmoji}</span>
                      <span className="font-bold text-sm">
                        {result.question.pillarName}
                      </span>
                    </div>
                    <div className="flex justify-center">
                      {renderStars(result.evaluation.stars)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Button
                onClick={handleRestart}
                className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-primary to-primary/80"
              >
                <BookOpen className="w-6 h-6 mr-2" />
                Leer otro cuento 📚
              </Button>
              <Button
                onClick={() => navigate("/menu")}
                variant="outline"
                className="w-full h-14 text-xl font-black rounded-2xl border-2"
              >
                Volver al Menú 🏠
              </Button>
            </div>
          </div>
        );
      }
    }
  };

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => navigate("/menu")}
            variant="ghost"
            className="text-gray-700 hover:text-gray-600 text-lg hover:bg-transparent font-bold transition-all"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al Menú
          </Button>
        </div>

        {/* Main content */}
        <Card className="bg-card/95 backdrop-blur-sm shadow-2xl border-4 border-primary/30 rounded-3xl p-8 md:p-12">
          {renderContent()}
        </Card>
      </div>
    </div>
  );
};

export default Reading;
