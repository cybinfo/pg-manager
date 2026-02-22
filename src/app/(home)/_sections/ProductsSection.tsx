import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Building2,
  ArrowRight,
  CheckCircle,
  Rocket,
  Store,
  Home,
  Building,
  Clock,
} from "lucide-react"

const products = [
  {
    name: "PG Manager",
    tagline: "For PGs & Hostels",
    description: "Complete management for Paying Guest accommodations and hostels. Tenants, rooms, billing, staff roles with 50+ permissions & more.",
    icon: Building2,
    color: "from-teal-500 to-emerald-500",
    bgColor: "bg-teal-50",
    textColor: "text-teal-600 dark:text-teal-400",
    status: "live",
    href: "/products/pg-manager",
    features: ["Tenant Management", "Smart Billing", "Staff & Roles (RBAC)", "Your Own Website"]
  },
  {
    name: "Shop Manager",
    tagline: "For Retail & Kirana",
    description: "Inventory tracking, billing, customer management, and GST compliance for your retail business.",
    icon: Store,
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-50",
    textColor: "text-violet-600 dark:text-violet-400",
    status: "coming",
    href: "#",
    features: ["Inventory Tracking", "GST Billing", "Customer Ledger", "Staff Management"]
  },
  {
    name: "Rent Manager",
    tagline: "For Landlords",
    description: "Manage rental properties, track rent payments, handle maintenance requests, and generate agreements.",
    icon: Home,
    color: "from-amber-500 to-orange-500",
    bgColor: "bg-amber-50",
    textColor: "text-amber-600 dark:text-amber-400",
    status: "coming",
    href: "#",
    features: ["Rent Collection", "Tenant Screening", "Maintenance Tracking", "Agreement Generator"]
  },
  {
    name: "Society Manager",
    tagline: "For Apartments",
    description: "Complete solution for housing societies - maintenance billing, complaints, visitor management & accounting.",
    icon: Building,
    color: "from-sky-500 to-blue-500",
    bgColor: "bg-sky-50",
    textColor: "text-sky-600 dark:text-sky-400",
    status: "coming",
    href: "#",
    features: ["Maintenance Billing", "Complaint Portal", "Visitor Logs", "Society Accounting"]
  },
]

export function ProductsSection() {
  return (
    <section id="products" className="py-20 md:py-28 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-100 to-purple-100 dark:from-violet-900 dark:to-purple-900 text-violet-700 dark:text-violet-300 text-sm font-medium mb-4">
            <Rocket className="h-4 w-4" />
            Our Products
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            Solutions for Every Business
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            We&apos;re building simple management tools for Indian small businesses.
            Start with PG Manager today, more products coming soon.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto stagger-children">
          {products.map((product, i) => (
            <Card
              key={i}
              variant={product.status === "live" ? "interactive" : "default"}
              className={`relative overflow-hidden ${product.status === "coming" ? "opacity-75" : ""}`}
            >
              {product.status === "live" && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    Live Now
                  </span>
                </div>
              )}
              {product.status === "coming" && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                    <Clock className="h-3 w-3" />
                    Coming Soon
                  </span>
                </div>
              )}

              <CardHeader className="pb-2">
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${product.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <product.icon className="h-7 w-7 text-white" />
                </div>
                <div className="flex items-center gap-3 mb-1">
                  <CardTitle className="text-2xl">{product.name}</CardTitle>
                </div>
                <p className={`text-sm font-medium ${product.textColor}`}>{product.tagline}</p>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed mb-4">
                  {product.description}
                </CardDescription>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {product.features.map((feature, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className={`h-4 w-4 ${product.textColor}`} />
                      {feature}
                    </div>
                  ))}
                </div>
                {product.status === "live" ? (
                  <Link href={product.href}>
                    <Button variant="gradient" className="w-full">
                      Explore {product.name}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="secondary" className="w-full" disabled>
                    Notify Me When Available
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
