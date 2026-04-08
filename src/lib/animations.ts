import { useIsMobile } from "@/hooks/use-mobile";

export const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay },
});

export const hoverSpring = {
  whileHover: { scale: 1.08, y: -2 },
  whileTap: { scale: 0.97 },
  transition: { type: "spring", stiffness: 400, damping: 15 },
};

export const touchSpring = {
  whileTap: { scale: 0.97 },
  transition: { type: "spring", stiffness: 400, damping: 15 },
};

export const useMotionProps = () => {
  const isMobile = useIsMobile();
  return isMobile ? touchSpring : hoverSpring;
};
