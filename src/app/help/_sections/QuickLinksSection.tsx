import Link from "next/link"
import { Users, MessageSquare, Shield, HelpCircle, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { CONTACT } from "@/lib/constants/contact"

export function QuickLinksSection() {
  return (
    <>
      {/* Still Need Help */}
      <section className="py-12 px-4 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950 dark:to-emerald-950">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-card border-teal-200 dark:border-teal-800">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Still have questions?</h2>
                  <p className="text-muted-foreground mb-4">
                    Can&apos;t find what you&apos;re looking for? Our support team is here to help!
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link href="/contact">
                      <Button className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Contact Support
                      </Button>
                    </Link>
                    <a href={CONTACT.WHATSAPP_URL + "?text=Hi%20ManageKar%20Team!"} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="border-teal-500 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950">
                        <Smartphone className="mr-2 h-4 w-4" />
                        WhatsApp Us
                      </Button>
                    </a>
                  </div>
                </div>
                <div className="hidden md:flex justify-center">
                  <div className="relative">
                    <div className="h-32 w-32 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full flex items-center justify-center">
                      <MessageSquare className="h-16 w-16 text-teal-500" />
                    </div>
                    <div className="absolute -top-2 -right-2 h-8 w-8 bg-amber-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      ?
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-2xl font-bold text-center mb-8">Quick Links</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/register">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer text-center group">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 bg-teal-50 dark:bg-teal-950 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <CardTitle className="text-sm">Get Started</CardTitle>
                  <CardDescription className="text-xs mt-1">Create free account</CardDescription>
                </CardContent>
              </Card>
            </Link>
            <Link href="/contact">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer text-center group">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-950 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <MessageSquare className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-sm">Contact Us</CardTitle>
                  <CardDescription className="text-xs mt-1">Get in touch</CardDescription>
                </CardContent>
              </Card>
            </Link>
            <Link href="/privacy">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer text-center group">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 bg-violet-50 dark:bg-violet-950 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Shield className="h-6 w-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <CardTitle className="text-sm">Privacy Policy</CardTitle>
                  <CardDescription className="text-xs mt-1">Your data, protected</CardDescription>
                </CardContent>
              </Card>
            </Link>
            <Link href="/terms">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer text-center group">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 bg-amber-50 dark:bg-amber-950 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <HelpCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <CardTitle className="text-sm">Terms of Service</CardTitle>
                  <CardDescription className="text-xs mt-1">Usage guidelines</CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
