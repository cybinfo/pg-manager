import type { Metadata } from "next"
import { PublicNav, PublicFooter } from "@/components/public"
import {
  HeroSection,
  StatsSection,
  ProductsSection,
  WhySection,
  TrustedBySection,
  TestimonialsSection,
  PricingTeaserSection,
  CTASection,
} from "./(home)/_sections"

export const metadata: Metadata = {
  title: "ManageKar — Simple Software for Indian Small Businesses",
  description:
    "ManageKar helps PG owners, hostel managers, and library operators go from chaos to clarity with simple, powerful software. Start free today.",
  openGraph: {
    title: "ManageKar — Simple Software for Indian Small Businesses",
    description:
      "Complete management for PGs, hostels, and study libraries. Tenants, billing, staff roles, and more.",
    url: "https://managekar.com",
    siteName: "ManageKar",
    type: "website",
  },
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <HeroSection />
      <StatsSection />
      <ProductsSection />
      <WhySection />
      <TrustedBySection />
      <TestimonialsSection />
      <PricingTeaserSection />
      <CTASection />
      <PublicFooter />
    </div>
  )
}
