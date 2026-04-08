import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, Apple, Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToPush, isPushSupported } from "@/lib/pushNotifications";
import { toast } from "sonner";
import { fadeUp } from "@/lib/animations";

const Install = () => {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success("App instalado com sucesso!");
      }
      setDeferredPrompt(null);
    }
  };

  const handleEnablePush = async () => {
    if (!user) {
      toast.error("Faça login para ativar notificações");
      return;
    }
    const ok = await subscribeToPush(user.id);
    if (ok) {
      toast.success("Notificações push ativadas!");
    } else {
      toast.error("Não foi possível ativar notificações push");
    }
  };

  return (
    <div className="container py-8 max-w-2xl mx-auto space-y-8">
      <motion.div {...fadeUp}>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Instalar <span className="text-gold">AzD</span>
        </h1>
        <p className="text-muted-foreground">
          Instale o app no seu celular para acesso rápido e receba notificações push.
        </p>
      </motion.div>

      {/* Install button (Android/desktop) */}
      {deferredPrompt && (
        <motion.div {...fadeUp}>
          <Card className="border-gold/30 bg-gold/5">
            <CardContent className="p-6 flex items-center gap-4">
              <Download className="h-8 w-8 text-gold flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold">Instalar agora</h3>
                <p className="text-sm text-muted-foreground">Adicione à tela inicial com um toque.</p>
              </div>
              <Button onClick={handleInstallClick} className="bg-gold text-black hover:bg-gold/90">
                Instalar
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Android instructions */}
      <motion.div {...fadeUp}>
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Chrome className="h-6 w-6 text-green-500" />
              <h3 className="font-semibold text-lg">Android (Chrome)</h3>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Abra o site no <strong>Chrome</strong></li>
              <li>Toque no menu <strong>⋮</strong> (três pontos) no canto superior direito</li>
              <li>Selecione <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar app"</strong></li>
              <li>Confirme tocando em <strong>"Instalar"</strong></li>
            </ol>
          </CardContent>
        </Card>
      </motion.div>

      {/* iOS instructions */}
      <motion.div {...fadeUp}>
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-3">
              <Apple className="h-6 w-6 text-foreground" />
              <h3 className="font-semibold text-lg">iPhone (Safari)</h3>
            </div>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Abra o site no <strong>Safari</strong> (obrigatório)</li>
              <li>Toque no botão de <strong>Compartilhar</strong> (ícone ↑)</li>
              <li>Role e selecione <strong>"Adicionar à Tela de Início"</strong></li>
              <li>Toque em <strong>"Adicionar"</strong></li>
            </ol>
            <p className="text-xs text-muted-foreground/70">
              ⚠️ Push notifications no iPhone requerem iOS 16.4+ e Safari.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Push notifications */}
      {isPushSupported() && user && (
        <motion.div {...fadeUp}>
          <Card className="border-gold/30">
            <CardContent className="p-6 flex items-center gap-4">
              <Smartphone className="h-8 w-8 text-gold flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold">Notificações Push</h3>
                <p className="text-sm text-muted-foreground">
                  Receba alertas de partidas e convites no celular.
                </p>
              </div>
              <Button variant="outline" onClick={handleEnablePush}>
                Ativar
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default Install;
