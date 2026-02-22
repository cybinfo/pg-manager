"use client"

import { useState, useMemo } from "react"
import { PublicNav, PublicFooter } from "@/components/public"
import { FAQ_CATEGORIES, type FAQ } from "@/lib/constants/faqs"
import { HelpHero, FAQSection, QuickLinksSection } from "./_sections"

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Flatten all FAQs for global index tracking
  const allFaqs: FAQ[] = useMemo(
    () => FAQ_CATEGORIES.flatMap((cat) => cat.items),
    []
  )

  const filteredFAQs = useMemo(() => {
    return allFaqs.filter((faq) => {
      const matchesSearch =
        searchQuery === "" ||
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      const faqCategory = FAQ_CATEGORIES.find((cat) =>
        cat.items.some((item) => item.question === faq.question)
      )?.category
      const matchesCategory =
        selectedCategory === null || faqCategory === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [allFaqs, searchQuery, selectedCategory])

  const groupedFAQs = useMemo(() => {
    return filteredFAQs.reduce(
      (acc: Record<string, FAQ[]>, faq: FAQ) => {
        const faqCategory =
          FAQ_CATEGORIES.find((cat) =>
            cat.items.some((item) => item.question === faq.question)
          )?.category || "Other"
        if (!acc[faqCategory]) {
          acc[faqCategory] = []
        }
        acc[faqCategory].push(faq)
        return acc
      },
      {} as Record<string, FAQ[]>
    )
  }, [filteredFAQs])

  return (
    <div className="min-h-screen bg-background">
      <PublicNav activePage="help" />

      <HelpHero
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={FAQ_CATEGORIES}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      <FAQSection
        groupedFAQs={groupedFAQs}
        categories={FAQ_CATEGORIES}
        allFaqs={allFaqs}
        expandedFAQ={expandedFAQ}
        onToggleFAQ={setExpandedFAQ}
        onClearFilters={() => {
          setSearchQuery("")
          setSelectedCategory(null)
        }}
      />

      <QuickLinksSection />

      <PublicFooter variant="compact" />
    </div>
  )
}
