import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { ArrowLeft, Star, BookOpen, Trophy, Target, Flame } from "lucide-react";
import octavioCelebrating from "@/assets/octavio-celebrating.png";

const STATS = [
  { label: "Cuentos Leídos", value: 5, icon: BookOpen, color: "text-primary" },
  { label: "Estrellas Ganadas", value: 47, icon: Star, color: "text-accent" },
  { label: "Logros Desbloqueados", value: 8, icon: Trophy, color: "text-secondary" },
  { label: "Racha de Días", value: 3, icon: Flame, color: "text-success" },
];

const ACHIEVEMENTS = [
  { title: "Primera Lectura", description: "Completaste tu primer cuento", earned: true, icon: "📖" },
  { title: "Vocabulario Maestro", description: "Aprendiste 20 palabras nuevas", earned: true, icon: "📚" },
  { title: "Detective", description: "Completaste 10 actividades de inferencia", earned: true, icon: "🔍" },
  { title: "Racha de Fuego", description: "Lee 7 días seguidos", earned: false, icon: "🔥" },
  { title: "Super Lector", description: "Lee 50 cuentos", earned: false, icon: "⭐" },
  { title: "Pensador Crítico", description: "Completa 20 reflexiones", earned: false, icon: "🧠" },
];

const Progress = () => {
  const navigate = useNavigate();
  const username = sessionStorage.getItem("username") || "Super Lector";

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
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

        {/* Title and Octavio */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src={octavioCelebrating} 
              alt="Octavio celebrando" 
              className="w-40 h-40 md:w-48 md:h-48 animate-bounce-gentle drop-shadow-2xl"
            />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-primary mb-4">
            ¡Mis Tesoros! ⭐
          </h1>
          <p className="text-xl md:text-2xl text-foreground/80">
            Mira todo lo que has logrado, <span className="font-bold text-secondary">{username}</span>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.label}
                className="bg-card/95 backdrop-blur-sm border-4 border-primary/30 rounded-2xl p-6 text-center hover:shadow-xl transition-shadow"
              >
                <Icon className={`w-12 h-12 mx-auto mb-3 ${stat.color}`} strokeWidth={2.5} />
                <p className="text-4xl font-black text-foreground mb-2">{stat.value}</p>
                <p className="text-sm md:text-base font-bold text-muted-foreground">{stat.label}</p>
              </Card>
            );
          })}
        </div>

        {/* Level Progress */}
        <Card className="bg-card/95 backdrop-blur-sm border-4 border-primary/30 rounded-3xl p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Target className="w-10 h-10 text-primary" strokeWidth={2.5} />
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <h3 className="text-2xl font-black text-foreground">Nivel 3</h3>
                <span className="text-lg font-bold text-primary">47 / 100 XP</span>
              </div>
              <ProgressBar value={47} className="h-4 bg-primary/20" />
            </div>
          </div>
          <p className="text-lg text-muted-foreground">
            ¡Sigue así! Solo necesitas <span className="font-bold text-primary">53 estrellas</span> más para subir al Nivel 4
          </p>
        </Card>

        {/* Achievements */}
        <Card className="bg-card/95 backdrop-blur-sm border-4 border-secondary/30 rounded-3xl p-8">
          <h2 className="text-3xl font-black text-foreground mb-6 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-secondary" strokeWidth={2.5} />
            Logros
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ACHIEVEMENTS.map((achievement, index) => (
              <Card
                key={index}
                className={`p-6 rounded-2xl border-3 transition-all ${
                  achievement.earned
                    ? "bg-success/20 border-success/40 shadow-lg"
                    : "bg-muted/50 border-muted opacity-60"
                }`}
              >
                <div className="text-center space-y-3">
                  <div className="text-5xl mb-2">{achievement.icon}</div>
                  <h4 className="text-lg font-black text-foreground">{achievement.title}</h4>
                  <p className="text-sm text-foreground/70">{achievement.description}</p>
                  {achievement.earned && (
                    <div className="inline-block bg-success text-success-foreground px-4 py-1 rounded-full text-sm font-bold">
                      ¡Desbloqueado! ✓
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* Motivational message */}
        <div className="mt-8 text-center">
          <Card className="inline-block bg-accent/15 border-4 border-accent/40 rounded-2xl p-6 backdrop-blur-sm">
            <p className="text-xl md:text-2xl font-bold text-foreground">
              🎉 ¡Vas increíble! Sigue practicando cada día para desbloquear más tesoros
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Progress;
