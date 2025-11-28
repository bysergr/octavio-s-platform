import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Puzzle, Target, Star } from "lucide-react";
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
  const username = sessionStorage.getItem("username") || "Super Lector";

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with Octavio */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={octavioWaving} 
              alt="Octavio" 
              className="w-32 h-32 md:w-40 md:h-40 animate-float drop-shadow-2xl"
            />
          </div>
          
          <Card className="inline-block bg-primary/10 border-4 border-primary/30 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">
              ¡Hola, {username}! 🌟
            </h2>
            <p className="text-lg md:text-xl text-foreground/80">
              ¡Bravo! Tienes estas 4 misiones disponibles:
            </p>
          </Card>
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

        {/* Back button */}
        <div className="mt-8 text-center">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="border-2 border-primary/50 text-primary hover:bg-primary/10 rounded-xl font-bold px-8"
          >
            ← Volver al inicio
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Menu;
