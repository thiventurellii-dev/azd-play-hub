import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from './Navbar';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

const PUBLIC_ROUTES = ['/', '/login', '/register', '/complete-profile', '/about'];

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
    <div className="min-h-screen bg-background flex flex-col">
      {!hideNavbar && <Navbar />}
      <main className="flex-1">{children}</main>
      {!hideNavbar && <Footer />}
    </div>
  );
};

const Footer = () => (
  <footer className="border-t border-border bg-background py-6">
    <p className="text-center text-xs text-muted-foreground">© 2026 Amizade (AzD)</p>
  </footer>
);

export default Layout;
