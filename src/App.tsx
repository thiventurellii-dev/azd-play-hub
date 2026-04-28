import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/components/NotificationDialog";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import Register from "./pages/Register.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import CompleteProfile from "./pages/CompleteProfile.tsx";
import Seasons from "./pages/Seasons.tsx";
import SeasonDetail from "./pages/SeasonDetail.tsx";
import Games from "./pages/Games.tsx";
import Players from "./pages/Players.tsx";
import Profile from "./pages/Profile.tsx";
import Documents from "./pages/Documents.tsx";
import Suggestions from "./pages/Suggestions.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";
import AboutUs from "./pages/AboutUs.tsx";
import Rankings from "./pages/Rankings.tsx";
import MatchRooms from "./pages/MatchRooms.tsx";
import GameDetail from "./pages/GameDetail.tsx";
import PlayerProfile from "./pages/PlayerProfile.tsx";
import SteamCallback from "./pages/SteamCallback.tsx";
import ScriptDetail from "./pages/ScriptDetail.tsx";
import Install from "./pages/Install.tsx";
import Communities from "./pages/Communities.tsx";
import CommunityDetail from "./pages/CommunityDetail.tsx";
import TopicDetail from "./pages/TopicDetail.tsx";

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
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/register" element={<Register />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/complete-profile" element={<CompleteProfile />} />
                <Route path="/about" element={<AboutUs />} />
                <Route path="/seasons" element={<ProtectedRoute><Seasons /></ProtectedRoute>} />
                <Route path="/seasons/:id" element={<ProtectedRoute><SeasonDetail /></ProtectedRoute>} />
                <Route path="/games" element={<ProtectedRoute><Games /></ProtectedRoute>} />
                <Route path="/jogos/:slug" element={<ProtectedRoute><GameDetail /></ProtectedRoute>} />
                <Route path="/scripts/:slug" element={<ProtectedRoute><ScriptDetail /></ProtectedRoute>} />
                <Route path="/players" element={<ProtectedRoute><Players /></ProtectedRoute>} />
                <Route path="/perfil/:nickname" element={<ProtectedRoute><PlayerProfile /></ProtectedRoute>} />
                <Route path="/rankings" element={<ProtectedRoute><Rankings /></ProtectedRoute>} />
                <Route path="/documentos" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
                <Route path="/suggestions" element={<ProtectedRoute><Suggestions /></ProtectedRoute>} />
                <Route path="/partidas" element={<ProtectedRoute><MatchRooms /></ProtectedRoute>} />
                <Route path="/comunidades" element={<ProtectedRoute><Communities /></ProtectedRoute>} />
                <Route path="/comunidades/:slug" element={<ProtectedRoute><CommunityDetail /></ProtectedRoute>} />
                <Route path="/comunidades/:slug/discussao/:topicId" element={<ProtectedRoute><TopicDetail /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
                <Route path="/auth/steam/callback" element={<ProtectedRoute><SteamCallback /></ProtectedRoute>} />
                <Route path="/instalar" element={<Install />} />
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
