"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Building2,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Sparkles,
  Home,
  Users,
  CreditCard
} from "lucide-react"
import { toast } from "sonner"

const templates = [
  {
    id: "boys_hostel",
    name: "Boys Hostel",
    description: "Standard rent, security deposit, mess charges",
    icon: Users,
  },
  {
    id: "girls_pg",
    name: "Girls PG",
    description: "Extra security features, parent contacts required",
    icon: Users,
  },
  {
    id: "working_professional",
    name: "Working Professional",
    description: "Rent + WiFi + laundry, minimal documentation",
    icon: CreditCard,
  },
  {
    id: "student_hostel",
    name: "Student Hostel",
    description: "Shared rooms, meal tracking, bed allocation",
    icon: Home,
  },
]

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [userName, setUserName] = useState("")

  // Step 1: Business details
  const [businessName, setBusinessName] = useState("")

  // Step 2: Template selection
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  // Step 3: First property
  const [propertyName, setPropertyName] = useState("")
  const [propertyAddress, setPropertyAddress] = useState("")
  const [propertyCity, setPropertyCity] = useState("")

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name)
      }
    }
    fetchUser()
  }, [])

  const handleComplete = async () => {
    if (!propertyName || !propertyCity) {
      toast.error("Please fill in property name and city")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Session expired. Please login again.")
        router.push("/login")
        return
      }

      // Step 1: Update owner with business name
      const { error: ownerError } = await supabase
        .from("owners")
        .update({
          business_name: businessName || null,
          is_setup_complete: true,
        })
        .eq("id", user.id)

      if (ownerError) {
        console.error("Owner update error:", ownerError)
        throw ownerError
      }

      // Step 2: Create owner config with defaults
      const { error: configError } = await (supabase.rpc as Function)("create_default_owner_config", {
        owner_uuid: user.id,
      })

      if (configError) {
        console.error("Config creation error:", configError)
        // Non-fatal - continue anyway
      }

      // Step 3: Create the first property
      const { error: propertyError } = await supabase.from("properties").insert({
        owner_id: user.id,
        name: propertyName,
        address: propertyAddress || null,
        city: propertyCity,
      })

      if (propertyError) {
        console.error("Property creation error:", propertyError)
        throw propertyError
      }

      // Step 4: Create workspace for the owner (unified identity system)
      const workspaceName = businessName || propertyName || "My PG Business"
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({
          owner_user_id: user.id,
          name: workspaceName,
          slug: workspaceName.toLowerCase().replace(/\s+/g, '-') + '-' + user.id.substring(0, 8),
        })
        .select()
        .single()

      if (workspaceError) {
        console.error("Workspace creation error:", workspaceError)
        // Non-fatal - might already exist
      }

      // Step 5: Create owner context if workspace was created
      if (workspace) {
        const { error: contextError } = await supabase
          .from("user_contexts")
          .insert({
            user_id: user.id,
            workspace_id: workspace.id,
            context_type: "owner",
            is_active: true,
            is_default: true,
            accepted_at: new Date().toISOString(),
          })

        if (contextError) {
          console.error("Context creation error:", contextError)
          // Non-fatal
        }
      }

      // Step 6: Update user profile if needed
      const { error: profileError } = await supabase
        .from("user_profiles")
        .upsert({
          user_id: user.id,
          name: userName || user.email?.split("@")[0] || "User",
          email: user.email,
        }, { onConflict: "user_id" })

      if (profileError) {
        console.error("Profile update error:", profileError)
        // Non-fatal
      }

      toast.success("Setup complete! Welcome to PG Manager!")
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      console.error("Setup error:", error)
      toast.error("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">
                Welcome{userName ? `, ${userName.split(" ")[0]}` : ""}!
              </CardTitle>
              <CardDescription>
                Let&apos;s set up your PG management system in just a few steps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name (Optional)</Label>
                <Input
                  id="businessName"
                  placeholder="e.g., Sharma PG Services"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  This will appear on receipts and tenant communications
                </p>
              </div>
              <Button
                className="w-full mt-4"
                onClick={() => setStep(2)}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )

      case 2:
        return (
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Choose a Template</h2>
              <p className="text-muted-foreground">
                Pick a template that matches your PG type. You can customize everything later.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-8">
              {templates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedTemplate === template.id
                      ? "border-primary ring-2 ring-primary ring-offset-2"
                      : ""
                  }`}
                  onClick={() => setSelectedTemplate(template.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <template.icon className="h-8 w-8 text-primary" />
                      {selectedTemplate === template.id && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                className="flex-1"
                onClick={() => setStep(3)}
                disabled={!selectedTemplate}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground mt-4">
              Not sure? Pick any template - everything is fully customizable!
            </p>
          </div>
        )

      case 3:
        return (
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl">Add Your First Property</CardTitle>
              <CardDescription>
                You can add more properties later from the dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="propertyName">Property Name *</Label>
                <Input
                  id="propertyName"
                  placeholder="e.g., Sunrise PG, Main Building"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyAddress">Address</Label>
                <Input
                  id="propertyAddress"
                  placeholder="e.g., 123, MG Road, Near Metro Station"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="propertyCity">City *</Label>
                <Input
                  id="propertyCity"
                  placeholder="e.g., Bangalore"
                  value={propertyCity}
                  onChange={(e) => setPropertyCity(e.target.value)}
                  required
                />
              </div>

              <div className="flex gap-4 mt-6">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleComplete}
                  disabled={loading || !propertyName || !propertyCity}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Complete Setup <CheckCircle className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="py-8">
      {/* Progress indicator */}
      <div className="max-w-lg mx-auto mb-8">
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s < step
                    ? "bg-primary text-primary-foreground"
                    : s === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <CheckCircle className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-1 mx-1 rounded ${
                    s < step ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground px-2">
          <span>Business</span>
          <span>Template</span>
          <span>Property</span>
        </div>
      </div>

      {renderStep()}
    </div>
  )
}
