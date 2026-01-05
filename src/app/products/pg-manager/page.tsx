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
  IndianRupee,
  Globe,
  Gift,
  Play,
  Receipt,
  TrendingDown
} from "lucide-react"

const features = [
  {
    icon: Building2,
    title: "Multi-Property Management",
    description: "Manage multiple PGs from a single dashboard. Track rooms, beds, and occupancy across all properties with 2D architecture view.",
    color: "text-teal-600 bg-teal-50"
  },
  {
    icon: Users,
    title: "Complete Tenant Lifecycle",
    description: "Registration with document upload, notice period workflow, exit clearance with settlements. Automatic returning tenant detection.",
    color: "text-violet-600 bg-violet-50"
  },
  {
    icon: Shield,
    title: "Staff & Roles (RBAC)",
    description: "5 default roles + custom roles with 50+ granular permissions. Multi-role support, email invitations, property-level access control.",
    color: "text-cyan-600 bg-cyan-50"
  },
  {
    icon: Globe,
    title: "Your Own PG Website",
    description: "Auto-generate a public website for each property at managekar.com/pg/your-slug. Share with potential tenants.",
    color: "text-pink-600 bg-pink-50"
  },
  {
    icon: Gauge,
    title: "Meter Readings",
    description: "Track electricity, water, and gas meters. Auto-generate charges based on consumption with configurable rates and split methods.",
    color: "text-amber-600 bg-amber-50"
  },
  {
    icon: Receipt,
    title: "Smart Billing System",
    description: "Generate itemized bills with multiple charge types. Calendar month or check-in anniversary billing. Auto-generation on schedule.",
    color: "text-emerald-600 bg-emerald-50"
  },
  {
    icon: Bell,
    title: "Automated Notifications",
    description: "Email & WhatsApp payment reminders, receipts, and daily summaries. Professional formatting with property details.",
    color: "text-sky-600 bg-sky-50"
  },
  {
    icon: MessageSquare,
    title: "Approvals & Complaints",
    description: "Tenant issue reporting with approval workflow. Document uploads, profile change requests, and complaint tracking.",
    color: "text-rose-600 bg-rose-50"
  },
  {
    icon: FileText,
    title: "PDF & WhatsApp Receipts",
    description: "Professional rent receipts with property details, room info, and owner contact. Download, email, or share via WhatsApp.",
    color: "text-orange-600 bg-orange-50"
  },
  {
    icon: TrendingDown,
    title: "Expense Tracking",
    description: "Track all expenses by category and vendor. Configurable expense types. See where your money goes.",
    color: "text-indigo-600 bg-indigo-50"
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Revenue trends, occupancy rates, dues aging, collection efficiency. Multi-level grouping across all list pages.",
    color: "text-purple-600 bg-purple-50"
  },
  {
    icon: UserCheck,
    title: "Visitor Management",
    description: "Log visitor entries with multi-day overnight stays. Per-night charges with automatic bill creation for tenants.",
    color: "text-lime-600 bg-lime-50"
  }
]

const highlights = [
  { text: "3 Months Free", icon: Gift },
  { text: "No Credit Card", icon: Shield },
  { text: "Indian Rupee Support", icon: IndianRupee },
  { text: "Works on Mobile", icon: Smartphone },
  { text: "Your Own Website", icon: Globe },
  { text: "Instant Setup", icon: Zap },
]

const steps = [
  { step: "1", title: "Sign Up Free", desc: "Create your account in 30 seconds. No credit card needed." },
  { step: "2", title: "Add Your Property", desc: "Enter your PG details, rooms, and amenities." },
  { step: "3", title: "Start Managing", desc: "Add tenants, track payments, and grow your business." },
]

const templates = [
  { name: "Boys Hostel", desc: "Rent + Security + Mess", icon: "🏠" },
  { name: "Girls PG", desc: "Extra security features", icon: "🏡" },
  { name: "Working Professional", desc: "Rent + WiFi + Laundry", icon: "💼" },
  { name: "Student Hostel", desc: "Shared rooms + Meal tracking", icon: "🎓" },
]

