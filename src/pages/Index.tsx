import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Zap, Gamepad2 } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '@/assets/azd-logo.png';

const features = [
  { icon: Gamepad2, title: 'Jogos', desc: 'Biblioteca completa de board games com regras e vídeos explicativos.' },
  { icon: Calendar, title: 'Seasons', desc: 'Competições por temporadas com rankings independentes e jogos selecionados.' },
  { icon: Users, title: 'Comunidade', desc: 'Perfis de jogadores, histórico de partidas e estatísticas detalhadas.' },
  { icon: Zap, title: 'MMR', desc: 'Sistema de MMR, adaptado para board games com múltiplos jogadores.' },
];

const Index = () => (
  <div className="min-h-screen">
    {/* Hero */}
    <section className="relative flex flex-col items-center justify-center px-4 py-32 text-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gold/5 via-transparent to-transparent" />
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} className="relative">
        <img src={logo} alt="AzD" className="h-32 w-32 mx-auto mb-8 drop-shadow-[0_0_30px_hsl(43,100%,50%,0.3)]" />
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative text-5xl md:text-7xl font-black tracking-tight">
        Ami<span className="text-gold">z</span>ade
      </motion.h1>
      <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative mt-4 max-w-lg text-lg text-muted-foreground">
        A comunidade definitiva de board games. Rankings competitivos, seasons emocionantes e muito mais.
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="relative mt-8 flex gap-4">
        <Link to="/register"><Button variant="gold" size="lg">Começar agora</Button></Link>
        <Link to="/seasons"><Button variant="outline" size="lg">Ver Seasons</Button></Link>
      </motion.div>
    </section>

    {/* Features */}
    <section className="container py-20">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="rounded-xl border border-border bg-card p-6 hover:border-gold/30 hover:glow-gold transition-all duration-300"
          >
            <f.icon className="h-8 w-8 text-gold mb-4" />
            <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  </div>
);

export default Index;
