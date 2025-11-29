import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const userSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(50, "El nombre es muy largo"),
  age: z
    .number()
    .min(6, "La edad debe ser entre 6 y 9 años")
    .max(9, "La edad debe ser entre 6 y 9 años"),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Genera credenciales sintéticas (email y password) a partir de username + edad
  const buildSyntheticCredentials = (
    rawUsername: string,
    rawAge: string | number
  ) => {
    const cleanedUsername = rawUsername
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ".");
    const ageNum = typeof rawAge === "string" ? parseInt(rawAge) : rawAge;
    const email = `${cleanedUsername}@gmail.com`;
    const password = `${cleanedUsername}-${ageNum}-octavio`;
    return { email, password, cleanedUsername, ageNum };
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/menu");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        navigate("/menu");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const ageNum = parseInt(age);
      const validated = userSchema.parse({
        username: username.trim(),
        age: ageNum,
      });

      const { email, password } = buildSyntheticCredentials(
        validated.username,
        validated.age
      );

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/menu`,
          data: {
            full_name: validated.username,
            age: validated.age,
          },
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Usuario ya existe",
            description: "Ese nombre ya está en uso. Intenta con otro.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error al registrarse",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "¡Cuenta creada!",
          description:
            "Tu cuenta ha sido creada exitosamente. Iniciando sesión...",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Ocurrió un error inesperado",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const ageNum = parseInt(age);
      const validated = userSchema.parse({
        username: username.trim(),
        age: ageNum,
      });

      const { email, password } = buildSyntheticCredentials(
        validated.username,
        validated.age
      );

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Datos incorrectos",
            description: "Nombre o edad incorrectos. Intenta de nuevo.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error al iniciar sesión",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Ocurrió un error inesperado",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-tropical opacity-90" />

      <img
        src="/src/assets/octavio-waving.png"
        alt="Octavio saludando"
        className="absolute bottom-8 left-8 w-40 h-40 object-contain animate-float z-10 hidden md:block"
      />

      <Card className="w-full max-w-md relative z-20 bg-white/95 backdrop-blur-sm shadow-playful border-4 border-accent">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-fredoka text-primary">
            {isLogin ? "¡Bienvenido de vuelta!" : "¡Únete a la aventura!"}
          </CardTitle>
          <CardDescription className="text-lg text-foreground/70 font-fredoka">
            {isLogin
              ? "Inicia sesión para continuar aprendiendo"
              : "Crea tu cuenta para comenzar"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={isLogin ? handleLogin : handleSignup}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label
                htmlFor="username"
                className="text-base font-fredoka text-foreground"
              >
                Nombre de usuario
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Tu nombre"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                maxLength={50}
                className="border-2 border-accent/30 focus:border-accent font-fredoka text-base h-12"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="age"
                className="text-base font-fredoka text-foreground"
              >
                Edad
              </Label>
              <Input
                id="age"
                type="number"
                placeholder="6-9 años"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                required
                min={6}
                max={9}
                className="border-2 border-accent/30 focus:border-accent font-fredoka text-base h-12"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-lg font-fredoka"
              disabled={loading}
            >
              {loading
                ? "Cargando..."
                : isLogin
                ? "Iniciar Sesión"
                : "Crear Cuenta"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:text-primary/80 font-fredoka text-base underline"
              >
                {isLogin
                  ? "¿No tienes cuenta? Regístrate"
                  : "¿Ya tienes cuenta? Inicia sesión"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