const benefits = [
  "Daily/Monthly Billing",
  "Electricity Meter Tracking",
  "Food/Mess Management",
  "Security Deposit Handling",
  "WhatsApp Reminders",
  "UPI Payment Support",
  "PDF Receipts",
  "Your Own PG Website",
  "Staff with 50+ Permissions",
  "Email Invitations",
  "Multi-Role Support",
  "Property-Level Access"
]

export default function PGManagerPage() {
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
                Start Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-emerald-50" />
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-teal-100/50 to-transparent" />

        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            {/* Breadcrumb */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
              <Link href="/" className="hover:text-foreground transition-colors">ManageKar</Link>
              <span>/</span>
              <span className="text-foreground font-medium">PG Manager</span>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-teal-100 to-emerald-100 text-teal-700 text-sm font-medium mb-8 animate-fade-in-down">
              <Building2 className="h-4 w-4" />
              Complete PG & Hostel Management
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in-up">
              <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Everything You Need
              </span>
              <span className="block text-foreground mt-2">
                to Run Your PG
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-100">
              From tenant onboarding to exit clearance, manage your entire PG operation efficiently.
              Plus, get your own website to attract new tenants!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10 animate-fade-in-up animation-delay-200">
              <Link href="/register">
                <Button variant="gradient" size="xl">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="xl" variant="outline" className="border-2">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap justify-center gap-6 animate-fade-in-up animation-delay-300">
              {highlights.map((item, i) => (
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

      {/* Features Section */}
      <section className="py-20 md:py-28 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 text-sm font-medium mb-4">
              <Zap className="h-4 w-4" />
              12 Powerful Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              One App. Complete Control.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Every feature you need to run your PG professionally, all in one place.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} variant="interactive" className="group">
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
            {steps.map((item, i) => (
              <div key={i} className="text-center animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
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

      {/* Built for India Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 text-sm font-medium mb-4">
                <IndianRupee className="h-4 w-4" />
                Made for India
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Built for How Indian PGs Actually Work
              </h2>
              <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
                We understand that every PG is different. We don&apos;t force you into
                rigid templates — configure everything YOUR way. Daily billing? Monthly?
                Split by occupants? You decide.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {benefits.map((item, i) => (
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
                {templates.map((template, i) => (
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

      {/* Pricing Preview */}
      <section className="py-20 px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/20 text-amber-400 text-sm font-medium mb-4">
              <Gift className="h-4 w-4" />
              Special Launch Offer
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
              Start Free. Stay Free.
            </h2>
            <p className="text-slate-400 text-lg">
              3 months full access free. Then choose our generous free tier or upgrade.
            </p>
          </div>

          <Card className="border-2 border-teal-500/30 bg-slate-800/50 backdrop-blur">
            <CardHeader className="text-center pb-2">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-teal-500/20 text-teal-400 text-sm font-medium mx-auto mb-4">
                <Star className="h-4 w-4" />
                Free Trial
              </div>
              <CardTitle className="text-2xl text-white">3 Months Full Access</CardTitle>
              <div className="mt-4">
                <span className="text-5xl font-bold text-white">₹0</span>
                <span className="text-slate-400">/3 months</span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {[
                  "Unlimited Properties",
                  "Unlimited Rooms",
                  "Unlimited Tenants",
                  "Staff with 50+ Permissions",
                  "5 Default Roles + Custom",
                  "Email Invitation System",
                  "Meter Reading Tracking",
                  "Auto Monthly Billing",
                  "Complaint Handling",
                  "Visitor Logs",
                  "Reports & Analytics",
                  "Your Own PG Website"
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-300">
                    <CheckCircle className="h-5 w-5 text-teal-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/register" className="flex-1">
                  <Button variant="gradient" size="xl" className="w-full">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/pricing" className="flex-1">
                  <Button size="xl" variant="outline" className="w-full bg-transparent text-white border-slate-600 hover:bg-slate-700 hover:text-white">
                    View All Plans
                  </Button>
                </Link>
              </div>
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
            Join hundreds of PG owners who have streamlined their operations with ManageKar.
            Start free today, no credit card required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="xl" variant="secondary" className="shadow-lg">
                Create Free Account
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="xl" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10 hover:text-white">
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
              <p className="text-muted-foreground text-sm mb-3">
                Simple management software for Indian small businesses.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li><Link href="#" className="hover:text-background">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-background">Pricing</Link></li>
                <li><Link href="/register" className="hover:text-background">Get Started</Link></li>
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
