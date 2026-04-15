import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {BrowserRouter, Navigate, Route, Routes} from "react-router-dom";
import {Toaster as Sonner} from "@/components/ui/sonner";
import {TooltipProvider} from "@/components/ui/tooltip";
import {ThemeProvider} from "@/components/ThemeProvider";
import {AuthProvider, useAuth} from "@/contexts/AuthContext";
import {ProtectedRoute} from "@/components/ProtectedRoute";
import {AppLayout} from "@/components/AppLayout";
import {ClinicLayout} from "@/components/clinic/ClinicLayout";
import {CommandPalette} from "@/components/CommandPalette";
import {KeyboardShortcuts} from "@/components/KeyboardShortcuts";
import {ErrorBoundary} from "@/components/ErrorBoundary";
import {Analytics} from "@vercel/analytics/react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";
import Agenda from "./pages/Agenda";
import Packages from "./pages/Packages";
import Finances from "./pages/Finances";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Waitlist from "./pages/Waitlist";
import NotFound from "./pages/NotFound";
import ClinicDashboard from "./pages/clinic/ClinicDashboard";
import ClinicAgenda from "./pages/clinic/ClinicAgenda";
import ClinicPsychologists from "./pages/clinic/ClinicPsychologists";
import ClinicSettings from "./pages/clinic/ClinicSettings";

const queryClient = new QueryClient();
function RoleBasedHome() {
  const { userRole, loading } = useAuth();
  if (loading || userRole === null) return null;
  if (userRole === "clinic_admin") return <Navigate to="/clinic/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Sonner richColors closeButton />
        <BrowserRouter>
          <AuthProvider>
            <ErrorBoundary>
              <CommandPalette />
              <KeyboardShortcuts />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/" element={<ProtectedRoute><RoleBasedHome /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
                <Route path="/patients" element={<ProtectedRoute><AppLayout><Patients /></AppLayout></ProtectedRoute>} />
                <Route path="/patients/:id" element={<ProtectedRoute><AppLayout><PatientProfile /></AppLayout></ProtectedRoute>} />
                <Route path="/agenda" element={<ProtectedRoute><AppLayout><Agenda /></AppLayout></ProtectedRoute>} />
                <Route path="/packages" element={<ProtectedRoute><AppLayout><Packages /></AppLayout></ProtectedRoute>} />
                <Route path="/finances" element={<ProtectedRoute><AppLayout><Finances /></AppLayout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
                <Route path="/waitlist" element={<ProtectedRoute><AppLayout><Waitlist /></AppLayout></ProtectedRoute>} />
                <Route path="/clinic/dashboard" element={<ProtectedRoute><ClinicLayout><ClinicDashboard /></ClinicLayout></ProtectedRoute>} />
                <Route path="/clinic/agenda" element={<ProtectedRoute><ClinicLayout><ClinicAgenda /></ClinicLayout></ProtectedRoute>} />
                <Route path="/clinic/patients" element={<ProtectedRoute><ClinicLayout><Patients /></ClinicLayout></ProtectedRoute>} />
                <Route path="/clinic/patients/:id" element={<ProtectedRoute><ClinicLayout><PatientProfile /></ClinicLayout></ProtectedRoute>} />
                <Route path="/clinic/psychologists" element={<ProtectedRoute><ClinicLayout><ClinicPsychologists /></ClinicLayout></ProtectedRoute>} />
                <Route path="/clinic/settings" element={<ProtectedRoute><ClinicLayout><ClinicSettings /></ClinicLayout></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </ErrorBoundary>
          </AuthProvider>
        </BrowserRouter>
        <Analytics />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
export default App;
