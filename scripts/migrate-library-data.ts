/**
 * Library Data Migration Script for newgreenhigh@gmail.com
 *
 * Premium client - Execute with extreme care!
 *
 * Usage:
 *   DRY_RUN=true npx ts-node scripts/migrate-library-data.ts   # Preview only
 *   npx ts-node scripts/migrate-library-data.ts                 # Actual migration
 */

import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const DRY_RUN = process.env.DRY_RUN === 'true'
const CLIENT_EMAIL = 'newgreenhigh@gmail.com'

// Initialize Supabase with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Type definitions
interface ExcelUser {
  'User ID': number
  'Full Name': string
  Gender: string | null
  fatherName: string | null
  userProfileImage: string | null
  addDatetime: Date | null
}

interface ExcelContact {
  userId: number
  contactNumber: number | string
  isPrimaryNumber: boolean
  isWhatsappNumber: boolean
}

interface ExcelEmail {
  userId: number
  emailId: string
  isPrimaryEmailId: boolean
}

interface ExcelPayment {
  'Payment ID': string | number
  'User ID': number
  'Start Date': Date
  'End Date': Date
  Hours: number
  Price: number
  addDatetime: Date | null
}

interface ExcelPaymentDetail {
  'Payment Detail ID': string | number
  'Payment ID': string | number
  'Amount Received': number
  MOP: string
  DOP: Date
}

interface ExcelLeftUser {
  userId: number
  leftDate: Date
}

interface ExcelAttendance {
  attendaceId: string
  userId: number
  in: Date
  out: Date | null
}

interface ExcelLocker {
  lockerBookingId: string
  userId: number
  lockerNumber: number
  security: number
  returnKey: boolean
  securityReturned: boolean
}

interface ExcelIdProof {
  userId: number
  idProofType: string
  idNumber: string
}

// Statistics
const stats = {
  members: { created: 0, skipped: 0, errors: 0 },
  memberships: { created: 0, skipped: 0, errors: 0 },
  payments: { created: 0, skipped: 0, errors: 0 },
  attendance: { created: 0, skipped: 0, errors: 0 },
  lockers: { created: 0, assigned: 0, errors: 0 },
}

// Helper to format phone number
function formatPhone(phone: number | string | null): string | null {
  if (!phone) return null
  const phoneStr = String(phone).replace(/[^0-9]/g, '')
  // Handle scientific notation
  if (phoneStr.length > 10) {
    return phoneStr.slice(-10)
  }
  return phoneStr.padStart(10, '0')
}

