import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { ArrowLeft, Star, BookOpen, Trophy, Target, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import octavioCelebrating from "@/assets/octavio-celebrating.png";

const MASTER_ACHIEVEMENTS = [
  {
    title: "Primera Lectura",
    description: "Completaste tu primer cuento",
    icon: "📖",
  },
  {
    title: "Vocabulario Maestro",
    description: "Aprendiste 20 palabras nuevas",
    icon: "📚",
  },
  {
    title: "Detective",
    description: "Completaste 10 actividades de inferencia",
    icon: "🔍",
  },
  { title: "Racha de Fuego", description: "Lee 7 días seguidos", icon: "🔥" },
  { title: "Super Lector", description: "Lee 50 cuentos", icon: "⭐" },
  {
    title: "Pensador Crítico",
    description: "Completa 20 reflexiones",
    icon: "🧠",
  },
];

const Progress = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [userProgress, setUserProgress] =
    useState<Tables<"user_progress"> | null>(null);
  const [userAchievements, setUserAchievements] = useState<
    Tables<"achievements">[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState("Super Lector");

  useEffect(() => {
    const loadUserData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      const [profileRes, progressRes, achievementsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("user_progress")
          .select("*")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("achievements")
          .select("*")
          .eq("user_id", user.id)
          .order("earned_at", { ascending: false }),
      ]);

      if (profileRes.data) {
        setProfile(profileRes.data);
        setDisplayName(profileRes.data.full_name || "Super Lector");
      }
      if (progressRes.data) {
        setUserProgress(progressRes.data);
      }
      if (achievementsRes.data) {
        setUserAchievements(achievementsRes.data);
      }

      setIsLoading(false);
    };

    loadUserData();
  }, [navigate]);

  const totalPoints = profile?.total_points ?? 0;
  const level = profile?.level ?? 1;
  const xpInLevel = totalPoints % 100;
  const nextLevelXp = 100;
  const remainingXp = Math.max(0, nextLevelXp - xpInLevel);

  const stats = [
    {
      label: "Cuentos Leídos",
      value: userProgress?.stories_completed ?? 0,
      icon: BookOpen,
      color: "text-primary",
    },
    {
      label: "Estrellas Ganadas",
      value: totalPoints,
      icon: Star,
      color: "text-accent",
    },
    {
      label: "Logros Desbloqueados",
      value: userAchievements.length,
      icon: Trophy,
      color: "text-secondary",
    },
    {
      label: "Racha de Días",
      value: userProgress?.current_streak_days ?? 0,
      icon: Flame,
      color: "text-success",
    },
  ];

  const earnedAchievementNames = new Set(
    userAchievements.map((a) => a.achievement_name)
  );
  const achievementsToDisplay = MASTER_ACHIEVEMENTS.map((a) => ({
    ...a,
    earned: earnedAchievementNames.has(a.title),
  }));

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
            Mira todo lo que has logrado,{" "}
            <span className="font-bold text-secondary">{displayName}</span>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card
                  key={`stat-skel-${i}`}
                  className="bg-card/95 backdrop-blur-sm border-4 border-primary/30 rounded-2xl p-6 text-center"
                >
                  <Skeleton className="w-12 h-12 mx-auto mb-3 rounded-full" />
                  <Skeleton className="w-16 h-8 mx-auto mb-2" />
                  <Skeleton className="w-24 h-4 mx-auto" />
                </Card>
              ))
            : stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={stat.label}
                    className="bg-card/95 backdrop-blur-sm border-4 border-primary/30 rounded-2xl p-6 text-center hover:shadow-xl transition-shadow"
                  >
                    <Icon
                      className={`w-12 h-12 mx-auto mb-3 ${stat.color}`}
                      strokeWidth={2.5}
                    />
                    <p className="text-4xl font-black text-foreground mb-2">
                      {stat.value}
                    </p>
                    <p className="text-sm md:text-base font-bold text-muted-foreground">
                      {stat.label}
                    </p>
                  </Card>
                );
              })}
        </div>

        {/* Level Progress */}
        <Card className="bg-card/95 backdrop-blur-sm border-4 border-primary/30 rounded-3xl p-8 mb-8">
          {isLoading ? (
            <>
              <div className="flex items-center gap-4 mb-6">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <Skeleton className="w-24 h-6" />
                    <Skeleton className="w-24 h-6" />
                  </div>
                  <Skeleton className="w-full h-4" />
                </div>
              </div>
              <Skeleton className="w-2/3 h-5" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-6">
                <Target className="w-10 h-10 text-primary" strokeWidth={2.5} />
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <h3 className="text-2xl font-black text-foreground">
                      Nivel {level}
                    </h3>
                    <span className="text-lg font-bold text-primary">
                      {xpInLevel} / {nextLevelXp} XP
                    </span>
                  </div>
                  <ProgressBar
                    value={xpInLevel}
                    className="h-4 bg-primary/20"
                  />
                </div>
              </div>
              <p className="text-lg text-muted-foreground">
                ¡Sigue así! Solo necesitas{" "}
                <span className="font-bold text-primary">
                  {remainingXp} estrellas
                </span>{" "}
                más para subir al Nivel {level + 1}
              </p>
            </>
          )}
        </Card>

        {/* Achievements */}
        <Card className="bg-card/95 backdrop-blur-sm border-4 border-secondary/30 rounded-3xl p-8">
          <h2 className="text-3xl font-black text-foreground mb-6 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-secondary" strokeWidth={2.5} />
            Logros
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <Card key={`ach-skel-${i}`} className="p-6 rounded-2xl">
                    <div className="text-center space-y-3">
                      <Skeleton className="w-16 h-16 mx-auto rounded-full" />
                      <Skeleton className="w-32 h-5 mx-auto" />
                      <Skeleton className="w-48 h-4 mx-auto" />
                    </div>
                  </Card>
                ))
              : achievementsToDisplay.map((achievement, index) => (
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
                      <h4 className="text-lg font-black text-foreground">
                        {achievement.title}
                      </h4>
                      <p className="text-sm text-foreground/70">
                        {achievement.description}
                      </p>
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
              🎉 ¡Vas increíble! Sigue practicando cada día para desbloquear más
              tesoros
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Progress;
