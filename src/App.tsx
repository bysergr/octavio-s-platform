import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Diagnosis from "./pages/Diagnosis";
import Menu from "./pages/Menu";
import Reading from "./pages/Reading";
import Progress from "./pages/Progress";
import DailyChallenge from "./pages/DailyChallenge";
import Games from "./pages/Games";
import NotFound from "./pages/NotFound";
import OctavioBubble from "./components/OctavioBubble";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <OctavioBubble />
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/diagnosis" element={<Diagnosis />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/reading" element={<Reading />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/games" element={<Games />} />
          <Route path="/daily-challenge" element={<DailyChallenge />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
