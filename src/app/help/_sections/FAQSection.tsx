"use client"

import { HelpCircle, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { FAQ, FAQCategory } from "@/lib/constants/faqs"

interface FAQSectionProps {
  groupedFAQs: Record<string, FAQ[]>
  categories: FAQCategory[]
  allFaqs: FAQ[]
  expandedFAQ: number | null
  onToggleFAQ: (index: number | null) => void
  onClearFilters: () => void
}

export function FAQSection({
  groupedFAQs,
  categories,
  allFaqs,
  expandedFAQ,
  onToggleFAQ,
  onClearFilters,
}: FAQSectionProps) {
  return (
    <section className="py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {Object.keys(groupedFAQs).length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground mb-4">
              Try searching with different keywords or browse all topics
            </p>
            <Button variant="outline" onClick={onClearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          Object.entries(groupedFAQs).map(([category, categoryFaqs]) => {
            const categoryInfo = categories.find(c => c.category === category)
            const CategoryIcon = categoryInfo?.icon || HelpCircle

            return (
              <div key={category} className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className={"h-10 w-10 rounded-lg " + (categoryInfo?.color || "bg-muted") + " flex items-center justify-center"}>
                    <CategoryIcon className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-bold">{category}</h2>
                </div>

                <div className="space-y-3">
                  {categoryFaqs.map((faq, index) => {
                    const globalIndex = allFaqs.findIndex(f => f.question === faq.question)
                    const isExpanded = expandedFAQ === globalIndex

                    return (
                      <Card
                        key={index}
                        className={"cursor-pointer transition-all " + (isExpanded ? "ring-2 ring-teal-500" : "hover:shadow-md")}
                        onClick={() => onToggleFAQ(isExpanded ? null : globalIndex)}
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
  )
}
