import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { InstallPrompt } from "@/components/PWA/InstallPrompt";
import { ProtectedRoute } from "@/components/Auth/ProtectedRoute";
import { AdminLayout } from "@/components/Layout/AdminLayout";
import { ClientLayout } from "@/components/Layout/ClientLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import Professionals from "./pages/Professionals";
import Services from "./pages/Services";
import Clients from "./pages/Clients";
import Financial from "./pages/Financial";
import Settings from "./pages/Settings";
import Portfolio from "./pages/Portfolio";
import ClientHome from "./pages/client/ClientHome";
import ClientBooking from "./pages/client/ClientBooking";
import ClientAppointments from "./pages/client/ClientAppointments";
import ClientProfessionals from "./pages/client/ClientProfessionals";
import ClientServices from "./pages/client/ClientServices";
import ClientProfile from "./pages/client/ClientProfile";
import ClientPortfolio from "./pages/client/ClientPortfolio";
import SelectClinic from "./pages/client/SelectClinic";
import ClientSignup from "./pages/ClientSignup";
import ClientLogin from "./pages/ClientLogin";
import Sales from "./pages/Sales";
import Activate from "./pages/Activate";
import CheckoutSuccess from "./pages/CheckoutSuccess";

import Install from "./pages/Install";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <InstallPrompt />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/cadastro-cliente" element={<ClientSignup />} />
            <Route path="/login-cliente" element={<ClientLogin />} />
            <Route path="/install" element={<Install />} />
            <Route path="/vendas" element={<Sales />} />
            <Route path="/ativar/:token" element={<Activate />} />
            <Route path="/checkout-sucesso" element={<CheckoutSuccess />} />
            
            {/* Admin Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="owner">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="professionals" element={<Professionals />} />
              <Route path="services" element={<Services />} />
              <Route path="clients" element={<Clients />} />
              <Route path="financial" element={<Financial />} />
              <Route path="portfolio" element={<Portfolio />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Client Routes */}
            <Route
              path="/client"
              element={
                <ProtectedRoute requiredRole="client">
                  <ClientLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<ClientHome />} />
              <Route path="select-clinic" element={<SelectClinic />} />
              <Route path="booking" element={<ClientBooking />} />
              <Route path="appointments" element={<ClientAppointments />} />
              <Route path="professionals" element={<ClientProfessionals />} />
              <Route path="services" element={<ClientServices />} />
              <Route path="portfolio" element={<ClientPortfolio />} />
              <Route path="profile" element={<ClientProfile />} />
            </Route>

            {/* Default redirect to home */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
