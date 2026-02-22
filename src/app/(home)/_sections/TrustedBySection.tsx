import { Building2 } from "lucide-react"

const trustedClients = [
  { name: "Sunshine PG", city: "Bangalore" },
  { name: "Krishna Nivas", city: "Chennai" },
  { name: "Sharma Boys Hostel", city: "Delhi" },
  { name: "Lakshmi Ladies PG", city: "Hyderabad" },
  { name: "Green Valley Hostel", city: "Pune" },
  { name: "Royal Stay PG", city: "Mumbai" },
  { name: "Student Home", city: "Kolkata" },
  { name: "City Comfort PG", city: "Noida" },
  { name: "Safe Stay Hostel", city: "Gurgaon" },
  { name: "Anjali Girls PG", city: "Jaipur" },
]

export function TrustedBySection() {
  return (
    <section className="py-12 px-4 bg-muted/30 border-y">
      <div className="container mx-auto">
        <p className="text-center text-sm text-muted-foreground mb-8">
          TRUSTED BY 500+ PGs & HOSTELS ACROSS INDIA
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
          {trustedClients.map((client, i) => (
            <div key={i} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium">{client.name}</span>
              <span className="text-xs text-muted-foreground">\u2022 {client.city}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
