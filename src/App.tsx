import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { WorkspacePurposeContext, useWorkspacePurposeState, useWorkspacePurpose } from "@/hooks/useWorkspacePurpose";
import { AppLayout } from "@/components/AppLayout";
import { LanguageProvider } from "@/hooks/useLanguage";
import { LanguageBanner } from "@/components/LanguageBanner";
import Dashboard from "./pages/Dashboard";
import ShipmentDetail from "./pages/ShipmentDetail";
import AdminSettings from "./pages/AdminSettings";
import LegalKnowledge from "./pages/LegalKnowledge";
import ReviewQueue from "./pages/ReviewQueue";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import Hints from "./pages/Hints";
import Analytics from "./pages/Analytics";
import BrokerScorecard from "./pages/BrokerScorecard";
import BrokerProfile from "./pages/BrokerProfile";
import ResetPassword from "./pages/ResetPassword";
import ShipmentIntake from "./pages/ShipmentIntake";
import AuditTrail from "./pages/AuditTrail";
import JurisdictionSettings from "./pages/JurisdictionSettings";
import ProductClassification from "./pages/ProductClassification";
import DocumentValidator from "./pages/DocumentValidator";
import DocumentIntelligence from "./pages/DocumentIntelligence";
import DecisionTwin from "./pages/DecisionTwin";
import RouteBuilder from "./pages/RouteBuilder";
import TeamChat from "./pages/TeamChat";
import ComplianceEngine from "./pages/ComplianceEngine";
import CreatorMode from "./pages/CreatorMode";
import MicroSellerMode from "./pages/MicroSellerMode";
import TeamsBlackTier from "./pages/TeamsBlackTier";
import WatchMode from "./pages/WatchMode";
import PurposeSelector from "./pages/PurposeSelector";
import WorkspaceHome from "./pages/WorkspaceHome";
import NotFound from "./pages/NotFound";
import GuidePage from "./pages/GuidePage";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-mono text-sm animate-pulse">INITIALIZING ORCHESTRA...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function PurposeGate({ children }: { children: React.ReactNode }) {
  const { hasPurpose } = useWorkspacePurpose();
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-mono text-sm animate-pulse">INITIALIZING ORCHESTRA...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!hasPurpose) return <Navigate to="/welcome" replace />;
  return <AppLayout>{children}</AppLayout>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <LanguageBanner />
        <WorkspacePurposeWrapper />
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

function WorkspacePurposeWrapper() {
  const purposeState = useWorkspacePurposeState();

  return (
    <WorkspacePurposeContext.Provider value={purposeState}>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/welcome" element={<WelcomeGate />} />
          <Route path="/" element={<PurposeGate><WorkspaceHome /></PurposeGate>} />
          <Route path="/dashboard" element={<PurposeGate><Dashboard /></PurposeGate>} />
          <Route path="/shipment/:id" element={<PurposeGate><ShipmentDetail /></PurposeGate>} />
          <Route path="/admin" element={<PurposeGate><AdminSettings /></PurposeGate>} />
          <Route path="/legal" element={<PurposeGate><LegalKnowledge /></PurposeGate>} />
          <Route path="/review" element={<PurposeGate><ReviewQueue /></PurposeGate>} />
          <Route path="/pricing" element={<PurposeGate><Pricing /></PurposeGate>} />
          <Route path="/analytics" element={<PurposeGate><Analytics /></PurposeGate>} />
          <Route path="/brokers" element={<PurposeGate><BrokerScorecard /></PurposeGate>} />
          <Route path="/broker/:id" element={<PurposeGate><BrokerProfile /></PurposeGate>} />
          <Route path="/intake" element={<PurposeGate><ShipmentIntake /></PurposeGate>} />
          <Route path="/audit-trail" element={<PurposeGate><AuditTrail /></PurposeGate>} />
          <Route path="/jurisdiction-settings" element={<PurposeGate><JurisdictionSettings /></PurposeGate>} />
          <Route path="/hints" element={<PurposeGate><Hints /></PurposeGate>} />
          <Route path="/classify" element={<PurposeGate><ProductClassification /></PurposeGate>} />
          <Route path="/validate-docs" element={<PurposeGate><DocumentValidator /></PurposeGate>} />
          <Route path="/doc-intel" element={<PurposeGate><DocumentIntelligence /></PurposeGate>} />
          <Route path="/route-builder" element={<PurposeGate><RouteBuilder /></PurposeGate>} />
          <Route path="/team-chat" element={<PurposeGate><TeamChat /></PurposeGate>} />
          <Route path="/compliance-engine" element={<PurposeGate><ComplianceEngine /></PurposeGate>} />
          <Route path="/decision-twin" element={<PurposeGate><DecisionTwin /></PurposeGate>} />
          <Route path="/decision-twin/:id" element={<PurposeGate><DecisionTwin /></PurposeGate>} />
          <Route path="/creator-mode" element={<PurposeGate><CreatorMode /></PurposeGate>} />
          <Route path="/watch-mode" element={<PurposeGate><WatchMode /></PurposeGate>} />
          <Route path="/seller-mode" element={<PurposeGate><MicroSellerMode /></PurposeGate>} />
          <Route path="/teams" element={<PurposeGate><TeamsBlackTier /></PurposeGate>} />
          <Route path="/guide" element={<PurposeGate><GuidePage /></PurposeGate>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </WorkspacePurposeContext.Provider>
  );
}

function WelcomeGate() {
  const { user, loading } = useAuth();
  const { hasPurpose } = useWorkspacePurpose();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground font-mono text-sm animate-pulse">INITIALIZING ORCHESTRA...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (hasPurpose) return <Navigate to="/" replace />;
  return <PurposeSelector />;
}

export default App;
