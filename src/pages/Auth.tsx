import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(50, "El nombre es muy largo"),
  email: z.string().email("Correo electrónico inválido").max(255, "Correo electrónico muy largo"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(72, "La contraseña es muy larga"),
  age: z.number().min(6, "La edad debe ser entre 6 y 9 años").max(9, "La edad debe ser entre 6 y 9 años")
});

const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido").max(255, "Correo electrónico muy largo"),
  password: z.string().min(1, "La contraseña es requerida").max(72, "La contraseña es muy larga")
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/menu");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
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
      const validated = signupSchema.parse({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        age: ageNum
      });

      const { error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/menu`,
          data: {
            full_name: validated.fullName,
            age: validated.age
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Usuario ya registrado",
            description: "Este correo ya está registrado. Por favor inicia sesión.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error al registrarse",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "¡Cuenta creada!",
          description: "Tu cuenta ha sido creada exitosamente. Iniciando sesión...",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Ocurrió un error inesperado",
          variant: "destructive"
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
      const validated = loginSchema.parse({
        email: email.trim().toLowerCase(),
        password
      });

      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Credenciales incorrectas",
            description: "El correo o la contraseña son incorrectos.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error al iniciar sesión",
            description: error.message,
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Ocurrió un error inesperado",
          variant: "destructive"
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
            {isLogin ? "Inicia sesión para continuar aprendiendo" : "Crea tu cuenta para comenzar"}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={isLogin ? handleLogin : handleSignup} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-base font-fredoka text-foreground">
                    Nombre completo
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Tu nombre"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    maxLength={50}
                    className="border-2 border-accent/30 focus:border-accent font-fredoka text-base h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age" className="text-base font-fredoka text-foreground">
                    Edad
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="6-9 años"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    required={!isLogin}
                    min={6}
                    max={9}
                    className="border-2 border-accent/30 focus:border-accent font-fredoka text-base h-12"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-base font-fredoka text-foreground">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={255}
                className="border-2 border-accent/30 focus:border-accent font-fredoka text-base h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-fredoka text-foreground">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                maxLength={72}
                minLength={6}
                className="border-2 border-accent/30 focus:border-accent font-fredoka text-base h-12"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-lg font-fredoka"
              disabled={loading}
            >
              {loading ? "Cargando..." : isLogin ? "Iniciar Sesión" : "Crear Cuenta"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-primary hover:text-primary/80 font-fredoka text-base underline"
              >
                {isLogin ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia sesión"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}