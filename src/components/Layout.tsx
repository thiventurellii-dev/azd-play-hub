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

const DiscordIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
  </svg>
);

const WhatsAppIcon = ({ size = 16 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const Footer = () => {
  const [links, setLinks] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase
      .from("contact_links")
      .select("name, url")
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          for (const r of data) map[r.name] = r.url;
          setLinks(map);
        }
      });
  }, []);

  const hasAny = links.discord || links.whatsapp || links.whatsapp_botc;

  return (
    <footer className="border-t border-border bg-background py-6">
      {hasAny && (
        <div className="flex flex-wrap justify-center gap-3 mb-4">
          {links.discord && (
            <a href={links.discord} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2 border-[#5865F2]/40 text-[#5865F2] hover:bg-[#5865F2]/10 hover:text-[#5865F2]">
                <DiscordIcon /> Discord
              </Button>
            </a>
          )}
          {links.whatsapp && (
            <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2 border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]">
                <WhatsAppIcon /> Boardgame
              </Button>
            </a>
          )}
          {links.whatsapp_botc && (
            <a href={links.whatsapp_botc} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2 border-[#25D366]/40 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]">
                <WhatsAppIcon /> Blood
              </Button>
            </a>
          )}
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground">© 2026 Amizade (AzD)</p>
    </footer>
  );
};

export default Layout;
