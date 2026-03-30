import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import LandingRedirect from "./pages/LandingRedirect.tsx";
import VerificationPage from "./pages/VerificationPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();
const routerBasename =
  import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

const App = () => (
  <LanguageProvider>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={routerBasename}>
            <Routes>
              <Route path="/" element={<LandingRedirect />} />
              <Route path="/verification" element={<VerificationPage />} />
              <Route path="/sign-in" element={<LoginPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </LanguageProvider>
);

export default App;
