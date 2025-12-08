import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Sparkles, Star } from "lucide-react";
import {
  askTutor,
  DailyChallenge as DailyChallengeType,
  ChallengeFeedback,
} from "@/integrations/ai/tutor";
import { supabase } from "@/integrations/supabase/client";

const MAX_CHALLENGES = 4;

const DailyChallenge = () => {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<DailyChallengeType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [openAnswer, setOpenAnswer] = useState<string>("");
  const [result, setResult] = useState<ChallengeFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [completedToday, setCompletedToday] = useState<string[]>([]);
  const [challengesToday, setChallengesToday] = useState(0);
  const [maxChallengesReached, setMaxChallengesReached] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Obtener challenges completados hoy
        const today = new Date().toISOString().split("T")[0];
        const { data: completed } = await supabase
          .from("daily_challenges")
          .select("pillar")
          .eq("user_id", user.id)
          .eq("challenge_date", today);

        const completedPillars = completed?.map((c) => c.pillar) || [];
        setCompletedToday(completedPillars);
        setChallengesToday(completedPillars.length);

        if (completedPillars.length >= MAX_CHALLENGES) {
          setMaxChallengesReached(true);
          setLoading(false);
          return;
        }

        // Obtener un nuevo challenge
        const data = await askTutor<{ challenge: DailyChallengeType }>(
          "daily-challenge",
          {
            completedPillars: completedPillars,
          }
        );
        setChallenge(data.challenge);
      } catch (error) {
        console.error("Error loading challenge:", error);
        // Fallback simple challenge
        setChallenge({
          type: "multiple_choice",
          pillar: "interpretacion",
          pillarName: "Interpretación",
          pillarEmoji: "📖",
          question: "¿Qué entiende el lector al final de un cuento?",
          options: [
            "La idea principal",
            "El autor del libro",
            "El número de páginas",
            "El color de la portada",
          ],
          correctIndex: 0,
          explanation: "La idea principal resume de qué trata el texto.",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const handleSubmit = async () => {
    if (!challenge) return;
    if (challenge.type === "multiple_choice" && selected === null) return;
    if (challenge.type === "open_ended" && !openAnswer.trim()) return;

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const userAnswer =
        challenge.type === "multiple_choice"
          ? selected !== null
            ? challenge.options?.[selected] || ""
            : ""
          : openAnswer;

      // Obtener feedback de la IA
      const feedback = await askTutor<ChallengeFeedback>("feedback", {
        question: challenge.question,
        userAnswer: userAnswer,
        correctAnswer:
          challenge.type === "multiple_choice" &&
          challenge.correctIndex !== undefined
            ? challenge.options?.[challenge.correctIndex]
            : undefined,
        challengeType: challenge.pillar,
      });

      setResult(feedback);

      // Guardar en la base de datos
      const today = new Date().toISOString().split("T")[0];
      const { error: challengeError } = await supabase
        .from("daily_challenges")
        .insert({
          user_id: user.id,
          pillar: challenge.pillar,
          challenge_type: challenge.type,
          question: challenge.question,
          user_answer: userAnswer,
          stars: feedback.stars,
          feedback: feedback.feedback,
          challenge_date: today,
        });

      if (challengeError) {
        console.error("Error saving challenge:", challengeError);
        // Si ya existe (UNIQUE constraint), actualizar
        if (challengeError.code === "23505") {
          await supabase
            .from("daily_challenges")
            .update({
              user_answer: userAnswer,
              stars: feedback.stars,
              feedback: feedback.feedback,
            })
            .eq("user_id", user.id)
            .eq("challenge_date", today)
            .eq("pillar", challenge.pillar);
        }
      }

      // Actualizar progreso del usuario
      const { data: up } = await supabase
        .from("user_progress")
        .select("daily_challenges_completed")
        .eq("user_id", user.id)
        .single();
      const newDaily = (up?.daily_challenges_completed ?? 0) + 1;
      await supabase
        .from("user_progress")
        .update({ daily_challenges_completed: newDaily })
        .eq("user_id", user.id);

      // Actualizar puntos (estrellas obtenidas)
      const { data: prof } = await supabase
        .from("profiles")
        .select("total_points")
        .eq("id", user.id)
        .single();
      const newPoints = (prof?.total_points ?? 0) + feedback.stars;
      await supabase
        .from("profiles")
        .update({ total_points: newPoints })
        .eq("id", user.id);

      // Actualizar contador de challenges hoy
      setChallengesToday((prev) => prev + 1);
      setCompletedToday((prev) => [...prev, challenge.pillar]);
      if (challengesToday + 1 >= MAX_CHALLENGES) {
        setMaxChallengesReached(true);
      }
    } catch (error) {
      console.error("Error submitting challenge:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const loadNewChallenge = async () => {
    setLoading(true);
    setSelected(null);
    setOpenAnswer("");
    setResult(null);
    try {
      const data = await askTutor<{ challenge: DailyChallengeType }>(
        "daily-challenge",
        {
          completedPillars: completedToday,
        }
      );
      setChallenge(data.challenge);
    } catch (error) {
      console.error("Error loading new challenge:", error);
    } finally {
      setLoading(false);
    }
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

        <Card className="bg-card/95 backdrop-blur-sm border-4 border-accent/30 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-accent" />
              <h1 className="text-3xl font-black text-foreground">
                Reto del Día
              </h1>
            </div>
            <div className="text-sm text-muted-foreground font-bold">
              {challengesToday}/{MAX_CHALLENGES} completados hoy
            </div>
          </div>

          {maxChallengesReached ? (
            <div className="space-y-6 text-center py-8">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-black text-foreground">
                ¡Has completado todos los retos de hoy!
              </h2>
              <p className="text-muted-foreground">
                Vuelve mañana para más desafíos. ¡Sigue así!
              </p>
              <Button
                onClick={() => navigate("/menu")}
                className="w-full h-12 text-lg font-black"
              >
                Volver al Menú
              </Button>
            </div>
          ) : loading || !challenge ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Header del challenge con pilar */}
              <div className="bg-secondary/10 border-2 border-secondary/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{challenge.pillarEmoji}</span>
                  <span className="text-lg font-black text-secondary">
                    {challenge.pillarName}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {challenge.pillar === "interpretacion" &&
                    "¿Qué dice el texto?"}
                  {challenge.pillar === "inferencia" && "¿Qué quiere decir?"}
                  {challenge.pillar === "reflexion" && "¿Qué pienso yo?"}
                  {challenge.pillar === "argumentacion" &&
                    "¿Cómo lo justifico?"}
                </p>
              </div>

              {challenge.context && (
                <div className="bg-muted/30 rounded-xl p-4 border-2 border-muted">
                  <p className="text-sm text-foreground">{challenge.context}</p>
                </div>
              )}

              <p className="text-xl font-bold text-foreground">
                {challenge.question}
              </p>

              {challenge.type === "multiple_choice" ? (
                <div className="grid gap-3">
                  {challenge.options?.map((opt, idx) => {
                    const isSelected = selected === idx;
                    const isCorrect =
                      result !== null &&
                      challenge.correctIndex !== undefined &&
                      idx === challenge.correctIndex;
                    const isWrong = result !== null && isSelected && !isCorrect;
                    return (
                      <button
                        key={`option-${idx}-${opt.substring(0, 10)}`}
                        disabled={result !== null}
                        onClick={() => setSelected(idx)}
                        className={[
                          "w-full text-left px-4 py-3 rounded-xl border-2 font-bold transition",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-muted-foreground/30 hover:bg-muted/30",
                          isCorrect ? "border-success bg-success/20" : "",
                          isWrong ? "border-destructive bg-destructive/10" : "",
                        ].join(" ")}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Textarea
                  value={openAnswer}
                  onChange={(e) => setOpenAnswer(e.target.value)}
                  disabled={!!result}
                  placeholder="Escribe tu respuesta aquí..."
                  className="min-h-32 text-lg"
                />
              )}

              {!result ? (
                <Button
                  disabled={
                    (challenge.type === "multiple_choice" &&
                      selected === null) ||
                    (challenge.type === "open_ended" && !openAnswer.trim()) ||
                    submitting
                  }
                  onClick={handleSubmit}
                  className="w-full h-12 text-lg font-black"
                >
                  {submitting ? "Enviando..." : "Comprobar"}
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: result.stars }).map((_, i) => (
                        <Star
                          key={`star-filled-${i}`}
                          className="w-6 h-6 text-yellow-500 fill-yellow-500"
                        />
                      ))}
                      {Array.from({ length: 5 - result.stars }).map((_, i) => (
                        <Star
                          key={`star-empty-${i}`}
                          className="w-6 h-6 text-gray-300"
                        />
                      ))}
                    </div>
                    <span className="text-lg font-bold text-foreground">
                      {result.stars}{" "}
                      {result.stars === 1 ? "estrella" : "estrellas"}
                    </span>
                  </div>
                  <div className="bg-secondary/10 border-2 border-secondary/30 rounded-xl p-4 space-y-3">
                    <p className="text-secondary font-bold">
                      {result.feedback}
                    </p>
                    {result.explanation && (
                      <p className="text-sm text-muted-foreground">
                        {result.explanation}
                      </p>
                    )}
                    {result.encouragement && (
                      <p className="text-sm font-bold text-primary">
                        {result.encouragement}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => navigate("/menu")}
                      variant="outline"
                      className="flex-1"
                    >
                      Volver al Menú
                    </Button>
                    {maxChallengesReached ? null : (
                      <Button onClick={loadNewChallenge} className="flex-1">
                        Nuevo reto
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DailyChallenge;
