import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Puzzle,
  Target,
  Star,
  LogOut,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import octavioWaving from "@/assets/octavio-waving.png";

const MISSIONS = [
  {
    id: "reading",
    icon: BookOpen,
    title: "📘 Leer un Cuento Mágico",
    description: "Comprensión y Lectura Guiada",
    color: "from-primary to-primary/80",
    borderColor: "border-primary/40",
    path: "/reading",
  },
  {
    id: "games",
    icon: Puzzle,
    title: "🧩 Desafío de Juegos",
    description: "Práctica de Habilidades Específicas",
    color: "from-secondary to-secondary/80",
    borderColor: "border-secondary/40",
    path: "/games",
  },
  {
    id: "daily",
    icon: Target,
    title: "🎯 Reto Súper Secreto de Hoy",
    description: "Tarea diaria",
    color: "from-accent to-accent/80",
    borderColor: "border-accent/40",
    path: "/daily-challenge",
  },
  {
    id: "progress",
    icon: Star,
    title: "⭐ Ver Mis Tesoros",
    description: "Tu progreso y logros",
    color: "from-success to-success/80",
    borderColor: "border-success/40",
    path: "/progress",
  },
];

const Menu = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Super Lector");
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    // Check authentication and get user profile
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        // Get user profile
        supabase
          .from("profiles")
          .select("full_name,total_points")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUserName(data.full_name);
              setTotalPoints(data.total_points ?? 0);
            }
            setLoading(false);
          });
      }
    });
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error al cerrar sesión",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-tropical opacity-90" />
        <p className="text-2xl font-fredoka text-white z-10">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 py-8 relative overflow-hidden">
      {/* Decorative background blobs for a playful-professional feel */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 w-80 h-80 rounded-full bg-accent/20 blur-3xl" />

      <div className="max-w-6xl mx-auto relative">
        {/* Header with Octavio and Logout */}
        <div className="mb-10">
          <div className="flex items-center justify-end mb-4 gap-3">
            <div className="hidden md:flex items-center gap-2 bg-white/80 border-2 border-primary/30 rounded-2xl px-4 py-2 shadow-sm">
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              <div className="text-xs text-muted-foreground">Puntos</div>
              <div className="text-lg font-extrabold text-foreground">
                {totalPoints}
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="bg-white/90 hover:bg-white border-2 border-primary/40 rounded-xl"
            >
              <LogOut className="h-4 w-4 mr-2 text-primary" />
              <span className="font-fredoka text-primary">Salir</span>
            </Button>
          </div>

          <div className="text-center">
            <div className="flex justify-center mb-5">
              <img
                src={octavioWaving}
                alt="Octavio"
                className="w-32 h-32 md:w-40 md:h-40 animate-float drop-shadow-2xl"
              />
            </div>

            <Card className="inline-block bg-white/80 border-2 border-primary/30 rounded-2xl px-6 py-5 backdrop-blur-md shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-primary" />
                <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
                  ¡Hola, {userName}!
                </h1>
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <p className="text-base md:text-lg text-muted-foreground">
                Tienes 4 misiones divertidas para mejorar tu lectura ✨
              </p>
            </Card>

            <div className="mt-4 md:hidden flex justify-center">
              <div className="flex items-center gap-2 bg-white/80 border-2 border-primary/30 rounded-2xl px-4 py-2 shadow-sm">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                <div className="text-xs text-muted-foreground">Puntos</div>
                <div className="text-lg font-extrabold text-foreground">
                  {totalPoints}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Recommendation */}
        <Card className="bg-white/80 border-2 border-accent/30 rounded-2xl p-5 mb-8 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-accent text-white">
                  Sugerencia de Octavio
                </Badge>
                <span className="text-xs text-muted-foreground">para hoy</span>
              </div>
              <p className="text-foreground/80 text-base md:text-lg">
                Empieza con{" "}
                <span className="font-bold text-foreground">
                  Leer un Cuento Mágico
                </span>{" "}
                para calentar motores y practicar tu comprensión.
              </p>
            </div>
          </div>
        </Card>

        {/* Missions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MISSIONS.map((mission) => {
            const Icon = mission.icon;
            const isRecommended =
              mission.id === "reading" || mission.id === "daily";
            return (
              <Card
                key={mission.id}
                className={`bg-white/80 backdrop-blur-sm border-2 ${mission.borderColor} rounded-3xl p-7 hover:shadow-xl transition-all duration-300 cursor-pointer group hover:-translate-y-0.5`}
                onClick={() => navigate(mission.path)}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${mission.color} flex items-center justify-center shadow-lg ring-2 ring-white/50`}
                    >
                      <Icon className="w-9 h-9 text-white" strokeWidth={3} />
                    </div>
                    {isRecommended ? (
                      <Badge className="bg-primary text-white">
                        Recomendado
                      </Badge>
                    ) : null}
                  </div>
                  <div className="pt-2">
                    <h3 className="text-xl md:text-2xl font-extrabold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {mission.title}
                    </h3>
                    <p className="text-base md:text-lg text-muted-foreground">
                      {mission.description}
                    </p>
                  </div>

                  <Button
                    className={`w-full h-12 text-base md:text-lg rounded-xl bg-gradient-to-r ${mission.color} hover:brightness-110 shadow-md transition-all border-2 border-white/30 flex items-center justify-center gap-2`}
                  >
                    ¡Empezar!
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Menu;
