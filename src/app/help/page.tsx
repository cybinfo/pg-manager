"use client"

import { useState } from "react"
import Link from "next/link"
import { Building2, ArrowLeft, Search, ChevronDown, ChevronUp, HelpCircle, Users, Home, CreditCard, Zap, Settings, MessageSquare, Shield, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface FAQ {
  question: string
  answer: string
  category: string
}

const faqs: FAQ[] = [
  // Getting Started
  {
    category: "Getting Started",
    question: "What is ManageKar?",
    answer: "ManageKar is a smart management platform for Indian businesses. Our first product, PG Manager, helps PG (Paying Guest) and hostel owners manage their properties, tenants, payments, and more - all from one dashboard."
  },
  {
    category: "Getting Started",
    question: "Is ManageKar free to use?",
    answer: "Yes! ManageKar is completely free to use. We believe every PG owner should have access to professional management tools without worrying about costs. We may introduce premium features in the future, but the core functionality will always remain free."
  },
  {
    category: "Getting Started",
    question: "How do I get started?",
    answer: "Simply click 'Start Free' on our homepage, create an account with your email, and follow the setup wizard. You can add your first property and start managing tenants within minutes!"
  },
  {
    category: "Getting Started",
    question: "Can I use ManageKar on my mobile phone?",
    answer: "Absolutely! ManageKar is designed mobile-first. You can access it from any smartphone browser. You can also install it as an app on your phone - just click 'Add to Home Screen' when prompted for quick access."
  },
  // Properties & Rooms
  {
    category: "Properties & Rooms",
    question: "How many properties can I manage?",
    answer: "There's no limit! You can add and manage as many properties as you want. Each property can have unlimited rooms, and you can easily switch between properties from the dashboard."
  },
  {
    category: "Properties & Rooms",
    question: "Can I set different rent for different rooms?",
    answer: "Yes, each room can have its own rent amount. You can also set room capacity (single, double, triple sharing) and track occupancy separately for each room."
  },
  {
    category: "Properties & Rooms",
    question: "How do I track room availability?",
    answer: "The Rooms section shows real-time occupancy status. You can see which rooms are vacant, partially occupied, or full at a glance. The dashboard also shows overall vacancy statistics."
  },
  // Tenants
  {
    category: "Tenants",
    question: "How do I add a new tenant?",
    answer: "Go to Tenants → Add Tenant. Fill in the tenant's details including name, phone, email, room assignment, and move-in date. You can also upload ID documents and set the security deposit amount."
  },
  {
    category: "Tenants",
    question: "Can tenants access their own portal?",
    answer: "Yes! Each tenant gets access to a Tenant Portal where they can view their payment history, pending dues, submit complaints, and see notices. They receive login credentials when you add them."
  },
  {
    category: "Tenants",
    question: "How do I handle tenant checkout?",
    answer: "Use the Exit Clearance feature when a tenant is moving out. It helps you track pending dues, security deposit refunds, and ensures a smooth checkout process with proper documentation."
  },
  // Payments
  {
    category: "Payments",
    question: "How does payment tracking work?",
    answer: "You can record payments manually when tenants pay. Each payment is linked to specific charges (rent, electricity, etc.). The system automatically updates pending dues and generates receipts."
  },
  {
    category: "Payments",
    question: "Can I generate rent receipts?",
    answer: "Yes! When you record a payment, you can generate and share a digital receipt with the tenant. Receipts include all payment details and can be downloaded or shared via WhatsApp."
  },
  {
    category: "Payments",
    question: "How do I track pending dues?",
    answer: "The dashboard shows total pending dues at a glance. You can also view tenant-wise pending amounts in the Payments section, with filters for overdue payments."
  },
  // Meter Readings
  {
    category: "Meter Readings",
    question: "How does electricity billing work?",
    answer: "Record meter readings monthly. The system automatically calculates units consumed (current - previous reading), applies your rate per unit, and generates charges for tenants in that room."
  },
  {
    category: "Meter Readings",
    question: "Can I split electricity charges among roommates?",
    answer: "Yes! When you set up charge types, you can configure 'split by occupants'. The system will automatically divide the bill equally among all active tenants in the room."
  },
  {
    category: "Meter Readings",
    question: "What meter types are supported?",
    answer: "You can track Electricity, Water, and Gas meters. Each property can have multiple meters, and you can assign meters to specific rooms or common areas."
  },
  // Security & Privacy
  {
    category: "Security & Privacy",
    question: "Is my data secure?",
    answer: "Yes! We use industry-standard security measures including encrypted connections (HTTPS), secure password hashing, and row-level security in our database. Your data is stored securely on Supabase infrastructure."
  },
  {
    category: "Security & Privacy",
    question: "Can other users see my data?",
    answer: "No. Each owner's data is completely isolated. You can only see properties, tenants, and payments that belong to your account. Our Row Level Security ensures strict data separation."
  },
  {
    category: "Security & Privacy",
    question: "Can I export my data?",
    answer: "Yes, you have full ownership of your data. You can export tenant lists, payment records, and other data from the Reports section. Contact us if you need a complete data export."
  },
  // Staff & Roles
  {
    category: "Staff Management",
    question: "Can I add staff members?",
    answer: "Yes! You can add caretakers, managers, and other staff with different permission levels. Define roles with specific access rights - some staff might only view data while others can edit."
  },
  {
    category: "Staff Management",
    question: "What permissions can staff have?",
    answer: "You can configure read/write access for each module: Properties, Rooms, Tenants, Payments, etc. For example, a caretaker might only record payments while a manager has full access."
  },
  // Support
  {
    category: "Support",
    question: "How do I get help?",
    answer: "You can reach us via Email (support@managekar.com), WhatsApp (+91 98765 43210), or use the Contact form on our website. We typically respond within 24 hours, and WhatsApp queries are answered even faster!"
  },
  {
    category: "Support",
    question: "Do you provide training?",
    answer: "ManageKar is designed to be intuitive and easy to use. However, if you need help getting started, we're happy to provide a quick walkthrough call. Just reach out via WhatsApp!"
  },
]

const categories = [
  { name: "Getting Started", icon: HelpCircle, color: "text-teal-600 bg-teal-50" },
  { name: "Properties & Rooms", icon: Home, color: "text-emerald-600 bg-emerald-50" },
  { name: "Tenants", icon: Users, color: "text-violet-600 bg-violet-50" },
  { name: "Payments", icon: CreditCard, color: "text-amber-600 bg-amber-50" },
  { name: "Meter Readings", icon: Zap, color: "text-yellow-600 bg-yellow-50" },
  { name: "Security & Privacy", icon: Shield, color: "text-rose-600 bg-rose-50" },
  { name: "Staff Management", icon: Settings, color: "text-blue-600 bg-blue-50" },
  { name: "Support", icon: MessageSquare, color: "text-pink-600 bg-pink-50" },
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch = searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === null || faq.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const groupedFAQs = filteredFAQs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = []
    }
    acc[faq.category].push(faq)
    return acc
  }, {} as Record<string, FAQ[]>)

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
            <HelpCircle className="h-4 w-4" />
            Help Center
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">How can we help you?</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Find answers to common questions about ManageKar and PG Manager
          </p>

          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for answers..."
              className="pl-12 h-14 text-lg rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-8 px-4 border-b">
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={selectedCategory === null ? "bg-teal-500 hover:bg-teal-600" : ""}
            >
              All Topics
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.name}
                variant={selectedCategory === cat.name ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.name)}
                className={selectedCategory === cat.name ? "bg-teal-500 hover:bg-teal-600" : ""}
              >
                <cat.icon className="h-4 w-4 mr-1" />
                {cat.name}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {Object.keys(groupedFAQs).length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground mb-4">
                Try searching with different keywords or browse all topics
              </p>
              <Button variant="outline" onClick={() => { setSearchQuery(""); setSelectedCategory(null); }}>
                Clear filters
              </Button>
            </div>
          ) : (
            Object.entries(groupedFAQs).map(([category, categoryFaqs]) => {
              const categoryInfo = categories.find(c => c.name === category)
              const CategoryIcon = categoryInfo?.icon || HelpCircle

              return (
                <div key={category} className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`h-10 w-10 rounded-lg ${categoryInfo?.color || 'bg-gray-100'} flex items-center justify-center`}>
                      <CategoryIcon className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold">{category}</h2>
                  </div>

                  <div className="space-y-3">
                    {categoryFaqs.map((faq, index) => {
                      const globalIndex = faqs.findIndex(f => f.question === faq.question)
                      const isExpanded = expandedFAQ === globalIndex

                      return (
                        <Card
                          key={index}
                          className={`cursor-pointer transition-all ${isExpanded ? 'ring-2 ring-teal-500' : 'hover:shadow-md'}`}
                          onClick={() => setExpandedFAQ(isExpanded ? null : globalIndex)}
                        >
                          <CardHeader className="py-4">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base font-medium pr-8">
                                {faq.question}
                              </CardTitle>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-teal-500 flex-shrink-0" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              )}
                            </div>
                          </CardHeader>
                          {isExpanded && (
                            <CardContent className="pt-0 pb-4">
                              <p className="text-muted-foreground">{faq.answer}</p>
                            </CardContent>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Still Need Help */}
      <section className="py-12 px-4 bg-gradient-to-br from-teal-50 to-emerald-50">
        <div className="container mx-auto max-w-4xl">
          <Card className="bg-white border-teal-200">
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
                    <a href="https://wa.me/919876543210?text=Hi%20ManageKar%20Team!" target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="border-teal-500 text-teal-600 hover:bg-teal-50">
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
                  <div className="h-12 w-12 bg-teal-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Users className="h-6 w-6 text-teal-600" />
                  </div>
                  <CardTitle className="text-sm">Get Started</CardTitle>
                  <CardDescription className="text-xs mt-1">Create free account</CardDescription>
                </CardContent>
              </Card>
            </Link>
            <Link href="/contact">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer text-center group">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <MessageSquare className="h-6 w-6 text-emerald-600" />
                  </div>
                  <CardTitle className="text-sm">Contact Us</CardTitle>
                  <CardDescription className="text-xs mt-1">Get in touch</CardDescription>
                </CardContent>
              </Card>
            </Link>
            <Link href="/privacy">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer text-center group">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 bg-violet-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Shield className="h-6 w-6 text-violet-600" />
                  </div>
                  <CardTitle className="text-sm">Privacy Policy</CardTitle>
                  <CardDescription className="text-xs mt-1">Your data, protected</CardDescription>
                </CardContent>
              </Card>
            </Link>
            <Link href="/terms">
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer text-center group">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <HelpCircle className="h-6 w-6 text-amber-600" />
                  </div>
                  <CardTitle className="text-sm">Terms of Service</CardTitle>
                  <CardDescription className="text-xs mt-1">Usage guidelines</CardDescription>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ManageKar. Made with ❤️ in India.</p>
        </div>
      </footer>
    </div>
  )
}
