import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Gamepad2, Lightbulb } from "lucide-react";
import { askTutor } from "@/integrations/ai/tutor";
import { supabase } from "@/integrations/supabase/client";

type Riddle = {
  question: string;
  answer: string;
};

const Games = () => {
  const navigate = useNavigate();
  const [riddle, setRiddle] = useState<Riddle | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [rewarded, setRewarded] = useState(false);

  // AI section (hint + daily challenge)
  const [aiLoading, setAiLoading] = useState(false);
  const [storyInput, setStoryInput] = useState("");
  const [hintText, setHintText] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<{
    type: "multiple_choice";
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  } | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [challengeFeedback, setChallengeFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);

  const loadRiddle = async () => {
    setLoading(true);
    setShowAnswer(false);
    setRewarded(false);
    try {
      const data = await askTutor<{ riddle: Riddle }>("riddle", {});
      setRiddle(data.riddle);
    } catch {
      setRiddle({
        question: "Vuelo sin alas, lloro sin ojos. ¿Qué soy?",
        answer: "La nube",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRiddle();
  }, []);

  const reward = async () => {
    if (rewarded) return;
    setRewarded(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ total_points: 3 as unknown as never })
        .eq("id", user.id);
    }
  };

  const askHint = async () => {
    setAiLoading(true);
    setHintText(null);
    setChallenge(null);
    setSelectedOption(null);
    setChallengeFeedback(null);
    try {
      const res = await askTutor<{ text: string }>("hint", {
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

  const generateDailyChallenge = async () => {
    setAiLoading(true);
    setHintText(null);
    setChallenge(null);
    setSelectedOption(null);
    setChallengeFeedback(null);
    try {
      const res = await askTutor<{
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

  const submitChallengeAnswer = () => {
    if (!challenge || selectedOption === null) return;
    const correct = selectedOption === challenge.correctIndex;
    setChallengeFeedback({
      correct,
      message: correct
        ? `¡Correcto! ${challenge.explanation}`
        : `Casi, revisa las pistas del texto. ${challenge.explanation}`,
    });
  };

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-3xl mx-auto">
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

        <Card className="bg-card/95 backdrop-blur-sm border-4 border-secondary/30 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Gamepad2 className="w-7 h-7 text-secondary" />
            <h1 className="text-3xl font-black text-foreground">Juegos</h1>
          </div>

          <div className="space-y-6">
            {/* Apartado de IA */}
            <div className="bg-secondary/10 border-2 border-secondary/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-secondary" />
                <h2 className="text-xl font-black text-secondary">
                  Juega con la IA
                </h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Pide una pista sobre tu lectura o genera un reto de opción
                múltiple.
              </p>

              <div className="space-y-3">
                <textarea
                  value={storyInput}
                  onChange={(e) => setStoryInput(e.target.value)}
                  placeholder="Escribe aquí un texto corto o contexto (opcional)"
                  className="w-full rounded-xl border border-secondary/30 bg-background p-3 outline-none"
                  rows={3}
                />
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={askHint}
                    disabled={aiLoading}
                    className="flex-1"
                  >
                    Pista rápida
                  </Button>
                  <Button
                    onClick={generateDailyChallenge}
                    variant="outline"
                    disabled={aiLoading}
                    className="flex-1"
                  >
                    Generar reto del día
                  </Button>
                </div>
              </div>

              {/* Hint result */}
              {aiLoading && !challenge && !hintText && (
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              )}
              {hintText && (
                <div className="mt-4">
                  <p className="text-foreground">
                    <span className="font-bold">Pista: </span>
                    {hintText}
                  </p>
                </div>
              )}

              {/* Challenge UI */}
              {challenge && (
                <div className="mt-5">
                  <p className="font-bold text-foreground mb-3">
                    {challenge.question}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {challenge.options.map((opt, idx) => (
                      <Button
                        key={idx}
                        variant={selectedOption === idx ? "default" : "outline"}
                        onClick={() => setSelectedOption(idx)}
                        className="w-full"
                      >
                        {opt}
                      </Button>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-3">
                    <Button
                      onClick={submitChallengeAnswer}
                      disabled={selectedOption === null}
                    >
                      Comprobar respuesta
                    </Button>
                    <Button variant="outline" onClick={generateDailyChallenge}>
                      Nuevo reto
                    </Button>
                  </div>
                  {challengeFeedback && (
                    <p
                      className={`mt-3 font-bold ${
                        challengeFeedback.correct
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {challengeFeedback.message}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-secondary/10 border-2 border-secondary/30 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-secondary" />
                <h2 className="text-xl font-black text-secondary">
                  Adivinanza
                </h2>
              </div>
              {loading || !riddle ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ) : (
                <>
                  <p className="text-lg font-bold text-foreground">
                    {riddle.question}
                  </p>
                  {showAnswer ? (
                    <div className="mt-2">
                      <p className="text-success font-black text-xl">
                        Respuesta: {riddle.answer}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 flex gap-3">
                      <Button
                        onClick={() => setShowAnswer(true)}
                        className="flex-1"
                      >
                        Mostrar respuesta
                      </Button>
                      <Button
                        variant="outline"
                        onClick={loadRiddle}
                        className="flex-1"
                      >
                        Nueva adivinanza
                      </Button>
                    </div>
                  )}
                  {showAnswer && (
                    <div className="mt-4 flex gap-3">
                      <Button
                        onClick={loadRiddle}
                        variant="outline"
                        className="flex-1"
                      >
                        Otra más
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={reward}
                        disabled={rewarded}
                      >
                        {rewarded ? "+3 ⭐ ¡Otorgadas!" : "¡Lo adiviné! +3 ⭐"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Games;
