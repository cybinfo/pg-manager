/**
 * Library Module Status Configurations
 */

export const LIBRARY_SEAT_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  maintenance: "Maintenance",
}

export const LIBRARY_MEMBER_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  suspended: "Suspended",
  cancelled: "Cancelled",
}

export const LIBRARY_MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  expired: "Expired",
  cancelled: "Cancelled",
  upgraded: "Upgraded",
}

export const LIBRARY_LOCKER_STATUS_LABELS: Record<string, string> = {
  available: "Available",
  occupied: "Occupied",
  maintenance: "Maintenance",
}

export const LIBRARY_LOCKER_SIZE_LABELS: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
}

export const LIBRARY_PAYMENT_TYPE_LABELS: Record<string, string> = {
  subscription: "Subscription",
  locker_rent: "Locker Rent",
  locker_deposit: "Locker Deposit",
  fine: "Fine",
  other: "Other",
}

export const LIBRARY_PAYMENT_STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  pending: "Pending",
  refunded: "Refunded",
}

export const LIBRARY_PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  card: "Card",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  paytm: "Paytm",
  other: "Other",
}
