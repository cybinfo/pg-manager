"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Building2,
  CheckCircle,
  ArrowRight,
  Star,
  Gift,
  Zap,
  X,
  HelpCircle,
  MessageSquare
} from "lucide-react"

const plans = [
  {
    name: "Free Trial",
    description: "Full access for 3 months",
    price: 0,
    period: "3 months",
    highlight: "Start Here",
    highlightColor: "bg-amber-500",
    features: [
      { name: "Unlimited Properties", included: true },
      { name: "Unlimited Rooms", included: true },
      { name: "Unlimited Tenants", included: true },
      { name: "Billing & Payments", included: true },
      { name: "Meter Readings", included: true },
      { name: "Reports & Analytics", included: true },
      { name: "Your Own PG Website", included: true },
      { name: "Email & WhatsApp Reminders", included: true },
      { name: "Staff Management", included: true },
      { name: "Export Data", included: true },
      { name: "Priority Support", included: false },
    ],
    cta: "Start Free Trial",
    ctaVariant: "gradient" as const,
    popular: false
  },
  {
    name: "Free Forever",
    description: "Basic features, always free",
    price: 0,
    period: "forever",
    highlight: "After Trial",
    highlightColor: "bg-slate-500",
    features: [
      { name: "1 Property", included: true },
      { name: "10 Rooms", included: true },
      { name: "20 Active Tenants", included: true },
      { name: "Billing & Payments", included: true },
      { name: "Meter Readings", included: true },
      { name: "Basic Reports", included: true },
      { name: "Your Own PG Website", included: false },
      { name: "Email & WhatsApp Reminders", included: false },
      { name: "Staff Management", included: false },
      { name: "Export Data", included: false },
      { name: "Priority Support", included: false },
    ],
    cta: "Continue Free",
    ctaVariant: "outline" as const,
    popular: false,
    note: "No deactivated tenant data storage"
  },
  {
    name: "Pro",
    description: "For growing PG businesses",
    price: 499,
    period: "month",
    highlight: "Most Popular",
    highlightColor: "bg-teal-500",
    features: [
      { name: "3 Properties", included: true },
      { name: "50 Rooms", included: true },
      { name: "Unlimited Tenants", included: true },
      { name: "Billing & Payments", included: true },
      { name: "Meter Readings", included: true },
      { name: "Full Reports & Analytics", included: true },
      { name: "Your Own PG Website", included: true },
      { name: "Email & WhatsApp Reminders", included: true },
      { name: "Staff Management", included: true },
      { name: "Export Data", included: true },
      { name: "Priority Support", included: false },
    ],
    cta: "Start Pro Trial",
    ctaVariant: "gradient" as const,
    popular: true
  },
  {
    name: "Business",
    description: "For PG chains & enterprises",
    price: 999,
    period: "month",
    highlight: "Unlimited",
    highlightColor: "bg-violet-500",
    features: [
      { name: "Unlimited Properties", included: true },
      { name: "Unlimited Rooms", included: true },
      { name: "Unlimited Tenants", included: true },
      { name: "Billing & Payments", included: true },
      { name: "Meter Readings", included: true },
      { name: "Full Reports & Analytics", included: true },
      { name: "Your Own PG Website", included: true },
      { name: "Email & WhatsApp Reminders", included: true },
      { name: "Staff Management", included: true },
      { name: "Export Data", included: true },
      { name: "Priority Support", included: true },
    ],
    cta: "Contact Sales",
    ctaVariant: "outline" as const,
    popular: false
  }
]

