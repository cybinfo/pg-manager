import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Building2,
  ArrowRight,
  Zap,
  Smartphone,
  CheckCircle,
  Star,
  IndianRupee,
  Globe,
  Rocket,
  Store,
  Home,
  Building,
  Sparkles,
  MessageSquare,
  Shield,
  Clock,
  Users,
  Gift
} from "lucide-react"

const products = [
  {
    name: "PG Manager",
    tagline: "For PGs & Hostels",
    description: "Complete management for Paying Guest accommodations and hostels. Tenants, rooms, billing, meter readings & more.",
    icon: Building2,
    color: "from-teal-500 to-emerald-500",
    bgColor: "bg-teal-50",
    textColor: "text-teal-600",
    status: "live",
    href: "/products/pg-manager",
    features: ["Tenant Management", "Billing & Payments", "Meter Readings", "Your Own Website"]
  },
  {
    name: "Shop Manager",
    tagline: "For Retail & Kirana",
    description: "Inventory tracking, billing, customer management, and GST compliance for your retail business.",
    icon: Store,
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-violet-50",
    textColor: "text-violet-600",
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
    textColor: "text-amber-600",
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
    textColor: "text-sky-600",
    status: "coming",
    href: "#",
    features: ["Maintenance Billing", "Complaint Portal", "Visitor Logs", "Society Accounting"]
  },
]

const whyManageKar = [
  {
    icon: IndianRupee,
    title: "Built for India",
    description: "UPI payments, WhatsApp reminders, Hindi-friendly. Designed for how Indian businesses actually work."
  },
  {
    icon: Gift,
    title: "Free to Start",
    description: "3 months full access free. Then a generous free tier forever. Fair pricing when you're ready to scale."
  },
  {
    icon: Smartphone,
    title: "Mobile-First",
    description: "Works beautifully on your phone. Manage your business from anywhere, anytime."
  },
  {
    icon: Zap,
    title: "No Tech Skills Needed",
    description: "Simple, clean interface. If you can use WhatsApp, you can use ManageKar."
  }
]

const stats = [
  { value: "500+", label: "Businesses Trust Us" },
  { value: "10,000+", label: "Customers Managed" },
  { value: "₹2Cr+", label: "Transactions Tracked" },
  { value: "99.9%", label: "Uptime Guaranteed" },
]

