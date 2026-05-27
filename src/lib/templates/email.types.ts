export interface PaymentReminderBody {
  tenantName: string
  amount: number
  propertyName: string
  roomNumber: string
  dueDate: Date
  ownerName: string
  ownerPhone?: string
}

export interface OverdueAlertBody {
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

export interface PaymentReceiptBody {
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

export interface InvitationEmailBody {
  inviteeName: string
  inviterName: string
  workspaceName: string
  contextType: "staff" | "tenant"
  roleName?: string
  message?: string
  signupUrl: string
}

export interface EmailVerificationBody {
  userName: string
  email: string
  verificationUrl: string
  expiresInMinutes: number
}

export interface DailySummaryBody {
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

export interface TestEmailBody {
  ownerName: string
}

export interface LibraryRenewalReminderBody {
  memberName: string
  memberCode?: string
  libraryName: string
  expiryDate: Date
  daysRemaining: number
  planName: string
  hoursRemaining: number
  ownerPhone?: string
}

export interface LibraryLowHoursBody {
  memberName: string
  memberCode?: string
  libraryName: string
  hoursRemaining: number
  totalHours: number
  timeSlot?: string
  ownerPhone?: string
}

export interface LibraryExpiringMembershipBody {
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

export interface LibraryExpiredMembershipBody {
  memberName: string
  memberCode?: string
  libraryName: string
  expiryDate: Date
  planName: string
  hoursRemaining: number
  ownerPhone?: string
}

export interface TenantWelcomeBody {
  tenantName: string
  propertyName: string
  roomNumber: string
  moveInDate: Date
  monthlyRent: number
  ownerName: string
  ownerPhone?: string
}

export interface LibraryMemberWelcomeBody {
  memberName: string
  libraryName: string
  memberCode: string
  planName?: string
  hoursIncluded?: number
  seatNumber?: string
  timeSlot?: string
  ownerPhone?: string
}

export interface LibraryPaymentReceiptBody {
  memberName: string
  libraryName: string
  amount: number
  paymentMethod: string
  paymentType: string
  receiptNumber: string
  paymentDate: Date
  ownerPhone?: string
}

export interface ComplaintResolvedBody {
  recipientName: string
  complaintTitle: string
  category: string
  resolutionNotes: string | null
  resolvedDate: Date
  propertyName?: string
  ownerPhone?: string
}

export interface RefundProcessedBody {
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

export interface WaitlistSeatAvailableBody {
  personName: string
  libraryName: string
  queuePosition: number
  ownerPhone?: string
}

export interface MonthlyAttendanceSummaryBody {
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

export interface LockerRenewalBody {
  memberName: string
  libraryName: string
  lockerNumber: string
  expiryDate: string
  daysUntilExpiry: number
}

export interface ComplaintEscalationBody {
  ownerName: string
  complaintTitle: string
  tenantName: string
  daysOpen: number
  priority: string
  complaintUrl: string
}

export interface ConsumptionAlertBody {
  ownerName: string
  roomNumber: string
  chargeType: string
  currentUnits: number
  averageUnits: number
  alertType: 'high' | 'low'
}
