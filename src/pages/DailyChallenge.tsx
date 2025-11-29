import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { askTutor } from "@/integrations/ai/tutor";
import { supabase } from "@/integrations/supabase/client";

type Challenge = {
  type: "multiple_choice";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

const DailyChallenge = () => {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "incorrect" | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await askTutor<{ challenge: Challenge }>(
          "daily-challenge",
          {}
        );
        setChallenge(data.challenge);
      } catch {
        // Fallback simple challenge
        setChallenge({
          type: "multiple_choice",
          question: "¿Qué entiende el lector al final de un cuento?",
          options: [
            "La idea principal",
            "El autor del libro",
            "El número de páginas",
          ],
          correctIndex: 0,
          explanation: "La idea principal resume de qué trata el texto.",
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async () => {
    if (selected === null || !challenge) return;
    setSubmitting(true);
    try {
      const correct = selected === challenge.correctIndex;
      setResult(correct ? "correct" : "incorrect");

      // Ask for short feedback from the tutor
      const fb = await askTutor<{ text: string }>("feedback", {
        question: challenge.question,
        userAnswer: challenge.options[selected],
      });
      setFeedback(fb.text);

      // Reward progress on correct
      if (correct) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          // increment daily_challenges_completed
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
          // increment total_points
          const { data: prof } = await supabase
            .from("profiles")
            .select("total_points")
            .eq("id", user.id)
            .single();
          const newPoints = (prof?.total_points ?? 0) + 5;
          await supabase
            .from("profiles")
            .update({ total_points: newPoints })
            .eq("id", user.id);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button
            onClick={() => navigate("/menu")}
            variant="ghost"
            className="text-primary hover:bg-primary/10 font-bold"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al Menú
          </Button>
        </div>

        <Card className="bg-card/95 backdrop-blur-sm border-4 border-accent/30 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-7 h-7 text-accent" />
            <h1 className="text-3xl font-black text-foreground">
              Reto del Día
            </h1>
          </div>

          {loading || !challenge ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-xl font-bold text-foreground">
                {challenge.question}
              </p>

              <div className="grid gap-3">
                {challenge.options.map((opt, idx) => {
                  const isSelected = selected === idx;
                  const isCorrect = result && idx === challenge.correctIndex;
                  const isWrong = result && isSelected && !isCorrect;
                  return (
                    <button
                      key={idx}
                      disabled={!!result}
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

              {!result ? (
                <Button
                  disabled={selected === null || submitting}
                  onClick={handleSubmit}
                  className="w-full h-12 text-lg font-black"
                >
                  Comprobar
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {result === "correct" ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-success" />
                        <span className="text-lg font-bold text-success">
                          ¡Correcto! +5 ⭐
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-6 h-6 text-destructive" />
                        <span className="text-lg font-bold text-destructive">
                          Casi, ¡tú puedes!
                        </span>
                      </>
                    )}
                  </div>
                  {feedback && (
                    <div className="bg-secondary/10 border-2 border-secondary/30 rounded-xl p-4">
                      <p className="text-secondary font-bold">{feedback}</p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => navigate("/menu")}
                      variant="outline"
                      className="flex-1"
                    >
                      Volver al Menú
                    </Button>
                    <Button
                      onClick={() => {
                        setLoading(true);
                        setSelected(null);
                        setResult(null);
                        setFeedback("");
                        (async () => {
                          try {
                            const data = await askTutor<{
                              challenge: Challenge;
                            }>("daily-challenge", {});
                            setChallenge(data.challenge);
                          } finally {
                            setLoading(false);
                          }
                        })();
                      }}
                      className="flex-1"
                    >
                      Nuevo reto
                    </Button>
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
