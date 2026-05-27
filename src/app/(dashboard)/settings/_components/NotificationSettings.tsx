"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FormField, Select } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, Mail, Bell, Send, MailCheck, Phone } from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { sendTestEmail } from "@/lib/email"
import { useSettingsMutation } from "@/lib/hooks/useSettingsMutation"
import { NotificationSettings as NotificationSettingsType, OwnerConfig, Owner } from "@/types/settings.types"
import { REMINDER_DAYS_OPTIONS, ALERT_FREQUENCY_OPTIONS } from "@/lib/constants/form-options"

interface NotificationSettingsProps {
  notificationSettings: NotificationSettingsType
  setNotificationSettings: (settings: NotificationSettingsType) => void
  config: OwnerConfig | null
  owner: Owner | null
}

export function NotificationSettings({
  notificationSettings,
  setNotificationSettings,
  config,
  owner,
}: NotificationSettingsProps) {
  const { saving, save } = useSettingsMutation({ configId: config?.id })
  const [sendingTestEmail, setSendingTestEmail] = useState(false)

  const saveNotificationSettings = async () => {
    await save(
      { notification_settings: notificationSettings },
      { successMessage: "Notification settings saved", errorMessage: "Failed to save notification settings" }
    )
  }

  const handleSendTestEmail = async () => {
    if (!owner?.email) {
      showError("No email address found")
      return
    }

    setSendingTestEmail(true)
    try {
      const result = await sendTestEmail(owner.email, owner.name || "User")
      if (result.success) {
        showSuccess("Test email sent! Check your inbox.")
      } else {
        showError(result.error || "Failed to send test email")
      }
    } catch (_error) {
      showError("Failed to send test email")
    } finally {
      setSendingTestEmail(false)
    }
  }

  return (
    <div className="grid gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>Configure automated email reminders for tenants</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${notificationSettings.email_reminders_enabled ? "bg-primary/10" : "bg-muted"}`}>
                <Bell className={`h-5 w-5 ${notificationSettings.email_reminders_enabled ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium">Email Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Automatically send payment reminders to tenants
                </p>
              </div>
            </div>
            <button
              onClick={() => setNotificationSettings({
                ...notificationSettings,
                email_reminders_enabled: !notificationSettings.email_reminders_enabled
              })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationSettings.email_reminders_enabled ? "bg-primary" : "bg-muted"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationSettings.email_reminders_enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {notificationSettings.email_reminders_enabled && (
            <>
              {/* Reminder Schedule */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Reminder Schedule</h4>

                <FormField label="Days Before Due Date" htmlFor="reminder_days" hint="Send reminder this many days before rent is due">
                  <Select
                    id="reminder_days"
                    value={notificationSettings.reminder_days_before.toString()}
                    onChange={(e) => setNotificationSettings({
                      ...notificationSettings,
                      reminder_days_before: parseInt(e.target.value)
                    })}
                    options={REMINDER_DAYS_OPTIONS}
                  />
                </FormField>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Send on Due Date</p>
                    <p className="text-xs text-muted-foreground">Remind tenants on the day rent is due</p>
                  </div>
                  <button
                    onClick={() => setNotificationSettings({
                      ...notificationSettings,
                      send_on_due_date: !notificationSettings.send_on_due_date
                    })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      notificationSettings.send_on_due_date ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        notificationSettings.send_on_due_date ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Overdue Alerts */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Overdue Alerts</h4>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Send Overdue Alerts</p>
                    <p className="text-xs text-muted-foreground">Alert tenants when payment is overdue</p>
                  </div>
                  <button
                    onClick={() => setNotificationSettings({
                      ...notificationSettings,
                      send_overdue_alerts: !notificationSettings.send_overdue_alerts
                    })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      notificationSettings.send_overdue_alerts ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        notificationSettings.send_overdue_alerts ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {notificationSettings.send_overdue_alerts && (
                  <FormField label="Overdue Alert Frequency" htmlFor="overdue_frequency">
                    <Select
                      id="overdue_frequency"
                      value={notificationSettings.overdue_alert_frequency}
                      onChange={(e) => setNotificationSettings({
                        ...notificationSettings,
                        overdue_alert_frequency: e.target.value as "daily" | "weekly"
                      })}
                      options={ALERT_FREQUENCY_OPTIONS}
                    />
                  </FormField>
                )}
              </div>
            </>
          )}

          <Button onClick={saveNotificationSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Test Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test Email
          </CardTitle>
          <CardDescription>Send a test email to verify your setup</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Send Test Email</p>
              <p className="text-sm text-muted-foreground">
                Send to: {owner?.email}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleSendTestEmail}
              disabled={sendingTestEmail}
            >
              {sendingTestEmail ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MailCheck className="mr-2 h-4 w-4" />
              )}
              Send Test
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Note: Email reminders run automatically every day at 2:30 PM IST.
            Only tenants with pending dues and valid email addresses will receive reminders.
          </p>
        </CardContent>
      </Card>

      {/* WhatsApp Info */}
      <Card className="bg-success/10 border-success/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-success/20 rounded-lg">
              <Phone className="h-5 w-5 text-success" />
            </div>
            <div>
              <h4 className="font-medium text-success">WhatsApp Notifications</h4>
              <p className="text-sm text-success mt-1">
                WhatsApp reminders are available via manual send buttons on the Payments page.
                Go to Payments → Send Reminders to send WhatsApp messages to tenants with pending dues.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
