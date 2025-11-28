import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Lightbulb } from "lucide-react";
import octavioThinking from "@/assets/octavio-thinking.png";
import octavioCelebrating from "@/assets/octavio-celebrating.png";

const STORY = {
  title: "El Tesoro del Jardín Secreto",
  content: `Había una vez una niña llamada Luna que vivía en una casa con un jardín muy grande. 
  
Un día, mientras exploraba detrás de unos arbustos, encontró una puerta pequeñita escondida entre las plantas. La puerta estaba cerrada con un candado viejo y oxidado.

Luna corrió a buscar la llave que había encontrado semanas atrás en el ático. ¡La llave encajaba perfectamente! Cuando abrió la puerta, descubrió un jardín secreto lleno de flores de colores brillantes que nunca había visto antes.

En el centro del jardín había un árbol enorme con ramas que parecían brazos gigantes. En su tronco encontró una caja de madera con su nombre grabado. Dentro de la caja había...`,
  pausePoint: "¿Qué crees que había dentro de la caja?",
  vocabulary: {
    word: "oxidado",
    question: "¿Sabes qué significa la palabra 'oxidado'?"
  }
};

const Reading = () => {
  const [phase, setPhase] = useState<"intro" | "reading" | "vocabulary" | "pause" | "complete">("intro");
  const [answer, setAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const navigate = useNavigate();

  const handleStart = () => setPhase("reading");
  
  const handleContinue = () => {
    if (phase === "reading") {
      setPhase("vocabulary");
    } else if (phase === "vocabulary") {
      setPhase("pause");
    } else if (phase === "pause") {
      setPhase("complete");
    }
    setAnswer("");
    setShowHint(false);
  };

  const renderContent = () => {
    switch (phase) {
      case "intro":
        return (
          <div className="space-y-8">
            <div className="flex justify-center">
              <img 
                src={octavioThinking} 
                alt="Octavio" 
                className="w-48 h-48 animate-float drop-shadow-2xl"
              />
            </div>
            
            <div className="bg-primary/10 border-4 border-primary/30 rounded-2xl p-8 space-y-4">
              <p className="text-2xl md:text-3xl font-bold text-foreground">
                ¡Mira este cuento divertido! 📖
              </p>
              <p className="text-xl text-foreground/80">
                Se llama <span className="font-black text-primary">"{STORY.title}"</span>
              </p>
              <p className="text-lg text-muted-foreground">
                Solo te tomará unos 5 minutos. ¿Listo?
              </p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleStart}
                className="flex-1 h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
              >
                ¡Vamos! 🚀
              </Button>
              <Button
                onClick={() => navigate("/menu")}
                variant="outline"
                className="flex-1 h-14 text-xl font-black rounded-2xl border-2 border-muted-foreground/30"
              >
                ¡Después! 👋
              </Button>
            </div>
          </div>
        );

      case "reading":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl md:text-4xl font-black text-center text-primary mb-6">
              {STORY.title}
            </h2>
            
            <Card className="bg-card/80 border-2 border-primary/20 rounded-2xl p-6 md:p-8">
              <p className="text-lg md:text-xl leading-relaxed whitespace-pre-line text-foreground/90">
                {STORY.content}
              </p>
            </Card>

            <Button
              onClick={handleContinue}
              className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-primary to-primary/80"
            >
              Continuar →
            </Button>
          </div>
        );

      case "vocabulary":
        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <img 
                src={octavioThinking} 
                alt="Octavio" 
                className="w-40 h-40 animate-bounce-gentle drop-shadow-xl"
              />
            </div>

            <div className="bg-accent/20 border-4 border-accent/40 rounded-2xl p-8">
              <p className="text-2xl font-bold text-foreground mb-4">
                ¡Alto! 🛑
              </p>
              <p className="text-xl text-foreground/90">
                {STORY.vocabulary.question}
              </p>
              <p className="text-lg text-muted-foreground mt-2">
                Escribe la definición si la sabes, o escribe <span className="font-bold text-secondary">'PISTA'</span>
              </p>
            </div>

            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Mi respuesta es..."
              className="min-h-32 text-lg border-4 border-accent/40 focus:border-accent rounded-2xl"
            />

            {answer.toUpperCase() === "PISTA" && (
              <div className="bg-secondary/10 border-2 border-secondary/30 rounded-xl p-4">
                <p className="text-secondary font-bold">
                  💡 Pista: Cuando algo está oxidado, significa que el metal se ha puesto viejo y con manchas café por estar mucho tiempo expuesto al aire y la humedad.
                </p>
              </div>
            )}

            <Button
              onClick={handleContinue}
              disabled={!answer.trim()}
              className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-success to-success/80 disabled:opacity-50"
            >
              ¡Siguiente! →
            </Button>
          </div>
        );

      case "pause":
        return (
          <div className="space-y-6">
            <div className="flex justify-center">
              <img 
                src={octavioThinking} 
                alt="Octavio" 
                className="w-40 h-40 animate-float drop-shadow-xl"
              />
            </div>

            <div className="bg-primary/10 border-4 border-primary/30 rounded-2xl p-8">
              <p className="text-2xl font-bold text-foreground mb-4">
                ¡Detente y piensa! 🤔
              </p>
              <p className="text-xl text-foreground/90">
                {STORY.pausePoint}
              </p>
              <p className="text-lg text-muted-foreground mt-2">
                Escribe en una frase lo que piensas.
              </p>
            </div>

            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Yo creo que..."
              className="min-h-32 text-lg border-4 border-primary/40 focus:border-primary rounded-2xl"
            />

            {!showHint && (
              <Button
                onClick={() => setShowHint(true)}
                variant="outline"
                className="w-full border-2 border-secondary/50 text-secondary hover:bg-secondary/10 rounded-xl font-bold"
              >
                <Lightbulb className="w-5 h-5 mr-2" />
                ¿Necesitas ayuda?
              </Button>
            )}

            {showHint && (
              <div className="bg-secondary/10 border-2 border-secondary/30 rounded-xl p-4">
                <p className="text-secondary font-bold">
                  💡 Pista: Piensa en qué tipo de cosas especiales podrían estar en una caja con tu nombre. ¿Sería un regalo? ¿Un tesoro? ¿Un mensaje?
                </p>
              </div>
            )}

            <Button
              onClick={handleContinue}
              disabled={!answer.trim()}
              className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-success to-success/80 disabled:opacity-50"
            >
              ¡Terminar Lectura! ✨
            </Button>
          </div>
        );

      case "complete":
        return (
          <div className="space-y-8 text-center">
            <div className="flex justify-center">
              <img 
                src={octavioCelebrating} 
                alt="Octavio celebrando" 
                className="w-56 h-56 animate-bounce-gentle drop-shadow-2xl"
              />
            </div>

            <div className="bg-success/20 border-4 border-success/40 rounded-2xl p-8 space-y-4">
              <p className="text-4xl md:text-5xl font-black text-success">
                ¡Excelente Trabajo! 🎉
              </p>
              <p className="text-xl md:text-2xl text-foreground">
                Has completado la lectura del cuento.
              </p>
              <p className="text-lg text-foreground/80">
                ¡Ganaste 3 estrellas! ⭐⭐⭐
              </p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => navigate("/menu")}
                className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-primary to-primary/80"
              >
                Volver al Menú 🏠
              </Button>
              <Button
                onClick={() => {
                  setPhase("intro");
                  setAnswer("");
                  setShowHint(false);
                }}
                variant="outline"
                className="w-full h-14 text-xl font-black rounded-2xl border-2"
              >
                Leer Otro Cuento 📚
              </Button>
            </div>
          </div>
        );
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
            className="text-primary hover:bg-primary/10 font-bold"
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
