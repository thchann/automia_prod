import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute.tsx";
import LandingRedirect from "./pages/LandingRedirect.tsx";
import VerificationPage from "./pages/VerificationPage.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import SetupWebsitePage from "./pages/SetupWebsitePage.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { AppErrorBoundary } from "./components/AppErrorBoundary.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /** Avoid refetch-on-tab-focus wiping multi-car `car_ids` when GET /leads omits them (server is source of truth on refetch). */
      refetchOnWindowFocus: (query) => query.queryKey[0] !== "leads",
    },
  },
});
const routerBasename =
  import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

const App = () => (
  <LanguageProvider>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter basename={routerBasename}>
              <AppErrorBoundary>
              <Routes>
                <Route path="/" element={<LandingRedirect />} />
                <Route path="/verification" element={<VerificationPage />} />
                <Route path="/sign-in" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route
                  path="/setup-website"
                  element={
                    <ProtectedRoute>
                      <SetupWebsitePage />
                    </ProtectedRoute>
                  }
                />
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
              </AppErrorBoundary>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </LanguageProvider>
);

export default App;
