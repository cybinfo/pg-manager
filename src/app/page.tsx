import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Building2,
  Users,
  CreditCard,
  BarChart3,
  Shield,
  Smartphone,
  CheckCircle,
  ArrowRight,
  Zap,
  Gauge,
  Bell,
  MessageSquare,
  UserCheck,
  FileText,
  Star,
  IndianRupee
} from "lucide-react"

const features = [
  {
    icon: Building2,
    title: "Multi-Property Management",
    description: "Manage multiple PGs from a single dashboard. Track rooms, beds, and occupancy across all properties.",
    color: "text-teal-600 bg-teal-50"
  },
  {
    icon: Users,
    title: "Tenant Management",
    description: "Complete tenant lifecycle - registration, documents, room assignment, and exit clearance.",
    color: "text-violet-600 bg-violet-50"
  },
  {
    icon: Gauge,
    title: "Meter Readings",
    description: "Track electricity, water, and gas meters. Auto-generate charges based on consumption.",
    color: "text-amber-600 bg-amber-50"
  },
  {
    icon: CreditCard,
    title: "Flexible Billing",
    description: "Configure rent, security, electricity, food, and custom charges. Daily, monthly, or meter-based.",
    color: "text-emerald-600 bg-emerald-50"
  },
  {
    icon: Bell,
    title: "Notices & Alerts",
    description: "Send announcements to all tenants. Automated payment reminders via SMS and WhatsApp.",
    color: "text-sky-600 bg-sky-50"
  },
  {
    icon: MessageSquare,
    title: "Complaint Management",
    description: "Tenants can raise complaints. Track resolution status and response times.",
    color: "text-rose-600 bg-rose-50"
  },
  {
    icon: UserCheck,
    title: "Visitor Management",
    description: "Log visitor entries with time, purpose, and tenant reference. Security made easy.",
    color: "text-indigo-600 bg-indigo-50"
  },
  {
    icon: FileText,
    title: "Exit Clearance",
    description: "Automated checkout process. Clear dues, deposits, and generate final settlement.",
    color: "text-orange-600 bg-orange-50"
  },
  {
    icon: Shield,
    title: "Staff & Roles",
    description: "Add staff with custom roles. Control who can access what with granular permissions.",
    color: "text-cyan-600 bg-cyan-50"
  }
]

const highlights = [
  { text: "100% Free Forever", icon: Star },
  { text: "No Credit Card Required", icon: CreditCard },
  { text: "Indian Rupee Support", icon: IndianRupee },
  { text: "Works on Mobile", icon: Smartphone },
  { text: "Tenant Self-Service", icon: Users },
  { text: "Instant Setup", icon: Zap },
]

