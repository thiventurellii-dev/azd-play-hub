import Navbar from './Navbar';

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main>{children}</main>
  </div>
);

export default Layout;
