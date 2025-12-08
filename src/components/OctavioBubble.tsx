import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { askOctavio } from "@/integrations/ai/octavio";
import octavioWaving from "@/assets/octavio-waving.png";
import octavioThinking from "@/assets/octavio-thinking.png";
import octavioCelebrating from "@/assets/octavio-celebrating.png";

const OctavioBubble = () => {
  const [open, setOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [storyInput, setStoryInput] = useState("");
  const [hintText, setHintText] = useState<string | null>(null);

  const askHint = async () => {
    if (!storyInput.trim()) return;
    setAiLoading(true);
    setHintText(null);
    try {
      const res = await askOctavio({
        mode: "hint",
        story: storyInput,
        age: 8,
        level: 1,
      });
      setHintText(res.text);
    } catch {
      setHintText(
        "Piensa en qué idea se repite más en el texto o pregunta de otra forma. ¡Tú puedes!"
      );
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-20 w-20 rounded-full shadow-xl bg-gradient-to-br from-primary via-primary/90 to-secondary hover:brightness-110 z-50 group overflow-visible"
            aria-label="Habla con Octavio"
          >
            <span
              aria-hidden="true"
              className="absolute -inset-1 rounded-full ring-2 ring-primary/40 animate-pulse pointer-events-none"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-primary/40 blur-xl opacity-0 group-hover:opacity-60 transition-opacity"
            />
            <img
              src={octavioWaving}
              alt="Octavio"
              className="h-16 w-16 object-contain animate-float"
            />
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-background"
            />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-b from-background/95 to-background/80 supports-[backdrop-filter]:bg-background/80 backdrop-blur-xl shadow-2xl">
          <DialogHeader className="p-4 pb-3 border-b border-primary/20 bg-gradient-to-r from-primary/15 via-primary/10 to-secondary/15">
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-3">
                <img
                  src={octavioThinking}
                  alt="Octavio"
                  className="w-9 h-9 rounded-full"
                />
                <span className="flex flex-col">
                  <span className="font-semibold">Octavio</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    En línea
                  </span>
                </span>
              </span>
            </DialogTitle>
            <DialogDescription className="pt-1">
              ¡Pregúntale lo que quieras! Octavio te ayudará con tus dudas.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 pt-3 space-y-4">
            <div
              className="max-h-[45vh] overflow-y-auto space-y-3 pr-1"
              aria-live="polite"
            >
              {!aiLoading && !hintText && (
                <div className="bg-gradient-to-br from-primary/15 to-secondary/20 border border-primary/25 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={octavioWaving}
                      alt="Octavio saludando"
                      className="w-9 h-9"
                    />
                    <div className="text-sm text-muted-foreground">
                      Escribe tu pregunta arriba. Consejos: sé específico,
                      menciona el tema y pide un ejemplo.
                    </div>
                  </div>
                </div>
              )}

              {aiLoading && (
                <div className="bg-muted/30 border border-primary/30 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <img
                      src={octavioThinking}
                      alt="Octavio pensando"
                      className="w-9 h-9 animate-pulse"
                    />
                    <div className="flex-1">
                      <p className="text-foreground font-semibold mb-2">
                        🤔 Octavio está pensando...
                      </p>
                      <div className="space-y-2">
                        <Skeleton className="h-3.5 w-full" />
                        <Skeleton className="h-3.5 w-4/5" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {hintText && (
                <div className="bg-gradient-to-br from-primary/20 to-secondary/25 border border-primary/35 rounded-2xl p-4 shadow">
                  <div className="flex items-start gap-3">
                    <img
                      src={octavioCelebrating}
                      alt="Octavio"
                      className="w-9 h-9"
                    />
                    <div className="flex-1">
                      <p className="text-foreground font-semibold mb-2">
                        💬 Octavio dice:
                      </p>
                      <p className="text-foreground text-base leading-relaxed">
                        {hintText}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setStoryInput("¿Cuál es la idea principal?")}
                  className="px-3 py-1.5 rounded-full text-xs bg-secondary/20 hover:bg-secondary/30 border border-secondary/30 transition"
                >
                  ¿Idea principal?
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setStoryInput("Explícame con un ejemplo sencillo")
                  }
                  className="px-3 py-1.5 rounded-full text-xs bg-secondary/20 hover:bg-secondary/30 border border-secondary/30 transition"
                >
                  Ejemplo
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setStoryInput("Dame una pista para resolverlo")
                  }
                  className="px-3 py-1.5 rounded-full text-xs bg-secondary/20 hover:bg-secondary/30 border border-secondary/30 transition"
                >
                  Pista
                </button>
              </div>

              <div className="rounded-2xl border border-primary/40 bg-background/85 supports-[backdrop-filter]:bg-background/75 backdrop-blur-xl p-2 transition focus-within:ring-2 focus-within:ring-primary/50">
                <textarea
                  value={storyInput}
                  onChange={(e) => setStoryInput(e.target.value)}
                  placeholder="Escribe tu pregunta para Octavio..."
                  className="w-full bg-transparent border-0 outline-none resize-none px-2 py-2 placeholder:text-muted-foreground/70 text-base"
                  rows={4}
                />
                <div className="flex justify-end p-1">
                  <Button
                    onClick={askHint}
                    disabled={aiLoading || !storyInput.trim()}
                    className="h-11 bg-gradient-to-r from-primary/90 via-primary to-secondary/90 hover:brightness-110 shadow-md focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    {aiLoading ? "🤔 Pensando..." : "💭 Preguntar a Octavio"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OctavioBubble;
