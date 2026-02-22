import type { LucideIcon } from "lucide-react"
import { HelpCircle, Home, Users, CreditCard, Zap, Shield, Settings, MessageSquare } from "lucide-react"
import { CONTACT } from "@/lib/constants/contact"

export interface FAQ {
  question: string
  answer: string
}

export interface FAQCategory {
  category: string
  icon: LucideIcon
  color: string
  items: FAQ[]
}

export const FAQ_CATEGORIES: FAQCategory[] = [
  {
    category: "Getting Started",
    icon: HelpCircle,
    color: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950",
    items: [
      {
        question: "What is ManageKar?",
        answer: "ManageKar is a smart management platform for Indian businesses. Our first product, PG Manager, helps PG (Paying Guest) and hostel owners manage their properties, tenants, payments, and more - all from one dashboard."
      },
      {
        question: "Is ManageKar free to use?",
        answer: "Yes! ManageKar is completely free to use. We believe every PG owner should have access to professional management tools without worrying about costs. We may introduce premium features in the future, but the core functionality will always remain free."
      },
      {
        question: "How do I get started?",
        answer: "Simply click 'Start Free' on our homepage, create an account with your email, and follow the setup wizard. You can add your first property and start managing tenants within minutes!"
      },
      {
        question: "Can I use ManageKar on my mobile phone?",
        answer: "Absolutely! ManageKar is designed mobile-first. You can access it from any smartphone browser. You can also install it as an app on your phone - just click 'Add to Home Screen' when prompted for quick access."
      },
    ],
  },
  {
    category: "Properties & Rooms",
    icon: Home,
    color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950",
    items: [
      {
        question: "How many properties can I manage?",
        answer: "There's no limit! You can add and manage as many properties as you want. Each property can have unlimited rooms, and you can easily switch between properties from the dashboard."
      },
      {
        question: "Can I set different rent for different rooms?",
        answer: "Yes, each room can have its own rent amount. You can also set room capacity (single, double, triple sharing) and track occupancy separately for each room."
      },
      {
        question: "How do I track room availability?",
        answer: "The Rooms section shows real-time occupancy status. You can see which rooms are vacant, partially occupied, or full at a glance. The dashboard also shows overall vacancy statistics."
      },
    ],
  },
  {
    category: "Tenants",
    icon: Users,
    color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950",
    items: [
      {
        question: "How do I add a new tenant?",
        answer: "Go to Tenants → Add Tenant. Fill in the tenant's details including name, phone, email, room assignment, and move-in date. You can also upload ID documents and set the security deposit amount."
      },
      {
        question: "Can tenants access their own portal?",
        answer: "Yes! Each tenant gets access to a Tenant Portal where they can view their payment history, pending dues, submit complaints, and see notices. They receive login credentials when you add them."
      },
      {
        question: "How do I handle tenant checkout?",
        answer: "Use the Exit Clearance feature when a tenant is moving out. It helps you track pending dues, security deposit refunds, and ensures a smooth checkout process with proper documentation."
      },
    ],
  },
  {
    category: "Payments",
    icon: CreditCard,
    color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950",
    items: [
      {
        question: "How does payment tracking work?",
        answer: "You can record payments manually when tenants pay. Each payment is linked to specific charges (rent, electricity, etc.). The system automatically updates pending dues and generates receipts."
      },
      {
        question: "Can I generate rent receipts?",
        answer: "Yes! When you record a payment, you can generate and share a digital receipt with the tenant. Receipts include all payment details and can be downloaded or shared via WhatsApp."
      },
      {
        question: "How do I track pending dues?",
        answer: "The dashboard shows total pending dues at a glance. You can also view tenant-wise pending amounts in the Payments section, with filters for overdue payments."
      },
    ],
  },
  {
    category: "Meter Readings",
    icon: Zap,
    color: "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950",
    items: [
      {
        question: "How does electricity billing work?",
        answer: "Record meter readings monthly. The system automatically calculates units consumed (current - previous reading), applies your rate per unit, and generates charges for tenants in that room."
      },
      {
        question: "Can I split electricity charges among roommates?",
        answer: "Yes! When you set up charge types, you can configure 'split by occupants'. The system will automatically divide the bill equally among all active tenants in the room."
      },
      {
        question: "What meter types are supported?",
        answer: "You can track Electricity, Water, and Gas meters. Each property can have multiple meters, and you can assign meters to specific rooms or common areas."
      },
    ],
  },
  {
    category: "Security & Privacy",
    icon: Shield,
    color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950",
    items: [
      {
        question: "Is my data secure?",
        answer: "Yes! We use industry-standard security measures including encrypted connections (HTTPS), secure password hashing, and row-level security in our database. Your data is stored securely on Supabase infrastructure."
      },
      {
        question: "Can other users see my data?",
        answer: "No. Each owner's data is completely isolated. You can only see properties, tenants, and payments that belong to your account. Our Row Level Security ensures strict data separation."
      },
      {
        question: "Can I export my data?",
        answer: "Yes, you have full ownership of your data. You can export tenant lists, payment records, and other data from the Reports section. Contact us if you need a complete data export."
      },
    ],
  },
  {
    category: "Staff Management",
    icon: Settings,
    color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950",
    items: [
      {
        question: "Can I add staff members?",
        answer: "Yes! You can add caretakers, managers, and other staff with different permission levels. Define roles with specific access rights - some staff might only view data while others can edit."
      },
      {
        question: "What permissions can staff have?",
        answer: "You can configure read/write access for each module: Properties, Rooms, Tenants, Payments, etc. For example, a caretaker might only record payments while a manager has full access."
      },
    ],
  },
  {
    category: "Support",
    icon: MessageSquare,
    color: "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950",
    items: [
      {
        question: "How do I get help?",
        answer: `You can reach us via Email (${CONTACT.SUPPORT_EMAIL}), WhatsApp (${CONTACT.PHONE}), or use the Contact form on our website. We typically respond within 24 hours, and WhatsApp queries are answered even faster!`
      },
      {
        question: "Do you provide training?",
        answer: "ManageKar is designed to be intuitive and easy to use. However, if you need help getting started, we're happy to provide a quick walkthrough call. Just reach out via WhatsApp!"
      },
    ],
  },
]
