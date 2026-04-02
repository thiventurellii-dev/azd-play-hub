import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Zap, Gamepad2 } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '@/assets/azd-logo.png';
import { useAuth } from '@/contexts/AuthContext';

const features = [
  { icon: Gamepad2, title: 'Jogos', desc: 'Biblioteca completa de board games com regras e vídeos explicativos.', link: '/games' },
  { icon: Calendar, title: 'Seasons', desc: 'Competições por temporadas com rankings independentes e jogos selecionados.', link: '/seasons' },
  { icon: Users, title: 'Comunidade', desc: 'Perfis de jogadores, histórico de partidas e estatísticas detalhadas.', link: '/players' },
  { icon: Zap, title: 'MMR', desc: 'Sistema de MMR, adaptado para board games com múltiplos jogadores.', link: '/seasons' },
];

const DiscordIcon = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z"/></svg>
);

const LoggedOutIndex = () => (
  <div className="min-h-screen">
    <section className="relative flex flex-col items-center justify-center px-4 py-32 text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent" />
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative">
        <img src={logo} alt="AzD" className="h-32 w-32 mx-auto mb-8 drop-shadow-[0_0_30px_hsl(43,100%,50%,0.3)]" />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative text-5xl md:text-7xl font-black tracking-tight">
        Ami<span className="text-gold">z</span>ade
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative mt-4 max-w-lg text-lg text-muted-foreground">
        Mais do que jogos, construímos amizades. Seasons competitivas com premiações, rankings e muita diversão na mesa.
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="relative mt-8 flex flex-wrap justify-center gap-4">
        <Link to="/register"><Button variant="gold" size="lg">Faça parte da comunidade</Button></Link>
      </motion.div>
    </section>
  </div>
);

const LoggedInIndex = () => (
  <div className="min-h-screen">
    <section className="relative flex flex-col items-center justify-center px-4 py-32 text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent" />
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative">
        <img src={logo} alt="AzD" className="h-32 w-32 mx-auto mb-8 drop-shadow-[0_0_30px_hsl(43,100%,50%,0.3)]" />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative text-5xl md:text-7xl font-black tracking-tight">
        Ami<span className="text-gold">z</span>ade
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative mt-4 max-w-lg text-lg text-muted-foreground">
        Mais do que jogos, construímos amizades. Seasons competitivas com premiações, rankings e muita diversão na mesa.
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="relative mt-8 flex flex-wrap justify-center gap-4">
        <Link to="/seasons"><Button variant="gold" size="lg">Ver Seasons</Button></Link>
        <Link to="/games"><Button variant="outline" size="lg">Explorar Jogos</Button></Link>
        <a href="https://discord.gg/6UpSEaSdj" target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="lg" className="gap-2">
            <DiscordIcon size={20} />
            Discord
          </Button>
        </a>
      </motion.div>
    </section>

    {/* Features */}
    <section className="container py-20">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <Link key={f.title} to={f.link}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 hover:border-gold/30 hover:glow-gold transition-all duration-300 cursor-pointer h-full"
            >
              <f.icon className="h-8 w-8 text-gold mb-4" />
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          </Link>
        ))}
      </div>
    </section>
  </div>
);

const Index = () => {
  const { user } = useAuth();
  return user ? <LoggedInIndex /> : <LoggedOutIndex />;
};

export default Index;
