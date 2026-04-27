"use client"

import { HelpCircle, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { FAQCategory } from "@/lib/constants/faqs"

interface HelpHeroProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  categories: FAQCategory[]
  selectedCategory: string | null
  onCategoryChange: (category: string | null) => void
}

export function HelpHero({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
}: HelpHeroProps) {
  return (
    <>
      {/* Hero Section */}
      <section className="relative py-16 px-4 bg-gradient-to-br from-teal-50 via-background to-emerald-50 dark:from-teal-950 dark:via-background dark:to-emerald-950">
        <div className="container mx-auto text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
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
              onChange={(e) => onSearchChange(e.target.value)}
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
              onClick={() => onCategoryChange(null)}
              className={selectedCategory === null ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}
            >
              All Topics
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.category}
                variant={selectedCategory === cat.category ? "default" : "outline"}
                size="sm"
                onClick={() => onCategoryChange(cat.category)}
                className={selectedCategory === cat.category ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}
              >
                <cat.icon className="h-4 w-4 mr-1" />
                {cat.category}
              </Button>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
