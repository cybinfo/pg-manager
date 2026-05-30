/**
 * Bulk Import Library Members Page
 *
 * CSV upload with preview, validation, and batch import.
 * Expected columns: name, phone, email, gender, plan_name, slot, seat_number
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { PermissionGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Combobox } from "@/components/ui/combobox"
import { FormField } from "@/components/ui/form-components"
import {
  Upload, CheckCircle, XCircle, AlertTriangle,
  Loader2, Download, Users,
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { PageHeader } from "@/components/ui"
import { withCreatedBy } from "@/lib/audit/audit-utils"
import { getTodayISO } from "@/lib/date-helpers"
import { parseCSV, validateRow } from "@/lib/import/library-members"
import type { ParsedRow } from "@/lib/import/library-members"
import type { LibraryOption, LibraryPlanOption } from "@/types/library.types"

// ============================================
// Types
// ============================================

type Library = LibraryOption & { owner_id: string }

interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: { row: number; name: string; reason: string }[]
}

// ============================================
// Page Component
// ============================================

function BulkImportContent() {
  const { user, workspaceId } = useAuthContext()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Data state
  const [libraries, setLibraries] = useState<Library[]>([])
  const [plans, setPlans] = useState<LibraryPlanOption[]>([])
  const [selectedLibrary, setSelectedLibrary] = useState("")
  const [loadingData, setLoadingData] = useState(true)

  // CSV state
  const [fileName, setFileName] = useState("")
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [parseError, setParseError] = useState("")

  // Import state
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // Fetch libraries and plans
  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const { data: librariesData } = await supabase
        .from("libraries")
        .select("id, name, code, owner_id")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      if (librariesData) setLibraries(librariesData)

      const { data: plansData } = await supabase
        .from("library_plans")
        .select("id, name, hours_included, validity_days, base_price")
        .eq("is_active", true)
        .order("sort_order")

      if (plansData) setPlans(plansData)
      setLoadingData(false)
    }
    fetchData()
  }, [])

  const planNames = plans.map((p) => p.name)

  // Handle file upload
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setImportResult(null)
      setParseError("")

      if (!file.name.endsWith(".csv")) {
        setParseError("Please upload a .csv file")
        return
      }

      setFileName(file.name)

      const reader = new FileReader()
      reader.onload = (event) => {
        const text = event.target?.result as string
        if (!text) {
          setParseError("File is empty")
          return
        }

        const { headers, rows } = parseCSV(text)

        // Validate headers
        if (!headers.includes("name") || !headers.includes("phone")) {
          setParseError(
            'CSV must have at least "name" and "phone" columns. Found: ' +
              headers.join(", ")
          )
          return
        }

        // Parse and validate rows
        const parsed = rows.map((row, idx) =>
          validateRow(row, headers, idx + 2, planNames)
        )

        setParsedRows(parsed)
      }
      reader.onerror = () => setParseError("Failed to read file")
      reader.readAsText(file)
    },
    [planNames]
  )

  // Handle import
  const handleImport = useCallback(async () => {
    if (!selectedLibrary || !user?.id || !workspaceId) {
      showError("Please select a library first")
      return
    }

    const validRows = parsedRows.filter((r) => r.valid)
    if (validRows.length === 0) {
      showError("No valid rows to import")
      return
    }

    const library = libraries.find((l) => l.id === selectedLibrary)
    if (!library) {
      showError("Library not found")
      return
    }

    setImporting(true)
    setImportProgress(0)

    const supabase = createClient()
    const result: ImportResult = {
      total: validRows.length,
      imported: 0,
      skipped: 0,
      errors: [],
    }

    // Get current member count for code generation
    const libraryCode = library.code || library.name.slice(0, 3).toUpperCase()

    // Find highest existing member code number
    const { data: existingMembers } = await supabase
      .from("library_members")
      .select("member_code")
      .eq("library_id", selectedLibrary)
      .not("member_code", "is", null)
      .order("member_code", { ascending: false })
      .limit(100)

    let maxNum = 0
    for (const m of existingMembers || []) {
      const match = (m.member_code as string)?.match(/(\d+)$/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
    let memberIndex = maxNum + 1

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]

      try {
        // Check for duplicate phone
        const { data: existing } = await supabase
          .from("library_members")
          .select("id")
          .eq("library_id", selectedLibrary)
          .eq("phone", row.phone)
          .is("deleted_at", null)
          .limit(1)

        if (existing && existing.length > 0) {
          result.skipped++
          result.errors.push({
            row: row.rowNumber,
            name: row.name,
            reason: `Duplicate phone ${row.phone}`,
          })
          setImportProgress(Math.round(((i + 1) / validRows.length) * 100))
          continue
        }

        // Find plan
        const selectedPlan = row.plan_name
          ? plans.find((p) => p.name.toLowerCase() === row.plan_name.toLowerCase())
          : null

        // Generate member code
        const memberCode = `${libraryCode}-${String(memberIndex).padStart(4, "0")}`
        memberIndex++

        // Calculate dates
        const startDate = getTodayISO()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + (selectedPlan?.validity_days || 30))
        const endDateISO = endDate.toISOString().split("T")[0]

        // Create member
        const memberData = withCreatedBy(
          {
            owner_id: library.owner_id,
            workspace_id: workspaceId,
            library_id: selectedLibrary,
            name: row.name.toUpperCase(),
            phone: row.phone,
            email: row.email || null,
            member_code: memberCode,
            preferred_slot: row.slot || "Morning",
            status: "active",
            join_date: startDate,
            expiry_date: endDateISO,
            hours_balance: selectedPlan?.hours_included || 0,
            hours_used: 0,
            notes: null,
          },
          user.id
        )

        const { data: member, error: memberError } = await supabase
          .from("library_members")
          .insert(memberData)
          .select()
          .single()

        if (memberError || !member) {
          result.skipped++
          result.errors.push({
            row: row.rowNumber,
            name: row.name,
            reason: memberError?.message || "Failed to create member",
          })
          setImportProgress(Math.round(((i + 1) / validRows.length) * 100))
          continue
        }

        // Create membership record if plan is specified
        if (selectedPlan) {
          const amount = selectedPlan.base_price
          const membershipData = withCreatedBy(
            {
              owner_id: library.owner_id,
              workspace_id: workspaceId,
              member_id: member.id,
              plan_id: selectedPlan.id,
              plan_name: selectedPlan.name,
              hours_included: selectedPlan.hours_included,
              amount: amount,
              discount_amount: 0,
              final_amount: amount,
              time_slot: row.slot || "Morning",
              start_date: startDate,
              end_date: endDateISO,
              hours_remaining: selectedPlan.hours_included,
              hours_used: 0,
              status: "active",
            },
            user.id
          )

          const { data: membership } = await supabase
            .from("library_memberships")
            .insert(membershipData)
            .select()
            .single()

          // Link membership to member
          if (membership) {
            await supabase
              .from("library_members")
              .update({ current_subscription_id: membership.id })
              .eq("id", member.id)
          }
        }

        // Update person record with gender if provided
        if (row.gender && member.person_id) {
          await supabase
            .from("people")
            .update({ gender: row.gender })
            .eq("id", member.person_id)
        }

        result.imported++
      } catch (err) {
        result.skipped++
        result.errors.push({
          row: row.rowNumber,
          name: row.name,
          reason: err instanceof Error ? err.message : "Unknown error",
        })
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100))
    }

    setImportResult(result)
    setImporting(false)

    if (result.imported > 0) {
      showSuccess(`Successfully imported ${result.imported} member${result.imported !== 1 ? "s" : ""}`)
    }
    if (result.skipped > 0) {
      showError(`${result.skipped} row${result.skipped !== 1 ? "s" : ""} skipped due to errors`)
    }
  }, [selectedLibrary, user, workspaceId, parsedRows, libraries, plans])

  const validCount = parsedRows.filter((r) => r.valid).length
  const errorCount = parsedRows.filter((r) => !r.valid).length

  const libraryOptions = libraries.map((lib) => ({
    value: lib.id,
    label: lib.code ? `${lib.name} (${lib.code})` : lib.name,
  }))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Bulk Import Members"
        backHref="/library-members"
        breadcrumbs={[
          { label: "Members", href: "/library-members" },
          { label: "Bulk Import" },
        ]}
      />

      {/* Step 1: Library Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Select Library</CardTitle>
          <CardDescription>
            Choose the library where members will be added
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormField label="Library" required>
            <Combobox
              options={libraryOptions}
              value={selectedLibrary}
              onValueChange={setSelectedLibrary}
              placeholder="Select a library..."
              searchPlaceholder="Search libraries..."
              emptyText="No libraries found"
              disabled={importing || loadingData}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Step 2: CSV Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Upload CSV</CardTitle>
          <CardDescription>
            Upload a CSV file with the following columns: <strong>name</strong> (required),{" "}
            <strong>phone</strong> (required), email, gender, plan_name, slot, seat_number
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sample CSV download hint */}
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg text-sm">
            <Download className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium">CSV Format</p>
              <p className="text-muted-foreground mt-1">
                First row must be headers. Example:
              </p>
              <code className="text-xs block mt-1 bg-background p-2 rounded">
                name,phone,email,gender,plan_name,slot
                <br />
                Rahul Sharma,9876543210,rahul@email.com,male,9 Hours,Morning
                <br />
                Priya Gupta,9123456789,,female,12 Hours,Evening
              </code>
            </div>
          </div>

          {/* File Input */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              disabled={importing}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full h-24 border-dashed"
            >
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span>{fileName || "Click to upload CSV file"}</span>
              </div>
            </Button>
          </div>

          {parseError && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <XCircle className="h-4 w-4 flex-shrink-0" />
              {parseError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Preview */}
      {parsedRows.length > 0 && !importResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Step 3: Preview & Import</CardTitle>
                <CardDescription>
                  Review parsed data before importing
                </CardDescription>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-success">
                  <CheckCircle className="h-4 w-4" />
                  {validCount} valid
                </span>
                {errorCount > 0 && (
                  <span className="flex items-center gap-1.5 text-destructive">
                    <XCircle className="h-4 w-4" />
                    {errorCount} errors
                  </span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Preview Table */}
            <div className="border rounded-lg overflow-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Row</th>
                    <th className="text-left p-2 font-medium">Status</th>
                    <th className="text-left p-2 font-medium">Name</th>
                    <th className="text-left p-2 font-medium">Phone</th>
                    <th className="text-left p-2 font-medium">Email</th>
                    <th className="text-left p-2 font-medium">Plan</th>
                    <th className="text-left p-2 font-medium">Slot</th>
                    <th className="text-left p-2 font-medium">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={
                        row.valid
                          ? "hover:bg-muted/30"
                          : "bg-destructive/5 hover:bg-destructive/10"
                      }
                    >
                      <td className="p-2 text-muted-foreground">{row.rowNumber}</td>
                      <td className="p-2">
                        {row.valid ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </td>
                      <td className="p-2 font-medium">{row.name || "---"}</td>
                      <td className="p-2">{row.phone || "---"}</td>
                      <td className="p-2 text-muted-foreground">{row.email || "---"}</td>
                      <td className="p-2">{row.plan_name || "---"}</td>
                      <td className="p-2">
                        {row.slot && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                            {row.slot}
                          </span>
                        )}
                      </td>
                      <td className="p-2">
                        {row.errors.length > 0 && (
                          <span className="text-destructive text-xs">
                            {row.errors.join("; ")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Import Progress */}
            {importing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing members...
                  </span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}

            {/* Import Button */}
            {!importing && (
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setParsedRows([])
                    setFileName("")
                    if (fileInputRef.current) fileInputRef.current.value = ""
                  }}
                >
                  Clear
                </Button>
                <Button
                  variant="gradient"
                  onClick={handleImport}
                  disabled={validCount === 0 || !selectedLibrary}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Import {validCount} Member{validCount !== 1 ? "s" : ""}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.imported > 0 ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="text-2xl font-bold">{importResult.total}</div>
                <div className="text-sm text-muted-foreground">Total Rows</div>
              </div>
              <div className="p-4 bg-success/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-success">{importResult.imported}</div>
                <div className="text-sm text-success">Imported</div>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg text-center">
                <div className="text-2xl font-bold text-destructive">{importResult.skipped}</div>
                <div className="text-sm text-destructive">Skipped</div>
              </div>
            </div>

            {/* Error Details */}
            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Skipped Rows</h4>
                <div className="border rounded-lg overflow-auto max-h-[200px]">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2 font-medium">Row</th>
                        <th className="text-left p-2 font-medium">Name</th>
                        <th className="text-left p-2 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="p-2 text-muted-foreground">{err.row}</td>
                          <td className="p-2">{err.name}</td>
                          <td className="p-2 text-destructive">{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setParsedRows([])
                  setFileName("")
                  setImportResult(null)
                  if (fileInputRef.current) fileInputRef.current.value = ""
                }}
              >
                Import More
              </Button>
              <Link href="/library-members">
                <Button variant="gradient">
                  <Users className="mr-2 h-4 w-4" />
                  View Members
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// Page Export (with Permission Guard)
// ============================================

export default function BulkImportPage() {
  return (
    <PermissionGuard permission="library_members.create">
      <BulkImportContent />
    </PermissionGuard>
  )
}
