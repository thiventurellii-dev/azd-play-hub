import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from './Navbar';

const PUBLIC_ROUTES = ['/login', '/register', '/complete-profile'];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profileCompleted } = useAuth();
  const location = useLocation();

  // Redirect logged-in users with incomplete profile
  if (!loading && user && !profileCompleted && !PUBLIC_ROUTES.includes(location.pathname)) {
    return <Navigate to="/complete-profile" replace />;
  }

  // Hide navbar on complete-profile page
  const hideNavbar = location.pathname === '/complete-profile';

  return (
    <div className="min-h-screen bg-background">
      {!hideNavbar && <Navbar />}
      <main>{children}</main>
    </div>
  );
};

export default Layout;
