import { Card } from "@/components/ui/card"
import {
  IndianRupee,
  Gift,
  Smartphone,
  Zap,
  Star,
} from "lucide-react"

const whyManageKar = [
  {
    icon: IndianRupee,
    title: "Built for India",
    description: "UPI payments, WhatsApp reminders, Hindi-friendly. Designed for how Indian businesses actually work."
  },
  {
    icon: Gift,
    title: "Free to Start",
    description: "3 months full access free. Then a generous free tier forever. Fair pricing when you\u2019re ready to scale."
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

export function WhySection() {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900 text-amber-700 dark:text-amber-300 text-sm font-medium mb-4">
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
  )
}
