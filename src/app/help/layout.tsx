import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Help Center - FAQ & Support | ManageKar",
  description: "Find answers to common questions about ManageKar. Get help with PG management, billing, tenant portal, staff roles and more.",
  openGraph: {
    title: "Help Center - FAQ & Support | ManageKar",
    description: "Find answers to common questions about ManageKar. Get help with PG management, billing, tenant portal, staff roles and more.",
    url: "https://managekar.com/help",
    siteName: "ManageKar",
    type: "website",
  },
}

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
