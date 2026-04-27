import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  Sparkles,
  Gift,
  Shield,
  IndianRupee,
  Smartphone,
} from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-background to-emerald-50 dark:from-teal-950 dark:via-background dark:to-emerald-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-100/40 via-transparent to-transparent dark:from-teal-900/40" />

      {/* Animated shapes */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-soft" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-soft animation-delay-500" />

      <div className="relative container mx-auto px-4 py-20 md:py-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in-down shadow-sm">
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
            Start with <span className="font-semibold text-primary">PG Manager</span> today —
            <span className="text-warning font-semibold"> 3 months completely free!</span>
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
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900 dark:to-emerald-900 flex items-center justify-center">
                  <item.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