const faqs = [
  {
    q: "What happens after the 3-month free trial?",
    a: "You can continue using ManageKar with our Free Forever plan (limited features) or upgrade to Pro/Business for full access. Your data is never deleted."
  },
  {
    q: "Can I upgrade or downgrade anytime?",
    a: "Yes! You can change your plan at any time. When upgrading, you get immediate access. When downgrading, changes apply at the next billing cycle."
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept UPI, credit/debit cards, net banking, and wallets. All payments are processed securely through Razorpay."
  },
  {
    q: "Is there a refund policy?",
    a: "Yes, we offer a 7-day money-back guarantee on all paid plans. If you're not satisfied, contact us for a full refund."
  },
  {
    q: "Do you offer discounts for yearly billing?",
    a: "Yes! Pay yearly and get 2 months free (20% discount). This applies to Pro and Business plans."
  },
  {
    q: "What's included in Priority Support?",
    a: "Priority Support includes faster response times (within 4 hours), dedicated WhatsApp support, and phone support during business hours."
  }
]

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  const getPrice = (basePrice: number) => {
    if (basePrice === 0) return 0
    return billingCycle === "yearly" ? Math.round(basePrice * 10) : basePrice
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass-nav border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-9 w-9 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/25 group-hover:shadow-xl group-hover:shadow-teal-500/30 transition-shadow">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              ManageKar
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/#products" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Products
            </Link>
            <Link href="/pricing" className="text-sm text-foreground font-medium">
              Pricing
            </Link>
            <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Help
            </Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link href="/register">
              <Button variant="gradient" size="sm">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-emerald-50" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl" />

        <div className="relative container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 text-sm font-medium mb-6 animate-fade-in-down">
            <Gift className="h-4 w-4" />
            3 Months Free - No Credit Card Required
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 animate-fade-in-up">
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Simple, Transparent
            </span>
            <span className="block text-foreground mt-2">
              Pricing
            </span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in-up animation-delay-100">
            Start free, upgrade when you&apos;re ready. No hidden fees. Cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-lg mb-12 animate-fade-in-up animation-delay-200">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === "monthly"
                  ? "bg-white shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === "yearly"
                  ? "bg-white shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-teal-600 font-semibold">Save 20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-4 -mt-8">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {plans.map((plan, i) => (
              <Card
                key={i}
                className={`relative overflow-hidden ${
                  plan.popular ? "border-2 border-teal-500 shadow-xl shadow-teal-500/10" : ""
                }`}
              >
                {/* Highlight Badge */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${plan.highlightColor}`} />

                <CardHeader className="text-center pb-2">
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${plan.highlightColor} text-white text-xs font-semibold mx-auto mb-3`}>
                    {plan.popular && <Star className="h-3 w-3" />}
                    {plan.highlight}
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      {plan.price === 0 ? "₹0" : `₹${getPrice(plan.price).toLocaleString("en-IN")}`}
                    </span>
                    <span className="text-muted-foreground">
                      /{plan.period === "forever" ? "forever" : billingCycle === "yearly" && plan.price > 0 ? "year" : plan.period}
                    </span>
                  </div>
                  {billingCycle === "yearly" && plan.price > 0 && (
                    <p className="text-sm text-teal-600 mt-1">
                      ₹{Math.round(getPrice(plan.price) / 12).toLocaleString("en-IN")}/month
                    </p>
                  )}
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <CheckCircle className="h-4 w-4 text-teal-500 shrink-0" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        )}
                        <span className={feature.included ? "" : "text-muted-foreground/50"}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {plan.note && (
                    <p className="text-xs text-muted-foreground mb-4 flex items-start gap-1">
                      <HelpCircle className="h-3 w-3 mt-0.5 shrink-0" />
                      {plan.note}
                    </p>
                  )}
                  <Link href={plan.name === "Business" ? "/contact" : "/register"}>
                    <Button
                      variant={plan.ctaVariant}
                      className="w-full"
                    >
                      {plan.cta}
                      {plan.name !== "Business" && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison Note */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <Card variant="highlight" className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shrink-0">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">All Plans Include</h3>
                <p className="text-muted-foreground">
                  Secure data storage, automatic backups, mobile-friendly interface, Indian Rupee support,
                  and regular feature updates. Your data belongs to you - export anytime.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-sky-100 to-blue-100 text-sky-700 text-sm font-medium mb-4">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <Card key={i} className="p-6">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-muted-foreground text-sm">{faq.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-teal-500 to-emerald-500">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Still Have Questions?
          </h2>
          <p className="text-teal-100 mb-8 text-lg">
            Our team is here to help. Reach out and we&apos;ll get back to you within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="xl" variant="secondary" className="shadow-lg">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="xl" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10 hover:text-white">
                <MessageSquare className="mr-2 h-5 w-5" />
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-foreground text-background">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <Building2 className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold">ManageKar</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/privacy" className="hover:text-background transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-background transition-colors">Terms</Link>
              <Link href="/contact" className="hover:text-background transition-colors">Contact</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ManageKar
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
