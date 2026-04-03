import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import LandingRedirect from "./pages/LandingRedirect.tsx";
import VerificationEntryPage from "./pages/VerificationEntryPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import SetupWebsitePage from "./pages/SetupWebsitePage.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function getRouterBasename(): string | undefined {
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/m")) {
    return "/m";
  }
  const base = import.meta.env.BASE_URL;
  if (base === "/" || base === "") return undefined;
  return base.replace(/\/$/, "");
}

const routerBasename = getRouterBasename();

const App = () => (
  <LanguageProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter basename={routerBasename}>
            <Routes>
              <Route path="/" element={<LandingRedirect />} />
              <Route path="/verification" element={<VerificationEntryPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/setup-website"
                element={
                  <ProtectedRoute>
                    <SetupWebsitePage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </LanguageProvider>
);

export default App;
