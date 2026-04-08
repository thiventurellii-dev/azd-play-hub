import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    'import.meta.env.VITE_EXTERNAL_SUPABASE_URL': JSON.stringify("https://npinawelxdtsrcvzzvvs.supabase.co"),
    'import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY': JSON.stringify("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5waW5hd2VseGR0c3Jjdnp6dnZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODE0MTAsImV4cCI6MjA5MTE1NzQxMH0.S5xC9w11LiS1LuyAusr3vhxX-eR-yxXMcrGP0k8tAx0"),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
