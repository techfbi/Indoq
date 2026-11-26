import type { Metadata } from "next";
import { brand } from "@/config/brand";
import Bento from "@/components/landing/Bento";
import FinalCta from "@/components/landing/FinalCta";
import FormatStrip from "@/components/landing/FormatStrip";
import Foundation from "@/components/landing/Foundation";
import Hero from "@/components/landing/Hero";
import LandingNav from "@/components/landing/LandingNav";
import Pipeline from "@/components/landing/Pipeline";
import ProblemCard from "@/components/landing/ProblemCard";
import Starfield from "@/components/landing/Starfield";
import "@/components/landing/landing.css";

export const metadata: Metadata = {
  title: brand.name,
  description: brand.description,
  openGraph: {
    title: brand.name,
    description: brand.description,
  },
};

/*
  Structured data so search engines understand what the product is.
  Built from the brand config, so a rename needs no change here.
  "<" is escaped so the JSON can never close the script tag early.
*/
const structuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: brand.name,
  description: brand.description,
  url: brand.url,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
}).replace(/</g, "\\u003c");

/*
  The landing page, always dark. Sections follow the reference video:
  hero with product view, file types, the problem, the pipeline, the
  capabilities grid, the foundation cards, and a closing call to action.
*/
const LandingPage = () => (
  <main className="landing relative min-h-screen overflow-x-clip">
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: structuredData }}
    />

    <Starfield />

    {/* Light beams behind the hero */}
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[1100px] overflow-hidden">
      <div className="landing-beam" />
      <div className="landing-streak" />
    </div>

    <div className="relative px-4 pt-4">
      <LandingNav />
    </div>
    <div className="relative">
      <Hero />
      <FormatStrip />
      <ProblemCard />
      <Pipeline />
      <Bento />
      <Foundation />
      <FinalCta />
    </div>
  </main>
);

export default LandingPage;
