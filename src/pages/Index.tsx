import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import logo from '@/assets/azd-logo.png';
import { useAuth } from '@/contexts/AuthContext';



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
        <Link to="/register">
          <motion.div whileHover={{ scale: 1.08, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
            <Button variant="gold" size="lg">Faça parte da comunidade</Button>
          </motion.div>
        </Link>
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
        <Link to="/seasons">
          <motion.div whileHover={{ scale: 1.08, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
            <Button variant="gold" size="lg">Ver Seasons</Button>
          </motion.div>
        </Link>
        <Link to="/games">
          <motion.div whileHover={{ scale: 1.08, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
            <Button variant="outline" size="lg">Explorar Jogos</Button>
          </motion.div>
        </Link>
        <Link to="/players">
          <motion.div whileHover={{ scale: 1.08, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
            <Button variant="outline" size="lg">Conheça os Jogadores</Button>
          </motion.div>
        </Link>
      </motion.div>
    </section>
  </div>
);

const Index = () => {
  const { user } = useAuth();
  return user ? <LoggedInIndex /> : <LoggedOutIndex />;
};

export default Index;
