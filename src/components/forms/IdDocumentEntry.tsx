"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FileUpload } from "@/components/ui/file-upload"
import { Trash2, FileText, ImageIcon } from "lucide-react"

export interface IdDocumentData {
  type: string
  number: string
  file_urls: string[]
  // New fields for front/back support
  front_url?: string
  back_url?: string
}

export const ID_DOCUMENT_TYPES = [
  "Aadhaar Card",
  "PAN Card",
  "Passport",
  "Voter ID",
  "Driving License",
  "College ID",
  "Employee ID",
  "Other",
]

// Documents that typically have front and back sides
export const DOCUMENTS_WITH_BACK = [
  "Aadhaar Card",
  "PAN Card",
  "Voter ID",
  "Driving License",
  "College ID",
  "Employee ID",
]

export const DEFAULT_ID_DOCUMENT: IdDocumentData = {
  type: "Aadhaar Card",
  number: "",
  file_urls: [],
  front_url: "",
  back_url: "",
}

interface IdDocumentEntryProps {
  value: IdDocumentData
  onChange: (field: keyof IdDocumentData, value: string | string[]) => void
  onRemove?: () => void
  onRemoveFile?: (fileIndex: number) => void
  showRemove?: boolean
  disabled?: boolean
  /** Folder path for file uploads */
  uploadFolder?: string
}

/**
 * ID document entry with type, number, and front/back file uploads.
 * Styled with p-3 border rounded-lg bg-muted/30.
 */
export function IdDocumentEntry({
  value,
  onChange,
  onRemove,
  onRemoveFile,
  showRemove = true,
  disabled = false,
  uploadFolder = "id-docs",
}: IdDocumentEntryProps) {
  const folderPath = `${uploadFolder}/${value.type.toLowerCase().replace(/ /g, "-")}`
  const hasBackSide = DOCUMENTS_WITH_BACK.includes(value.type)

  return (
    <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
      <div className="flex items-center gap-2">
        <select
          value={value.type}
          onChange={(e) => onChange("type", e.target.value)}
          className="h-10 px-3 rounded-md border bg-background text-sm"
          disabled={disabled}
        >
          {ID_DOCUMENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <Input
          placeholder="Document Number (e.g., XXXX-XXXX-XXXX)"
          value={value.number}
          onChange={(e) => onChange("number", e.target.value)}
          className="flex-1"
          disabled={disabled}
        />
        {showRemove && onRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} disabled={disabled}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>

      {/* Front/Back Image Upload Section */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Document Images</Label>

        {/* Front and Back Side Grid */}
        <div className={`grid gap-3 ${hasBackSide ? "grid-cols-2" : "grid-cols-1"}`}>
          {/* Front Side */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {hasBackSide ? "Front Side" : "Document Image"}
            </Label>
            {value.front_url ? (
              <div className="relative group">
                <div className="aspect-[3/2] rounded-lg border overflow-hidden bg-muted">
                  {value.front_url.toLowerCase().endsWith(".pdf") ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                  ) : (
                    <img
                      src={value.front_url}
                      alt={`${value.type} front`}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onChange("front_url", "")}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={disabled}
                >
                  ×
                </button>
              </div>
            ) : (
              <FileUpload
                bucket="tenant-documents"
                folder={`${folderPath}/front`}
                value={value.front_url || ""}
                onChange={(url) => onChange("front_url", Array.isArray(url) ? url[0] || "" : url || "")}
                accept="image/*,.pdf"
                className="aspect-[3/2]"
              />
            )}
          </div>

          {/* Back Side (only for documents that have back) */}
          {hasBackSide && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Back Side</Label>
              {value.back_url ? (
                <div className="relative group">
                  <div className="aspect-[3/2] rounded-lg border overflow-hidden bg-muted">
                    {value.back_url.toLowerCase().endsWith(".pdf") ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                      </div>
                    ) : (
                      <img
                        src={value.back_url}
                        alt={`${value.type} back`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange("back_url", "")}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={disabled}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <FileUpload
                  bucket="tenant-documents"
                  folder={`${folderPath}/back`}
                  value={value.back_url || ""}
                  onChange={(url) => onChange("back_url", Array.isArray(url) ? url[0] || "" : url || "")}
                  accept="image/*,.pdf"
                  className="aspect-[3/2]"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Additional Files (for documents that need more than front/back) */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Additional Pages (optional)</Label>
        <FileUpload
          bucket="tenant-documents"
          folder={`${folderPath}/additional`}
          value={value.file_urls}
          onChange={(urls) => {
            const urlArr = Array.isArray(urls) ? urls : urls ? [urls] : []
            onChange("file_urls", urlArr.slice(0, 5))
          }}
          multiple
          accept="image/*,.pdf"
        />
        {value.file_urls.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {value.file_urls.map((url, fileIdx) => (
              <div key={fileIdx} className="relative group">
                {url.toLowerCase().endsWith(".pdf") ? (
                  <div className="w-14 h-14 rounded-lg border bg-muted flex items-center justify-center">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                ) : (
                  <img
                    src={url}
                    alt={`${value.type} page ${fileIdx + 1}`}
                    className="w-14 h-14 object-cover rounded-lg border"
                  />
                )}
                {onRemoveFile && (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(fileIdx)}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
