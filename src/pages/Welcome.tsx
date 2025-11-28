import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import octavioWaving from "@/assets/octavio-waving.png";

export default function Welcome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/menu");
      } else {
        setLoading(false);
      }
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-tropical opacity-90" />
        <p className="text-2xl font-fredoka text-white z-10">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center p-8">
      <div className="absolute inset-0 bg-gradient-tropical opacity-90" />
      
      <div className="relative z-10 text-center space-y-8 max-w-4xl">
        <img 
          src={octavioWaving}
          alt="Octavio el Capibara" 
          className="w-64 h-64 mx-auto object-contain animate-float"
        />
        
        <h1 className="text-6xl md:text-7xl font-fredoka font-bold text-white text-shadow-playful animate-bounce-gentle">
          ¡Pilas con la Lectura!
        </h1>
        
        <p className="text-2xl md:text-3xl font-fredoka text-white text-shadow-sm">
          Acompaña a Octavio en una aventura de aprendizaje
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => navigate("/auth")}
            size="lg"
            className="text-2xl px-12 py-8 h-auto font-fredoka shadow-playful hover:scale-110 transition-transform"
          >
            ¡Empezar Aventura!
          </Button>
        </div>
      </div>
    </div>
  );
}