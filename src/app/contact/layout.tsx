import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact Us - Get in Touch | ManageKar",
  description: "Have questions about ManageKar? Contact our support team via email, phone or WhatsApp. We respond within 24 hours.",
  openGraph: {
    title: "Contact Us - Get in Touch | ManageKar",
    description: "Have questions about ManageKar? Contact our support team via email, phone or WhatsApp. We respond within 24 hours.",
    url: "https://managekar.com/contact",
    siteName: "ManageKar",
    type: "website",
  },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
