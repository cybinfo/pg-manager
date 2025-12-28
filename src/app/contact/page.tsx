"use client"

import { useState } from "react"
import Link from "next/link"
import { Building2, ArrowLeft, Mail, Phone, MessageSquare, Send, Loader2, CheckCircle, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function ContactPage() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulate form submission - In production, you'd send to an API or email service
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Create mailto link as fallback
    const mailtoLink = `mailto:support@managekar.com?subject=${encodeURIComponent(
      formData.subject
    )}&body=${encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
    )}`

    // Open email client
    window.location.href = mailtoLink

    setLoading(false)
    setSubmitted(true)
    toast.success("Opening your email client...")
  }

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Us",
      description: "Get a response within 24 hours",
      value: "support@managekar.com",
      href: "mailto:support@managekar.com",
      color: "text-teal-600 bg-teal-50",
    },
    {
      icon: Phone,
      title: "Call Us",
      description: "Mon-Sat, 10am-6pm IST",
      value: "+91 98765 43210",
      href: "tel:+919876543210",
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      icon: MessageSquare,
      title: "WhatsApp",
      description: "Quick responses on chat",
      value: "+91 98765 43210",
      href: "https://wa.me/919876543210?text=Hi%20ManageKar%20Team!",
      color: "text-green-600 bg-green-50",
    },
  ]

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
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-16 px-4 bg-gradient-to-br from-teal-50 via-white to-emerald-50">
        <div className="container mx-auto text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 text-teal-700 text-sm font-medium mb-6">
            <MessageSquare className="h-4 w-4" />
            We&apos;re Here to Help
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-xl text-muted-foreground">
            Have questions about ManageKar? Need help getting started?
            We&apos;d love to hear from you!
          </p>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {contactMethods.map((method, i) => (
              <a key={i} href={method.href} target="_blank" rel="noopener noreferrer">
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardHeader className="text-center">
                    <div className={`h-14 w-14 rounded-xl ${method.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                      <method.icon className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-lg">{method.title}</CardTitle>
                    <CardDescription>{method.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="font-medium text-teal-600">{method.value}</p>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>

          {/* Contact Form */}
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <h2 className="text-2xl font-bold mb-4">Send Us a Message</h2>
              <p className="text-muted-foreground mb-6">
                Fill out the form and we&apos;ll get back to you within 24 hours.
                For urgent matters, please call or WhatsApp us directly.
              </p>

              {submitted ? (
                <Card className="border-teal-200 bg-teal-50">
                  <CardContent className="pt-6 text-center">
                    <CheckCircle className="h-16 w-16 text-teal-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Message Sent!</h3>
                    <p className="text-muted-foreground mb-4">
                      Thank you for reaching out. We&apos;ll get back to you soon.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSubmitted(false)
                        setFormData({ name: "", email: "", subject: "", message: "" })
                      }}
                    >
                      Send Another Message
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name *</Label>
                      <Input
                        id="name"
                        placeholder="Rajat Seth"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      placeholder="How can we help you?"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <textarea
                      id="message"
                      className="w-full min-h-[150px] px-3 py-2 border border-input rounded-md bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                      placeholder="Tell us more about your question or feedback..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                      disabled={loading}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-5 w-5" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>

            {/* Info Card */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-teal-50 to-emerald-50 border-teal-100">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-teal-600" />
                    Our Office
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    ManageKar Technologies<br />
                    India
                  </p>
                  <div className="pt-4 border-t border-teal-200">
                    <p className="text-sm text-muted-foreground mb-2">Business Hours</p>
                    <p className="font-medium">Monday - Saturday</p>
                    <p className="text-muted-foreground">10:00 AM - 6:00 PM IST</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/help" className="flex items-center gap-2 text-teal-600 hover:underline">
                    → Help Center & FAQs
                  </Link>
                  <Link href="/privacy" className="flex items-center gap-2 text-teal-600 hover:underline">
                    → Privacy Policy
                  </Link>
                  <Link href="/terms" className="flex items-center gap-2 text-teal-600 hover:underline">
                    → Terms of Service
                  </Link>
                  <Link href="/register" className="flex items-center gap-2 text-teal-600 hover:underline">
                    → Get Started Free
                  </Link>
                </CardContent>
              </Card>

              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="pt-6">
                  <p className="text-sm text-amber-800">
                    <strong>Pro Tip:</strong> For fastest response, reach out via WhatsApp
                    during business hours. We typically respond within 30 minutes!
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t mt-12">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ManageKar. Made with ❤️ in India.</p>
        </div>
      </footer>
    </div>
  )
}
