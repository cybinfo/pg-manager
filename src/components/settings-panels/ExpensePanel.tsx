"use client"

import { useSettingsData } from "@/lib/hooks/useSettingsData"
import { ExpenseTypeSettings, FoodSettings } from "@/app/(dashboard)/settings/_components"
import { PageSkeleton } from "@/components/ui/loading"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IndianRupee, UtensilsCrossed } from "lucide-react"

export function ExpensePanel() {
  const {
    loading,
    expenseTypes, setExpenseTypes,
    foodSettings, setFoodSettings,
    config,
  } = useSettingsData()

  if (loading) return <PageSkeleton variant="form" />

  return (
    <Tabs defaultValue="categories">
      <TabsList className="mb-4">
        <TabsTrigger value="categories" className="gap-2">
          <IndianRupee className="h-4 w-4" />
          Expense Categories
        </TabsTrigger>
        <TabsTrigger value="food" className="gap-2">
          <UtensilsCrossed className="h-4 w-4" />
          Food & Meals
        </TabsTrigger>
      </TabsList>
      <TabsContent value="categories">
        <ExpenseTypeSettings
          expenseTypes={expenseTypes}
          setExpenseTypes={setExpenseTypes}
        />
      </TabsContent>
      <TabsContent value="food">
        <FoodSettings
          foodSettings={foodSettings}
          setFoodSettings={setFoodSettings}
          configId={config?.id}
        />
      </TabsContent>
    </Tabs>
  )
}
