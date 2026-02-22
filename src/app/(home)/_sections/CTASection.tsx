import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowRight, MessageSquare } from "lucide-react"

export function CTASection() {
  return (
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
  )
}
