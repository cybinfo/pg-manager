// Email data type contracts — transport layer lives in email.ts

export interface PaymentReminderData {
  to: string
  tenantName: string
  amount: number
  propertyName: string
  roomNumber: string
  dueDate: Date
  ownerName: string
  ownerPhone?: string
}

export interface OverdueAlertData {
  to: string
  tenantName: string
  amount: number
  totalDue: number
  propertyName: string
  roomNumber: string
  dueDate: Date
  daysOverdue: number
  ownerName: string
  ownerPhone?: string
}

export interface PaymentReceiptData {
  to: string
  tenantName: string
  amount: number
  receiptNumber: string
  propertyName: string
  roomNumber: string
  paymentDate: Date
  paymentMethod: string
  forPeriod?: string
  ownerName: string
}

export interface InvitationEmailData {
  to: string
  inviteeName: string
  inviterName: string
  workspaceName: string
  contextType: "staff" | "tenant"
  roleName?: string
  message?: string
  signupUrl: string
}

export interface EmailVerificationData {
  to: string
  userName: string
  email: string
  verificationUrl: string
  expiresInMinutes: number
}

export interface SendDailySummaryOptions {
  to: string
  ownerName: string
  businessName?: string
  date: Date
  paymentsReceived: number
  paymentsCount: number
  expensesTotal: number
  expensesCount: number
  pendingDues: number
  pendingCount: number
  occupancyRate: number
  newTenants: number
  exits: number
  openComplaints: number
  whatsappMessage: string
}

export interface LibraryLowHoursData {
  to: string
  memberName: string
  memberCode?: string
  libraryName: string
  hoursRemaining: number
  totalHours: number
  timeSlot?: string
  ownerPhone?: string
}

export interface LibraryExpiringMembershipData {
  to: string
  memberName: string
  memberCode?: string
  libraryName: string
  expiryDate: Date
  daysRemaining: number
  planName: string
  hoursRemaining: number
  timeSlot?: string
  ownerPhone?: string
}

export interface LibraryRenewalReminderData {
  to: string
  memberName: string
  memberCode?: string
  libraryName: string
  expiryDate: Date
  daysRemaining: number
  planName: string
  hoursRemaining: number
  ownerPhone?: string
}

export interface LibraryExpiredMembershipData {
  to: string
  memberName: string
  memberCode?: string
  libraryName: string
  expiryDate: Date
  planName: string
  hoursRemaining: number
  ownerPhone?: string
}

export interface TenantWelcomeData {
  to: string
  tenantName: string
  propertyName: string
  roomNumber: string
  moveInDate: Date
  monthlyRent: number
  ownerName: string
  ownerPhone?: string
}

export interface LibraryMemberWelcomeData {
  to: string
  memberName: string
  libraryName: string
  memberCode: string
  planName?: string
  hoursIncluded?: number
  seatNumber?: string
  timeSlot?: string
  ownerPhone?: string
}

export interface LibraryPaymentReceiptData {
  to: string
  memberName: string
  libraryName: string
  amount: number
  paymentMethod: string
  paymentType: string
  receiptNumber: string
  paymentDate: Date
  ownerPhone?: string
}

export interface ComplaintResolvedData {
  to: string
  recipientName: string
  complaintTitle: string
  category: string
  resolutionNotes: string | null
  resolvedDate: Date
  propertyName?: string
  ownerPhone?: string
}

export interface RefundProcessedData {
  to: string
  tenantName: string
  amount: number
  refundType: string
  paymentMode: string
  reason: string | null
  referenceNumber: string | null
  refundDate: Date
  propertyName?: string
  ownerName: string
  ownerPhone?: string
}

export interface WaitlistSeatAvailableData {
  to: string
  personName: string
  libraryName: string
  queuePosition: number
  ownerPhone?: string
}

export interface MonthlyAttendanceSummaryData {
  to: string
  memberName: string
  libraryName: string
  memberCode?: string
  month: string
  year: number
  totalDaysAttended: number
  totalHours: number
  averageHoursPerDay: number
  hoursRemaining: number
  ownerPhone?: string
}