const stats = [
  { value: "500+", label: "PGs Managed" },
  { value: "10,000+", label: "Tenants Tracked" },
  { value: "₹2Cr+", label: "Rent Collected" },
  { value: "4.9/5", label: "User Rating" },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
              ManageKar
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Login</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-emerald-50" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-teal-100/50 to-transparent" />

        <div className="relative container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-medium mb-8">
              <Zap className="h-4 w-4" />
              India&apos;s Smartest PG Management Software
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                ManageKar
              </span>
              <span className="block text-foreground mt-2">
                Manage Karo, Tension Chhodo!
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Free forever. Built for Indian PGs. Manage tenants, billing, complaints,
              meter readings, and more — all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/register">
                <Button size="lg" className="h-14 px-8 text-lg bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 shadow-lg shadow-teal-500/25">
                  Start Free Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-2">
                  Explore Features
                </Button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center gap-6">
              {highlights.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-6 w-6 rounded-full bg-teal-100 flex items-center justify-center">
                    <item.icon className="h-3 w-3 text-teal-600" />
                  </div>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gradient-to-r from-teal-500 to-emerald-500">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center text-white">
                <div className="text-3xl md:text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-teal-100 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-medium mb-4">
              <BarChart3 className="h-4 w-4" />
              Powerful Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Run Your PG
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              From tenant onboarding to exit clearance, manage your entire PG operation efficiently.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-sm bg-card">
                <CardHeader>
                  <div className={`h-12 w-12 rounded-xl ${feature.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Get Started in 3 Simple Steps
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              No complex setup. No training required. Start managing your PG in minutes.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Sign Up Free", desc: "Create your account in 30 seconds. No credit card needed." },
              { step: "2", title: "Add Your Property", desc: "Enter your PG details, rooms, and amenities." },
              { step: "3", title: "Start Managing", desc: "Add tenants, track payments, and grow your business." },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-500/25">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-700 text-sm font-medium mb-4">
                <IndianRupee className="h-4 w-4" />
                Made for India
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Built for How Indian PGs Actually Work
              </h2>
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                We understand every PG is different. Some charge daily, some monthly.
                Some include food, some don&apos;t. Some split electricity by occupants,
                others charge flat. Configure it YOUR way.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  "Daily/Monthly Billing",
                  "Electricity Meter Tracking",
                  "Food/Mess Management",
                  "Security Deposit Handling",
                  "WhatsApp Reminders",
                  "UPI Payment Support",
                  "Hindi Language Support",
                  "GST Invoice Generation"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-teal-500 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-8 border border-teal-100">
              <h3 className="font-semibold text-lg mb-6">Quick Setup Templates</h3>
              <div className="space-y-4">
                {[
                  { name: "Boys Hostel", desc: "Rent + Security + Mess", icon: "🏠" },
                  { name: "Girls PG", desc: "Extra security features", icon: "🏡" },
                  { name: "Working Professional", desc: "Rent + WiFi + Laundry", icon: "💼" },
                  { name: "Student Hostel", desc: "Shared rooms + Meal tracking", icon: "🎓" },
                ].map((template, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <span className="font-medium block">{template.name}</span>
                        <span className="text-sm text-muted-foreground">{template.desc}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple Pricing: Free Forever
            </h2>
            <p className="text-muted-foreground text-lg">
              No hidden charges. No premium tiers. Just use it.
            </p>
          </div>

          <Card className="border-2 border-teal-200 shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-teal-100 text-teal-700 text-sm font-medium mx-auto mb-4">
                <Star className="h-4 w-4" />
                Most Popular
              </div>
              <CardTitle className="text-2xl">Free Plan</CardTitle>
              <div className="mt-4">
                <span className="text-5xl font-bold">₹0</span>
                <span className="text-muted-foreground">/forever</span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {[
                  "Unlimited Properties",
                  "Unlimited Rooms",
                  "Unlimited Tenants",
                  "Meter Reading Tracking",
                  "Payment Management",
                  "Complaint Handling",
                  "Visitor Logs",
                  "Staff Management",
                  "Reports & Analytics",
                  "Mobile App (PWA)",
                  "Email Support",
                  "Regular Updates"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-teal-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/register" className="block">
                <Button size="lg" className="w-full h-14 text-lg bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-teal-500 to-emerald-500">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
            Ready to Simplify Your PG Management?
          </h2>
          <p className="text-teal-100 mb-8 text-lg">
            Join thousands of PG owners who have streamlined their operations with ManageKar.
            Start free today, no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="h-14 px-8 text-lg shadow-lg">
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg bg-transparent text-white border-white hover:bg-white/10">
                Sign In
              </Button>
            </Link>
          </div>
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
              <p className="text-muted-foreground text-sm mb-2">
                &quot;Manage Karo&quot; - Management solutions for Indian businesses.
              </p>
              <p className="text-muted-foreground text-xs">
                PG Manager is our first product. More coming soon!
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><Link href="#features" className="hover:text-background">Features</Link></li>
                <li><Link href="/register" className="hover:text-background">Get Started</Link></li>
                <li><Link href="/login" className="hover:text-background">Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><Link href="/contact" className="hover:text-background">Contact Us</Link></li>
                <li><Link href="/help" className="hover:text-background">Help Center</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><Link href="/privacy" className="hover:text-background">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-background">Terms of Service</Link></li>
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
