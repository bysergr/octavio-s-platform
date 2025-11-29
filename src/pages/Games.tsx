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

        <Card className="bg-card/95 backdrop-blur-sm border-4 border-secondary/30 rounded-3xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <Gamepad2 className="w-7 h-7 text-secondary" />
            <h1 className="text-3xl font-black text-foreground">Juegos</h1>
          </div>

          <div className="space-y-6">
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