// Convert Excel serial date to ISO date string
// Excel stores dates as serial numbers (days since 1899-12-30)
function parseDate(serial: number | Date | string | null): string | null {
  if (serial === null || serial === undefined) return null

  // If already a string in DD-MM-YYYY format
  if (typeof serial === 'string') {
    const match = serial.match(/^(\d{2})-(\d{2})-(\d{4})$/)
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`
    }
    const d = new Date(serial)
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    return null
  }

  // If it's a Date object
  if (serial instanceof Date) {
    if (isNaN(serial.getTime())) return null
    return serial.toISOString().split('T')[0]
  }

  // Excel serial number conversion
  if (typeof serial === 'number' && serial > 0) {
    const excelEpoch = new Date(1899, 11, 30)
    const jsDate = new Date(excelEpoch.getTime() + serial * 86400000)
    return jsDate.toISOString().split('T')[0]
  }

  return null
}

// Convert Excel datetime to ISO string
function parseDateTime(serial: number | Date | string | null): string | null {
  if (serial === null || serial === undefined) return null

  if (typeof serial === 'string') {
    const d = new Date(serial)
    if (!isNaN(d.getTime())) return d.toISOString()
    return null
  }

  if (serial instanceof Date) {
    if (isNaN(serial.getTime())) return null
    return serial.toISOString()
  }

  // Excel serial number with time (integer = days, decimal = time fraction)
  if (typeof serial === 'number' && serial > 0) {
    const excelEpoch = new Date(1899, 11, 30)
    const jsDate = new Date(excelEpoch.getTime() + serial * 86400000)
    return jsDate.toISOString()
  }

  return null
}

// Map payment method
function mapPaymentMethod(mop: string): string {
  const method = (mop || '').toLowerCase().trim()
  if (method === 'paytm') return 'paytm'
  if (method === 'cash') return 'cash'
  if (method === 'upi') return 'upi'
  if (method === 'card') return 'card'
  return 'other'
}

async function main() {
  console.log('='.repeat(60))
  console.log('LIBRARY DATA MIGRATION')
  console.log(`Client: ${CLIENT_EMAIL}`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`)
  console.log('='.repeat(60))
  console.log()

  // Step 1: Get client's workspace
  console.log('Step 1: Finding client workspace...')
  const { data: authUser, error: authError } = await supabase.auth.admin.listUsers()

  const clientUser = authUser?.users.find(u => u.email === CLIENT_EMAIL)
  if (!clientUser) {
    console.error(`ERROR: User ${CLIENT_EMAIL} not found`)
    process.exit(1)
  }

  const ownerId = clientUser.id
  console.log(`  Owner ID: ${ownerId}`)

  // Get workspace
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_user_id', ownerId)
    .single()

  if (wsError || !workspace) {
    console.error('ERROR: Workspace not found', wsError)
    process.exit(1)
  }

  const workspaceId = workspace.id
  console.log(`  Workspace ID: ${workspaceId}`)
  console.log()

  // Step 2: Load Excel data
  console.log('Step 2: Loading Excel data...')
  const excelPath = path.join(process.cwd(), 'docs', 'Library Data.xlsx')
  const workbook = XLSX.readFile(excelPath)

  const users: ExcelUser[] = XLSX.utils.sheet_to_json(workbook.Sheets['Library User List'])
  const contacts: ExcelContact[] = XLSX.utils.sheet_to_json(workbook.Sheets['userContactNumberInfoList'])
  const emails: ExcelEmail[] = XLSX.utils.sheet_to_json(workbook.Sheets['userEmailList'])
  const paymentsSheet: ExcelPayment[] = XLSX.utils.sheet_to_json(workbook.Sheets['Library Payment Sheet'])
  const paymentDetails: ExcelPaymentDetail[] = XLSX.utils.sheet_to_json(workbook.Sheets['Payment Details'])
  const leftUsers: ExcelLeftUser[] = XLSX.utils.sheet_to_json(workbook.Sheets['leftUsers'])
  const attendance: ExcelAttendance[] = XLSX.utils.sheet_to_json(workbook.Sheets['attendance'])
  const lockers: ExcelLocker[] = XLSX.utils.sheet_to_json(workbook.Sheets['lockerList'])
  const idProofs: ExcelIdProof[] = XLSX.utils.sheet_to_json(workbook.Sheets['userIdProofList'])

  console.log(`  Users: ${users.length}`)
  console.log(`  Contacts: ${contacts.length}`)
  console.log(`  Emails: ${emails.length}`)
  console.log(`  Memberships: ${paymentsSheet.length}`)
  console.log(`  Payments: ${paymentDetails.length}`)
  console.log(`  Left Users: ${leftUsers.length}`)
  console.log(`  Attendance: ${attendance.length}`)
  console.log(`  Lockers: ${lockers.length}`)
  console.log()

  // Build lookup maps (coerce to number for consistent comparison)
  const leftUserIds = new Set(leftUsers.map(l => Number(l.userId)))
  const contactsByUser = new Map<number, ExcelContact[]>()
  contacts.forEach(c => {
    const id = Number(c.userId)
    if (!contactsByUser.has(id)) contactsByUser.set(id, [])
    contactsByUser.get(id)!.push(c)
  })
  const emailsByUser = new Map<number, ExcelEmail[]>()
  emails.forEach(e => {
    const id = Number(e.userId)
    if (!emailsByUser.has(id)) emailsByUser.set(id, [])
    emailsByUser.get(id)!.push(e)
  })
  const idProofsByUser = new Map<number, ExcelIdProof[]>()
  idProofs.forEach(p => {
    const id = Number(p.userId)
    if (!idProofsByUser.has(id)) idProofsByUser.set(id, [])
    idProofsByUser.get(id)!.push(p)
  })

  // Get users with active memberships (end date >= today)
  const today = new Date()
  const activeUserIds = new Set(
    paymentsSheet
      .filter(p => {
        const endDate = parseDate(p['End Date'])
        return endDate && new Date(endDate) >= today
      })
      .map(p => Number(p['User ID']))
  )

  // Step 3: Create or get Library
  console.log('Step 3: Creating Library...')
  let libraryId: string

  const { data: existingLibrary } = await supabase
    .from('libraries')
    .select('id')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .single()

  if (existingLibrary) {
    libraryId = existingLibrary.id
    console.log(`  Using existing library: ${libraryId}`)
  } else {
    if (DRY_RUN) {
      libraryId = 'dry-run-library-id'
      console.log(`  [DRY RUN] Would create library`)
    } else {
      const { data: newLibrary, error: libError } = await supabase
        .from('libraries')
        .insert({
          owner_id: ownerId,
          workspace_id: workspaceId,
          name: 'New Green High Library',
          code: 'NGH',
          is_active: true,
          has_lockers: true,
          has_wifi: true,
          created_by: ownerId,
        })
        .select('id')
        .single()

      if (libError) {
        console.error('ERROR creating library:', libError)
        process.exit(1)
      }
      libraryId = newLibrary.id
      console.log(`  Created library: ${libraryId}`)
    }
  }
  console.log()

  // Step 4: Create Lockers
  console.log('Step 4: Creating Lockers...')
  const uniqueLockerNumbers = [...new Set(lockers.map(l => l.lockerNumber))].sort((a, b) => a - b)
  const lockerIdMap = new Map<number, string>()

  for (const lockerNum of uniqueLockerNumbers) {
    if (DRY_RUN) {
      lockerIdMap.set(lockerNum, `dry-run-locker-${lockerNum}`)
      stats.lockers.created++
    } else {
      // Check if locker exists
      const { data: existingLocker } = await supabase
        .from('library_lockers')
        .select('id')
        .eq('library_id', libraryId)
        .eq('locker_number', String(lockerNum))
        .is('deleted_at', null)
        .single()

      if (existingLocker) {
        lockerIdMap.set(lockerNum, existingLocker.id)
      } else {
        const { data: newLocker, error } = await supabase
          .from('library_lockers')
          .insert({
            owner_id: ownerId,
            workspace_id: workspaceId,
            library_id: libraryId,
            locker_number: String(lockerNum),
            size: 'medium',
            status: 'available',
            deposit_amount: 100,
            created_by: ownerId,
          })
          .select('id')
          .single()

        if (error) {
          console.error(`  Error creating locker ${lockerNum}:`, error.message)
          stats.lockers.errors++
        } else {
          lockerIdMap.set(lockerNum, newLocker.id)
          stats.lockers.created++
        }
      }
    }
  }
  console.log(`  Lockers created: ${stats.lockers.created}`)
  console.log()

  // Step 5: Migrate Members
  console.log('Step 5: Migrating Members...')
  const memberIdMap = new Map<number, string>() // Excel userId -> Supabase memberId

  for (const user of users) {
    const userId = Number(user['User ID'])
    const userContacts = contactsByUser.get(userId) || []
    const userEmails = emailsByUser.get(userId) || []
    const userIdProofs = idProofsByUser.get(userId) || []

    // Get primary phone
    const primaryContact = userContacts.find(c => c.isPrimaryNumber) || userContacts[0]
    const phone = formatPhone(primaryContact?.contactNumber)

    // Get primary email
    const primaryEmail = userEmails.find(e => e.isPrimaryEmailId) || userEmails[0]
    const email = primaryEmail?.emailId || null

    // Get ID proof (prefer Aadhar)
    const aadharProof = userIdProofs.find(p => p.idProofType?.toLowerCase().includes('aadhar'))
    const idProof = aadharProof || userIdProofs[0]

    // Determine status
    let status: 'active' | 'expired' | 'cancelled' = 'expired'
    if (leftUserIds.has(userId) && !activeUserIds.has(userId)) {
      status = 'cancelled'
    } else if (activeUserIds.has(userId)) {
      status = 'active'
    }

    // Generate member code
    const memberCode = `NGH-${String(userId).padStart(4, '0')}`

    if (DRY_RUN) {
      memberIdMap.set(userId, `dry-run-member-${userId}`)
      stats.members.created++
    } else {
      // Check if member already exists
      const { data: existingMember } = await supabase
        .from('library_members')
        .select('id')
        .eq('library_id', libraryId)
        .eq('member_code', memberCode)
        .is('deleted_at', null)
        .single()

      if (existingMember) {
        memberIdMap.set(userId, existingMember.id)
        stats.members.skipped++
        continue
      }

      const { data: newMember, error } = await supabase
        .from('library_members')
        .insert({
          owner_id: ownerId,
          workspace_id: workspaceId,
          library_id: libraryId,
          name: user['Full Name'] || 'Unknown',
          phone: phone,
          email: email,
          member_code: memberCode,
          status: status,
          id_proof_type: idProof?.idProofType || null,
          id_proof_number: idProof?.idNumber || null,
          join_date: parseDate(user.addDatetime) || '2022-01-01',
          hours_balance: 0,
          hours_used: 0,
          created_by: ownerId,
        })
        .select('id')
        .single()

      if (error) {
        console.error(`  Error creating member ${userId}:`, error.message)
        stats.members.errors++
      } else {
        memberIdMap.set(userId, newMember.id)
        stats.members.created++
      }
    }

    // Progress indicator
    if (stats.members.created % 50 === 0) {
      process.stdout.write(`  Progress: ${stats.members.created}/${users.length}\r`)
    }
  }
  console.log(`  Members created: ${stats.members.created}, skipped: ${stats.members.skipped}, errors: ${stats.members.errors}`)
  console.log()

  // Step 6: Migrate Memberships and Payments
  console.log('Step 6: Migrating Memberships & Payments...')
  const paymentIdMap = new Map<string | number, string>() // Excel paymentId -> Supabase membershipId

  // Group payment details by payment ID
  const paymentDetailsByPaymentId = new Map<string | number, ExcelPaymentDetail[]>()
  paymentDetails.forEach(pd => {
    const key = pd['Payment ID']
    if (!paymentDetailsByPaymentId.has(key)) paymentDetailsByPaymentId.set(key, [])
    paymentDetailsByPaymentId.get(key)!.push(pd)
  })

  for (const payment of paymentsSheet) {
    const excelPaymentId = payment['Payment ID']
    const userId = Number(payment['User ID'])
    const memberId = memberIdMap.get(userId)

    if (!memberId) {
      stats.memberships.skipped++
      continue
    }

    const startDate = parseDate(payment['Start Date'])
    const endDate = parseDate(payment['End Date'])

    if (!startDate || !endDate) {
      stats.memberships.skipped++
      continue
    }

    // Determine membership status
    const endDateObj = new Date(endDate)
    let membershipStatus: 'active' | 'expired' | 'cancelled' = 'expired'
    if (endDateObj >= today) {
      membershipStatus = 'active'
    }

    const planName = `${payment.Hours} Hours`
    const amount = payment.Price || 0

    if (DRY_RUN) {
      paymentIdMap.set(excelPaymentId, `dry-run-membership-${excelPaymentId}`)
      stats.memberships.created++
    } else {
      const { data: newMembership, error } = await supabase
        .from('library_memberships')
        .insert({
          owner_id: ownerId,
          workspace_id: workspaceId,
          member_id: memberId,
          plan_name: planName,
          hours_included: payment.Hours,
          amount: amount,
          discount_amount: 0,
          final_amount: amount,
          start_date: startDate,
          end_date: endDate,
          hours_remaining: payment.Hours,
          hours_used: 0,
          status: membershipStatus,
          created_by: ownerId,
        })
        .select('id')
        .single()

      if (error) {
        stats.memberships.errors++
      } else {
        paymentIdMap.set(excelPaymentId, newMembership.id)
        stats.memberships.created++

        // Create payment records for this membership
        const details = paymentDetailsByPaymentId.get(excelPaymentId) || []
        for (const detail of details) {
          const paymentDate = parseDate(detail.DOP)
          if (!paymentDate) continue

          const { error: payError } = await supabase
            .from('library_payments')
            .insert({
              owner_id: ownerId,
              workspace_id: workspaceId,
              member_id: memberId,
              membership_id: newMembership.id,
              payment_date: paymentDate,
              amount: detail['Amount Received'] || 0,
              payment_type: 'subscription',
              payment_method: mapPaymentMethod(detail.MOP),
              status: 'completed',
              created_by: ownerId,
            })

          if (payError) {
            stats.payments.errors++
          } else {
            stats.payments.created++
          }
        }
      }
    }

    // Progress indicator
    if (stats.memberships.created % 100 === 0) {
      process.stdout.write(`  Progress: ${stats.memberships.created}/${paymentsSheet.length}\r`)
    }
  }
  console.log(`  Memberships created: ${stats.memberships.created}, skipped: ${stats.memberships.skipped}, errors: ${stats.memberships.errors}`)
  console.log(`  Payments created: ${stats.payments.created}, errors: ${stats.payments.errors}`)
  console.log()

  // Step 7: Migrate Attendance
  console.log('Step 7: Migrating Attendance...')

  for (const att of attendance) {
    const userId = Number(att.userId)
    const memberId = memberIdMap.get(userId)

    if (!memberId) {
      stats.attendance.skipped++
      continue
    }

    const checkInTime = parseDateTime(att.in)
    const checkOutTime = parseDateTime(att.out)
    const attendanceDate = parseDate(att.in)

    if (!checkInTime || !attendanceDate) {
      stats.attendance.skipped++
      continue
    }

    // Calculate hours spent if checked out
    let hoursSpent: number | null = null
    if (checkOutTime) {
      const inTime = new Date(att.in)
      const outTime = new Date(att.out!)
      hoursSpent = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60)
      hoursSpent = Math.round(hoursSpent * 100) / 100
    }

    if (DRY_RUN) {
      stats.attendance.created++
    } else {
      const { error } = await supabase
        .from('library_attendance')
        .insert({
          owner_id: ownerId,
          workspace_id: workspaceId,
          member_id: memberId,
          attendance_date: attendanceDate,
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          hours_spent: hoursSpent,
          created_by: ownerId,
        })

      if (error) {
        stats.attendance.errors++
      } else {
        stats.attendance.created++
      }
    }
  }
  console.log(`  Attendance created: ${stats.attendance.created}, skipped: ${stats.attendance.skipped}, errors: ${stats.attendance.errors}`)
  console.log()

  // Step 8: Assign Lockers
  console.log('Step 8: Assigning Lockers...')

  for (const locker of lockers) {
    const userId = Number(locker.userId)
    const memberId = memberIdMap.get(userId)
    const lockerId = lockerIdMap.get(locker.lockerNumber)

    if (!memberId || !lockerId) {
      continue
    }

    if (!DRY_RUN) {
      // Update member's locker assignment
      await supabase
        .from('library_members')
        .update({ locker_id: lockerId })
        .eq('id', memberId)

      // Update locker status
      await supabase
        .from('library_lockers')
        .update({
          status: 'occupied',
          current_member_id: memberId,
        })
        .eq('id', lockerId)

      stats.lockers.assigned++
    } else {
      stats.lockers.assigned++
    }
  }
  console.log(`  Lockers assigned: ${stats.lockers.assigned}`)
  console.log()

  // Final Summary
  console.log('='.repeat(60))
  console.log('MIGRATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes made)' : 'LIVE MIGRATION'}`)
  console.log()
  console.log('Members:')
  console.log(`  Created: ${stats.members.created}`)
  console.log(`  Skipped: ${stats.members.skipped}`)
  console.log(`  Errors: ${stats.members.errors}`)
  console.log()
  console.log('Memberships:')
  console.log(`  Created: ${stats.memberships.created}`)
  console.log(`  Skipped: ${stats.memberships.skipped}`)
  console.log(`  Errors: ${stats.memberships.errors}`)
  console.log()
  console.log('Payments:')
  console.log(`  Created: ${stats.payments.created}`)
  console.log(`  Errors: ${stats.payments.errors}`)
  console.log()
  console.log('Attendance:')
  console.log(`  Created: ${stats.attendance.created}`)
  console.log(`  Skipped: ${stats.attendance.skipped}`)
  console.log(`  Errors: ${stats.attendance.errors}`)
  console.log()
  console.log('Lockers:')
  console.log(`  Created: ${stats.lockers.created}`)
  console.log(`  Assigned: ${stats.lockers.assigned}`)
  console.log(`  Errors: ${stats.lockers.errors}`)
  console.log('='.repeat(60))

  if (DRY_RUN) {
    console.log()
    console.log('This was a DRY RUN. No data was modified.')
    console.log('To perform actual migration, run without DRY_RUN=true')
  }
}

main().catch(console.error)
