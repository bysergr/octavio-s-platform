import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import octavioThinking from "@/assets/octavio-thinking.png";

const ComingSoon = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full bg-card/95 backdrop-blur-sm shadow-2xl border-4 border-accent/30 rounded-3xl p-8 md:p-12">
        <div className="text-center space-y-8">
          <div className="flex justify-center">
            <img 
              src={octavioThinking} 
              alt="Octavio pensando" 
              className="w-48 h-48 md:w-56 md:h-56 animate-float drop-shadow-2xl"
            />
          </div>

          <div className="bg-accent/20 border-4 border-accent/40 rounded-2xl p-8 space-y-4">
            <p className="text-3xl md:text-4xl font-black text-foreground">
              ¡Próximamente! 🚧
            </p>
            <p className="text-xl md:text-2xl text-foreground/80">
              Esta misión está siendo preparada especialmente para ti
            </p>
            <p className="text-lg text-muted-foreground">
              Octavio está trabajando duro para traerte más aventuras increíbles
            </p>
          </div>

          <Button
            onClick={() => navigate("/menu")}
            className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al Menú
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ComingSoon;
