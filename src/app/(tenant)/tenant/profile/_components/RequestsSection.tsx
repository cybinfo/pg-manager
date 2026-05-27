import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, CheckCircle, AlertCircle, Clock, ChevronDown, ChevronUp, Flag } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { APPROVAL_STATUS } from "@/lib/status"

interface ApprovalRequest {
  id: string
  type: string
  status: string
  description: string | null
  payload: Record<string, unknown>
  created_at: string
  decided_at: string | null
}

interface RequestsSectionProps {
  requests: ApprovalRequest[]
  showRequests: boolean
  onToggleRequests: () => void
}

export function RequestsSection({ requests, showRequests, onToggleRequests }: RequestsSectionProps) {
  return (
    <>
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={onToggleRequests}
        >
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Requests
              {requests.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-muted rounded-full">
                  {requests.length}
                </span>
              )}
            </div>
            {showRequests ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </CardTitle>
        </CardHeader>
        {showRequests && (
          <CardContent className="pt-0">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No requests submitted yet. Use the flag icons above to report any issues.
              </p>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => {
                  const typeLabel = request.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
                  return (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{typeLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          Submitted {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      {(() => {
                        const cfg = APPROVAL_STATUS[request.status]
                        const variantClasses: Record<string, string> = {
                          success: "bg-success/10 text-success",
                          warning: "bg-warning/10 text-warning",
                          error: "bg-destructive/10 text-destructive",
                          muted: "bg-muted text-muted-foreground",
                        }
                        const cls = variantClasses[cfg?.variant ?? "muted"] ?? variantClasses.muted
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${cls}`}>
                            {request.status === "approved" && <CheckCircle className="h-3 w-3" />}
                            {request.status === "rejected" && <AlertCircle className="h-3 w-3" />}
                            {request.status === "pending" && <Clock className="h-3 w-3" />}
                            {cfg?.label ?? request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        )
                      })()}
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Help Text */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Need to update your information?</strong> Click the <Flag className="h-3 w-3 inline text-warning" /> icon next to any field to submit a change request. Your administrator will review and process it.
          </p>
        </CardContent>
      </Card>
    </>
  )
}
