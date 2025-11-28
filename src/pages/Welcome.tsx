import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import octavioWaving from "@/assets/octavio-waving.png";

const Welcome = () => {
  const [username, setUsername] = useState("");
  const navigate = useNavigate();

  const handleStart = () => {
    if (username.trim()) {
      // Store username in sessionStorage for now
      sessionStorage.setItem("username", username);
      navigate("/diagnosis");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-card/95 backdrop-blur-sm shadow-2xl border-4 border-primary/30 rounded-3xl p-8 md:p-12">
        <div className="text-center space-y-8">
          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black text-primary drop-shadow-lg animate-bounce-gentle">
              ¡Pilas con la Lectura!
            </h1>
            <div className="h-1 w-32 bg-gradient-to-r from-primary via-secondary to-accent mx-auto rounded-full"></div>
          </div>

          {/* Octavio mascot */}
          <div className="flex justify-center">
            <img 
              src={octavioWaving} 
              alt="Octavio el Capibara" 
              className="w-48 h-48 md:w-64 md:h-64 animate-float drop-shadow-2xl"
            />
          </div>

          {/* Welcome message */}
          <div className="bg-primary/10 border-4 border-primary/30 rounded-2xl p-6 space-y-4">
            <p className="text-2xl md:text-3xl font-bold text-foreground">
              ¡Hola, Super Lector! 🌟
            </p>
            <p className="text-lg md:text-xl text-foreground/80">
              ¿Listo para empezar a ganar estrellas?
            </p>
            <p className="text-base md:text-lg text-muted-foreground">
              Escribe tu usuario o escribe <span className="font-bold text-secondary">'NUEVO'</span> para registrarte
            </p>
          </div>

          {/* Input form */}
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Mi nombre es..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleStart()}
              className="text-xl h-14 border-4 border-primary/40 focus:border-primary rounded-2xl text-center font-bold placeholder:text-muted-foreground/50"
            />
            
            <Button
              onClick={handleStart}
              disabled={!username.trim()}
              className="w-full h-16 text-2xl font-black rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-4 border-primary-foreground/20"
            >
              ¡Empezar Aventura! 🚀
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Welcome;
