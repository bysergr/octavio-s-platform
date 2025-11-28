import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import octavioThinking from "@/assets/octavio-thinking.png";

const DIAGNOSTIC_QUESTIONS = [
  {
    question: "Lee este texto: 'El sol brillaba en el cielo mientras los niños jugaban en el parque.' ¿Qué estaban haciendo los niños?",
    hint: "Piensa en la acción que menciona el texto"
  },
  {
    question: "Si una historia dice: 'María guardó su paraguas porque dejó de llover.' ¿Por qué María guardó el paraguas?",
    hint: "Busca la razón en el texto"
  },
  {
    question: "Lee: 'El perrito ladraba y movía la cola cuando vio a su dueño.' ¿Cómo crees que se sentía el perrito? ¿Por qué?",
    hint: "Piensa en cómo actúan los perritos cuando están contentos"
  }
];

const Diagnosis = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [showHint, setShowHint] = useState(false);
  const navigate = useNavigate();

  const progress = ((currentQuestion + 1) / DIAGNOSTIC_QUESTIONS.length) * 100;

  const handleAnswer = (value: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = value;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < DIAGNOSTIC_QUESTIONS.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setShowHint(false);
    } else {
      // Store diagnostic completion
      sessionStorage.setItem("diagnosticComplete", "true");
      navigate("/menu");
    }
  };

  const canProceed = answers[currentQuestion].trim().length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-3xl w-full bg-card/95 backdrop-blur-sm shadow-2xl border-4 border-primary/30 rounded-3xl p-8 md:p-12">
        {/* Progress bar */}
        <div className="mb-8 space-y-2">
          <div className="flex justify-between text-sm font-bold text-primary">
            <span>Pregunta {currentQuestion + 1} de {DIAGNOSTIC_QUESTIONS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-3 bg-primary/20" />
        </div>

        {/* Octavio */}
        <div className="flex justify-center mb-6">
          <img 
            src={octavioThinking} 
            alt="Octavio pensando" 
            className="w-40 h-40 md:w-48 md:h-48 animate-float drop-shadow-xl"
          />
        </div>

        {/* Octavio's message */}
        <div className="bg-accent/20 border-4 border-accent/40 rounded-2xl p-6 mb-8">
          <p className="text-xl md:text-2xl font-bold text-foreground mb-4">
            {currentQuestion === 0 
              ? "¡Ey Compa! Antes de empezar la aventura, necesito saber si sabes saltar alto. 🦘"
              : "¡Muy bien! Siguiente pregunta..."}
          </p>
          <p className="text-lg md:text-xl text-foreground/90 leading-relaxed">
            {DIAGNOSTIC_QUESTIONS[currentQuestion].question}
          </p>
        </div>

        {/* Answer input */}
        <div className="space-y-4 mb-6">
          <Textarea
            value={answers[currentQuestion]}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder="Escribe tu respuesta aquí..."
            className="min-h-32 text-lg border-4 border-primary/40 focus:border-primary rounded-2xl resize-none"
          />
          
          {/* Hint button */}
          {!showHint && (
            <Button
              onClick={() => setShowHint(true)}
              variant="outline"
              className="w-full border-2 border-secondary/50 text-secondary hover:bg-secondary/10 rounded-xl font-bold"
            >
              💡 ¿Necesitas una pista?
            </Button>
          )}
          
          {showHint && (
            <div className="bg-secondary/10 border-2 border-secondary/30 rounded-xl p-4">
              <p className="text-secondary font-bold">
                💡 Pista: {DIAGNOSTIC_QUESTIONS[currentQuestion].hint}
              </p>
            </div>
          )}
        </div>

        {/* Next button */}
        <Button
          onClick={handleNext}
          disabled={!canProceed}
          className="w-full h-14 text-xl font-black rounded-2xl bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 border-4 border-success-foreground/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {currentQuestion === DIAGNOSTIC_QUESTIONS.length - 1 ? "¡Terminar! ✨" : "Siguiente →"}
        </Button>
      </Card>
    </div>
  );
};

export default Diagnosis;
