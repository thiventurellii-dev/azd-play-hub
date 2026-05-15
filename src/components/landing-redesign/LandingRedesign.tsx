import { NavRedesign } from "./NavRedesign";
import { HeroRedesign } from "./HeroRedesign";
import { StatsRedesign } from "./StatsRedesign";
import { HowItWorks } from "./HowItWorks";
import { FeaturesBento } from "./FeaturesBento";
import { PopularGames } from "./PopularGames";
import { Compare } from "./Compare";
import { TestimonialsRedesign } from "./TestimonialsRedesign";
import { FinalCTARedesign } from "./FinalCTARedesign";
import { FooterRedesign } from "./FooterRedesign";

export const LandingRedesign = () => (
  <div className="lr-root min-h-screen">
    <NavRedesign />
    <main>
      <HeroRedesign />
      <StatsRedesign />
      <HowItWorks />
      <FeaturesBento />
      <PopularGames />
      <Compare />
      <TestimonialsRedesign />
      <FinalCTARedesign />
    </main>
    <FooterRedesign />
  </div>
);
