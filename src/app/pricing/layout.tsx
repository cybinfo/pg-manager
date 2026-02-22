import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Pricing - Simple & Transparent Plans | ManageKar",
  description: "Start free for 3 months, then choose from our affordable plans. No hidden fees. Cancel anytime. Plans starting at just Rs 499/month.",
  openGraph: {
    title: "Pricing - Simple & Transparent Plans | ManageKar",
    description: "Start free for 3 months, then choose from our affordable plans. No hidden fees. Cancel anytime.",
    url: "https://managekar.com/pricing",
    siteName: "ManageKar",
    type: "website",
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
