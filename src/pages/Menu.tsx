import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Puzzle, Target, Star, LogOut } from "lucide-react";
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
    path: "/reading"
  },
  {
    id: "games",
    icon: Puzzle,
    title: "🧩 Desafío de Juegos",
    description: "Práctica de Habilidades Específicas",
    color: "from-secondary to-secondary/80",
    borderColor: "border-secondary/40",
    path: "/games"
  },
  {
    id: "daily",
    icon: Target,
    title: "🎯 Reto Súper Secreto de Hoy",
    description: "Tarea diaria gamificada",
    color: "from-accent to-accent/80",
    borderColor: "border-accent/40",
    path: "/daily-challenge"
  },
  {
    id: "progress",
    icon: Star,
    title: "⭐ Ver Mis Tesoros",
    description: "Tu progreso y logros",
    color: "from-success to-success/80",
    borderColor: "border-success/40",
    path: "/progress"
  }
];

const Menu = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("Super Lector");

  useEffect(() => {
    // Check authentication and get user profile
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        // Get user profile
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setUserName(data.full_name);
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
        variant: "destructive"
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
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Octavio and Logout */}
        <div className="mb-8">
          <div className="flex justify-end mb-4">
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
            <div className="flex justify-center mb-4">
              <img 
                src={octavioWaving} 
                alt="Octavio" 
                className="w-32 h-32 md:w-40 md:h-40 animate-float drop-shadow-2xl"
              />
            </div>
            
            <Card className="inline-block bg-primary/10 border-4 border-primary/30 rounded-2xl p-6 backdrop-blur-sm">
              <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">
                ¡Hola, {userName}! 🌟
              </h2>
              <p className="text-lg md:text-xl text-foreground/80">
                ¡Bravo! Tienes estas 4 misiones disponibles:
              </p>
            </Card>
          </div>
        </div>

        {/* AI Recommendation */}
        <Card className="bg-accent/15 border-4 border-accent/40 rounded-2xl p-6 mb-8 backdrop-blur-sm">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🤖</div>
            <div>
              <p className="font-bold text-lg text-foreground mb-1">
                Recomendación de Hoy:
              </p>
              <p className="text-foreground/80">
                ¡Te recomiendo empezar con <span className="font-bold text-primary">Leer un Cuento Mágico</span> para practicar tu comprensión!
              </p>
            </div>
          </div>
        </Card>

        {/* Missions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MISSIONS.map((mission) => {
            const Icon = mission.icon;
            return (
              <Card
                key={mission.id}
                className={`bg-card/95 backdrop-blur-sm border-4 ${mission.borderColor} rounded-3xl p-8 hover:shadow-2xl transition-all duration-300 cursor-pointer group transform hover:scale-105`}
                onClick={() => navigate(mission.path)}
              >
                <div className="space-y-4">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${mission.color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow`}>
                    <Icon className="w-10 h-10 text-white" strokeWidth={3} />
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black text-foreground mb-2 group-hover:text-primary transition-colors">
                      {mission.title}
                    </h3>
                    <p className="text-lg text-foreground/70">
                      {mission.description}
                    </p>
                  </div>

                  <Button
                    className={`w-full h-12 text-lg font-black rounded-xl bg-gradient-to-r ${mission.color} hover:brightness-110 shadow-md transition-all border-2 border-white/30`}
                  >
                    ¡Empezar! →
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