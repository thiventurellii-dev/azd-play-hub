import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/components/NotificationDialog";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import CompleteProfile from "./pages/CompleteProfile.tsx";
import Seasons from "./pages/Seasons.tsx";
import SeasonDetail from "./pages/SeasonDetail.tsx";
import Games from "./pages/Games.tsx";
import Players from "./pages/Players.tsx";
import Profile from "./pages/Profile.tsx";
import Rules from "./pages/Rules.tsx";
import Suggestions from "./pages/Suggestions.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";
import AboutUs from "./pages/AboutUs.tsx";
import Rankings from "./pages/Rankings.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AuthProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/complete-profile" element={<CompleteProfile />} />
                <Route path="/seasons" element={<ProtectedRoute><Seasons /></ProtectedRoute>} />
                <Route path="/seasons/:id" element={<ProtectedRoute><SeasonDetail /></ProtectedRoute>} />
                <Route path="/games" element={<Games />} />
                <Route path="/players" element={<ProtectedRoute><Players /></ProtectedRoute>} />
                <Route path="/rankings" element={<ProtectedRoute><Rankings /></ProtectedRoute>} />
                <Route path="/rules" element={<Rules />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/suggestions" element={<Suggestions />} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </AuthProvider>
        </BrowserRouter>
      </NotificationProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
