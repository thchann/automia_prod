import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import AuthGate from "./pages/AuthGate.tsx";
import VerificationFlowPage from "./pages/VerificationFlowPage.tsx";
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
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={routerBasename}>
          <Routes>
            <Route path="/" element={<AuthGate />} />
            <Route path="/login" element={<VerificationFlowPage initialTab="login" />} />
            <Route path="/verification" element={<VerificationFlowPage initialTab="verification" />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </LanguageProvider>
);

export default App;
