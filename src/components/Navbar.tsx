import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Trophy, Users, Calendar, Shield, LogOut, Menu, X } from 'lucide-react';
import logo from '@/assets/azd-logo.png';
import { useState } from 'react';

const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { to: '/rankings', label: 'Rankings', icon: Trophy },
    { to: '/seasons', label: 'Seasons', icon: Calendar },
    { to: '/players', label: 'Jogadores', icon: Users },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="AzD" className="h-10 w-10 invert" />
          <span className="text-xl font-bold text-foreground">
            Ami<span className="text-gold">z</span>ade
          </span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to}>
              <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" className="gap-2 text-gold hover:text-gold">
                <Shield className="h-4 w-4" />
                Admin
              </Button>
            </Link>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link to="/profile">
                <Button variant="ghost" size="sm">{user.user_metadata?.name || 'Perfil'}</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-1" />
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Entrar</Button></Link>
              <Link to="/register"><Button variant="gold" size="sm">Cadastrar</Button></Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 space-y-2">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Icon className="h-4 w-4" /> {label}
              </Button>
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" onClick={() => setMobileOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2 text-gold">
                <Shield className="h-4 w-4" /> Admin
              </Button>
            </Link>
          )}
          <div className="pt-2 border-t border-border space-y-2">
            {user ? (
              <>
                <Link to="/profile" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">Perfil</Button>
                </Link>
                <Button variant="outline" className="w-full" onClick={handleSignOut}>Sair</Button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" className="w-full">Entrar</Button>
                </Link>
                <Link to="/register" onClick={() => setMobileOpen(false)}>
                  <Button variant="gold" className="w-full">Cadastrar</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
