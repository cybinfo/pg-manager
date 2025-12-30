"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { FileUpload } from "@/components/ui/file-upload"
import { Trash2, FileText } from "lucide-react"

export interface IdDocumentData {
  type: string
  number: string
  file_urls: string[]
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

export const DEFAULT_ID_DOCUMENT: IdDocumentData = {
  type: "Aadhaar Card",
  number: "",
  file_urls: [],
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
 * ID document entry with type, number, and file uploads.
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
      <div className="space-y-2">
        <Label className="text-sm">Upload Document (optional)</Label>
        <FileUpload
          bucket="tenant-documents"
          folder={folderPath}
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
                  <div className="w-16 h-16 rounded-lg border bg-muted flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                ) : (
                  <img
                    src={url}
                    alt={`${value.type} ${fileIdx + 1}`}
                    className="w-16 h-16 object-cover rounded-lg border"
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