export default function HomePage() {
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
            <Link href="#products" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Products
            </Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-emerald-50" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-100/40 via-transparent to-transparent" />

        {/* Animated shapes */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl animate-pulse-soft animation-delay-500" />

        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-teal-100 to-emerald-100 text-teal-700 text-sm font-medium mb-8 animate-fade-in-down shadow-sm">
              <Sparkles className="h-4 w-4" />
              Simple Software for Indian Small Businesses
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up">
              <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                One Platform.
              </span>
              <span className="block text-foreground mt-2">
                Multiple Solutions.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto leading-relaxed animate-fade-in-up animation-delay-100">
              ManageKar helps Indian small businesses go from <strong className="text-foreground">chaos to clarity</strong> with simple, powerful software.
            </p>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in-up animation-delay-200">
              Start with <span className="font-semibold text-teal-600">PG Manager</span> today —
              <span className="text-amber-600 font-semibold"> 3 months completely free!</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in-up animation-delay-300">
              <Link href="/register">
                <Button variant="gradient" size="xl" className="w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#products">
                <Button size="xl" variant="outline" className="w-full sm:w-auto border-2">
                  Explore Products
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center gap-6 animate-fade-in-up animation-delay-400">
              {[
                { icon: Gift, text: "3 Months Free" },
                { icon: Shield, text: "No Credit Card" },
                { icon: IndianRupee, text: "Made for India" },
                { icon: Smartphone, text: "Works on Mobile" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center">
                    <item.icon className="h-3.5 w-3.5 text-teal-600" />
                  </div>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gradient-to-r from-teal-500 to-emerald-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjLTIgMC00IDItNCAyczIgNCA0IDRjMiAwIDQtMiA0LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center text-white animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="text-3xl md:text-4xl font-bold mb-1 tabular-nums">{stat.value}</div>
                <div className="text-teal-100 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-20 md:py-28 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 text-sm font-medium mb-4">
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
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-semibold">
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                      Live Now
                    </span>
                  </div>
                )}
                {product.status === "coming" && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
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

      {/* Why ManageKar Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 text-sm font-medium mb-4">
              <Star className="h-4 w-4" />
              Why Choose Us
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Why ManageKar?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              We understand the unique challenges of running a small business in India.
              ManageKar is built specifically for you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {whyManageKar.map((item, i) => (
              <Card key={i} variant="interactive" className="text-center p-6">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/25">
                  <item.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section (Placeholder) */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 text-sm font-medium mb-4">
              <Users className="h-4 w-4" />
              Success Stories
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Trusted by Business Owners
            </h2>
          </div>

          <Card variant="elevated" className="p-8 md:p-12 text-center">
            <div className="flex justify-center mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-6 w-6 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <blockquote className="text-xl md:text-2xl text-muted-foreground mb-6 leading-relaxed">
              &quot;ManageKar ne mera kaam bahut aasan kar diya. Pehle sab kuch notebook mein likhta tha,
              ab phone se hi sab manage ho jaata hai. Tenant, payment, meter reading - sab ek jagah!&quot;
            </blockquote>
            <div className="flex items-center justify-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-semibold">
                RS
              </div>
              <div className="text-left">
                <p className="font-semibold">Rajesh Singh</p>
                <p className="text-sm text-muted-foreground">PG Owner, Delhi</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="container mx-auto text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium mb-6">
            <Gift className="h-4 w-4" />
            Limited Time Offer
          </div>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            3 Months Free. No Strings Attached.
          </h2>
          <p className="text-slate-400 mb-8 text-lg leading-relaxed">
            Get full access to all features for 3 months absolutely free.
            No credit card required. After that, choose our generous free tier
            or upgrade to Pro starting at just ₹499/month.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button variant="gradient" size="xl">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="xl" variant="outline" className="bg-transparent text-white border-white/30 hover:bg-white/10 hover:text-white">
                View Pricing Details
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <Card variant="elevated" className="overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-8 md:p-12 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Simplify Your Business?
              </h2>
              <p className="text-teal-100 mb-8 text-lg max-w-2xl mx-auto">
                Join hundreds of business owners who have streamlined their operations with ManageKar.
                Start your free trial today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/register">
                  <Button size="xl" variant="secondary" className="shadow-lg">
                    Create Free Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="xl" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10 hover:text-white">
                    <MessageSquare className="mr-2 h-5 w-5" />
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-foreground text-background">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-9 w-9 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">ManageKar</span>
              </div>
              <p className="text-muted-foreground text-sm mb-3">
                Simple management software for Indian small businesses.
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-teal-500/20 text-teal-400 rounded">PG Manager</span>
                <span className="px-2 py-1 bg-slate-700 text-slate-400 rounded">Shop Manager</span>
                <span className="px-2 py-1 bg-slate-700 text-slate-400 rounded">Rent Manager</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><Link href="/products/pg-manager" className="hover:text-background transition-colors">PG Manager</Link></li>
                <li><span className="opacity-50">Shop Manager (Coming)</span></li>
                <li><span className="opacity-50">Rent Manager (Coming)</span></li>
                <li><span className="opacity-50">Society Manager (Coming)</span></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><Link href="/contact" className="hover:text-background transition-colors">Contact Us</Link></li>
                <li><Link href="/help" className="hover:text-background transition-colors">Help Center</Link></li>
                <li><Link href="/pricing" className="hover:text-background transition-colors">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><Link href="/privacy" className="hover:text-background transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-background transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-muted-foreground/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} ManageKar. Made with ❤️ in India.
            </p>
            <p className="text-sm text-muted-foreground">
              Built by <a href="https://github.com/cybinfo" className="hover:text-background underline">Rajat Seth</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
