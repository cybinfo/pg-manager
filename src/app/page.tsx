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
  ArrowRight
} from "lucide-react"

const features = [
  {
    icon: Building2,
    title: "Multi-Property Management",
    description: "Manage multiple PGs from a single dashboard. Track rooms, beds, and occupancy across all properties."
  },
  {
    icon: Users,
    title: "Tenant Management",
    description: "Complete tenant lifecycle - registration, documents, room assignment, and exit clearance."
  },
  {
    icon: CreditCard,
    title: "Flexible Billing",
    description: "Configure rent, security, electricity, food, and custom charges. Support for daily, monthly, and meter-based billing."
  },
  {
    icon: BarChart3,
    title: "Reports & Analytics",
    description: "Occupancy rates, revenue reports, pending dues, and business insights at your fingertips."
  },
  {
    icon: Shield,
    title: "Role-Based Access",
    description: "Super Admin, Admin, Staff, and Tenant roles with granular permissions for secure operations."
  },
  {
    icon: Smartphone,
    title: "Works on Mobile",
    description: "PWA-enabled app works on any device. Install on phone without app stores."
  }
]

const highlights = [
  "100% Free - No hidden charges",
  "Configure for YOUR workflow",
  "WhatsApp & SMS reminders",
  "Tenant self-service portal",
  "Electricity meter tracking",
  "Exit clearance automation",
  "Multi-language support",
  "Indian market focused"
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">PG Manager</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started Free</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            The Most Flexible
            <span className="text-primary block">PG Management Software</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Built for Indian PGs. Configure everything - billing methods, tenant fields,
            charge types. Your PG, your rules.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline">
                See Features
              </Button>
            </Link>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            {highlights.slice(0, 4).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From tenant registration to exit clearance, manage your entire PG operation efficiently.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-2" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Built for How Indian PGs Actually Work
              </h2>
              <p className="text-muted-foreground mb-8">
                We understand every PG is different. Some charge daily, some monthly.
                Some include food, some don&apos;t. Some split electricity by occupants,
                others charge flat. Configure it YOUR way.
              </p>
              <div className="grid grid-cols-2 gap-4">
                {highlights.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-muted rounded-xl p-8">
              <h3 className="font-semibold mb-4">Quick Setup Templates</h3>
              <div className="space-y-3">
                {[
                  { name: "Boys Hostel", desc: "Rent + Security + Mess" },
                  { name: "Girls PG", desc: "Extra security features" },
                  { name: "Working Professional", desc: "Rent + WiFi + Laundry" },
                  { name: "Student Hostel", desc: "Shared rooms + Meal tracking" },
                ].map((template, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-background rounded-lg">
                    <span className="font-medium">{template.name}</span>
                    <span className="text-sm text-muted-foreground">{template.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Simplify Your PG Management?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join hundreds of PG owners who have streamlined their operations.
            Start free, no credit card required.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="gap-2">
              Create Free Account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            <span className="font-semibold">PG Manager</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Made with care for the Indian PG community
          </p>
        </div>
      </footer>
    </div>
  )
}
