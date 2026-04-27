import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Gift } from "lucide-react"

export function PricingTeaserSection() {
  return (
    <section className="py-20 px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto text-center max-w-3xl">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warning/10 text-warning text-sm font-medium mb-6">
          <Gift className="h-4 w-4" />
          Limited Time Offer
        </div>
        <h2 className="text-3xl md:text-5xl font-bold mb-4">
          3 Months Free. No Strings Attached.
        </h2>
        <p className="text-slate-400 mb-8 text-lg leading-relaxed">
          Get full access to all features for 3 months absolutely free.
          No credit card required. After that, choose our generous free tier
          or upgrade to Pro starting at just \u20b9499/month.
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
  )
}
