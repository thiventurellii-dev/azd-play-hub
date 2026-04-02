import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from './Navbar';

const PUBLIC_ROUTES = ['/login', '/register', '/complete-profile'];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profileCompleted, playerStatus } = useAuth();
  const location = useLocation();

  // Redirect logged-in users with incomplete profile
  if (!loading && user && !profileCompleted && !PUBLIC_ROUTES.includes(location.pathname)) {
    return <Navigate to="/complete-profile" replace />;
  }

  // Hide navbar on complete-profile page
  const hideNavbar = location.pathname === '/complete-profile';

  // Show pending approval message for users awaiting approval
  if (!loading && user && playerStatus === 'pending_approval' && !PUBLIC_ROUTES.includes(location.pathname) && location.pathname !== '/') {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="flex items-center justify-center py-32">
          <div className="text-center max-w-md px-4">
            <h2 className="text-2xl font-bold mb-4">Cadastro em análise</h2>
            <p className="text-muted-foreground">
              Seu cadastro foi recebido e está aguardando aprovação de um administrador. 
              Você receberá acesso assim que for aprovado.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {!hideNavbar && <Navbar />}
      <main>{children}</main>
    </div>
  );
};

export default Layout;
