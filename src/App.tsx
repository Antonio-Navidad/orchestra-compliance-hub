import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
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
import DecisionTwin from "./pages/DecisionTwin";
import RouteBuilder from "./pages/RouteBuilder";
import TeamChat from "./pages/TeamChat";
import DianCompliance from "./pages/DianCompliance";
import CreatorMode from "./pages/CreatorMode";
import NotFound from "./pages/NotFound";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/shipment/:id" element={<ProtectedRoute><ShipmentDetail /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
          <Route path="/legal" element={<ProtectedRoute><LegalKnowledge /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute><ReviewQueue /></ProtectedRoute>} />
          <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/brokers" element={<ProtectedRoute><BrokerScorecard /></ProtectedRoute>} />
          <Route path="/broker/:id" element={<ProtectedRoute><BrokerProfile /></ProtectedRoute>} />
          <Route path="/intake" element={<ProtectedRoute><ShipmentIntake /></ProtectedRoute>} />
          <Route path="/audit-trail" element={<ProtectedRoute><AuditTrail /></ProtectedRoute>} />
          <Route path="/jurisdiction-settings" element={<ProtectedRoute><JurisdictionSettings /></ProtectedRoute>} />
          <Route path="/hints" element={<ProtectedRoute><Hints /></ProtectedRoute>} />
          <Route path="/classify" element={<ProtectedRoute><ProductClassification /></ProtectedRoute>} />
          <Route path="/validate-docs" element={<ProtectedRoute><DocumentValidator /></ProtectedRoute>} />
          <Route path="/route-builder" element={<ProtectedRoute><RouteBuilder /></ProtectedRoute>} />
          <Route path="/team-chat" element={<ProtectedRoute><TeamChat /></ProtectedRoute>} />
          <Route path="/dian-compliance" element={<ProtectedRoute><DianCompliance /></ProtectedRoute>} />
          <Route path="/decision-twin" element={<ProtectedRoute><DecisionTwin /></ProtectedRoute>} />
          <Route path="/decision-twin/:id" element={<ProtectedRoute><DecisionTwin /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
