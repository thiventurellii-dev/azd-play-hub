import { useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";

const PUBLIC_ROUTES = ["/", "/login", "/register", "/complete-profile", "/about"];

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profileCompleted } = useAuth();
  const location = useLocation();

  if (!loading && user && !profileCompleted && !PUBLIC_ROUTES.includes(location.pathname)) {
    return <Navigate to="/complete-profile" replace />;
  }

  const hideNavbar = location.pathname === "/complete-profile";

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {!hideNavbar && <Navbar />}
      <main className={`flex-1 ${!hideNavbar ? "pt-16" : ""} ${user && !hideNavbar ? "pb-16 md:pb-0" : ""}`}>{children}</main>
      {!hideNavbar && <Footer />}
      {!hideNavbar && user && <BottomNav />}
    </div>
  );
};

const Footer = () => (
  <footer className="border-t border-border bg-background py-6 hidden md:block">
    <p className="text-center text-xs text-muted-foreground">© 2026 AzD - feito com amizade.</p>
  </footer>
);

export default Layout;
