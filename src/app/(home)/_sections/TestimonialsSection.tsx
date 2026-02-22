import { Card } from "@/components/ui/card"
import { Star, Users } from "lucide-react"

const testimonials = [
  {
    quote: "ManageKar ne mera kaam bahut aasan kar diya. Pehle sab kuch notebook mein likhta tha, ab phone se hi sab manage ho jaata hai!",
    name: "Rajesh Kumar",
    location: "Delhi",
    role: "PG Owner, 3 Properties",
    initials: "RK",
    lang: "Hindi",
  },
  {
    quote: "\u0b87\u0ba4\u0bc1 \u0bae\u0bbf\u0b95\u0bb5\u0bc1\u0bae\u0bcd \u0b8e\u0bb3\u0bbf\u0bae\u0bc8\u0baf\u0bbe\u0ba9\u0ba4\u0bc1! \u0b8e\u0ba9\u0ba4\u0bc1 45 tenants-\u0b90 \u0b87\u0baa\u0bcd\u0baa\u0bcb\u0ba4\u0bc1 \u0b92\u0bb0\u0bc7 app-\u0bb2\u0bcd manage \u0b9a\u0bc6\u0baf\u0bcd\u0b95\u0bbf\u0bb1\u0bc7\u0ba9\u0bcd. Billing automatic \u0b86\u0b95\u0bbf\u0bb5\u0bbf\u0b9f\u0bcd\u0b9f\u0ba4\u0bc1.",
    name: "Lakshmi Venkatesh",
    location: "Chennai",
    role: "Ladies Hostel Owner",
    initials: "LV",
    lang: "Tamil",
  },
  {
    quote: "\u0986\u09ae\u09be\u09b0 \u0995\u09b2\u0995\u09be\u09a4\u09be\u09df \u09e9\u099f\u09be PG \u0986\u099b\u09c7\u0964 ManageKar \u09a6\u09bf\u09df\u09c7 \u09b8\u09ac \u0995\u09bf\u099b\u09c1 \u098f\u0995 \u099c\u09be\u09df\u0997\u09be\u09df \u09a6\u09c7\u0996\u09a4\u09c7 \u09aa\u09be\u0987\u0964 Staff \u09a6\u09c7\u09b0 permission \u09a6\u09c7\u0993\u09df\u09be\u0993 \u09b8\u09b9\u099c\u0964",
    name: "Amit Banerjee",
    location: "Kolkata",
    role: "Hostel Chain Owner",
    initials: "AB",
    lang: "Bengali",
  },
  {
    quote: "Tenant complaints, maintenance, billing - everything is so organized now. My staff can handle day-to-day work without calling me!",
    name: "Priya Sharma",
    location: "Bangalore",
    role: "Working Women\u2019s Hostel",
    initials: "PS",
    lang: "English",
  },
  {
    quote: "\u0c2e\u0c3e \u0c39\u0c48\u0c26\u0c30\u0c3e\u0c2c\u0c3e\u0c26\u0c4d PG \u0c15\u0c3f \u0c07\u0c26\u0c3f \u0c1a\u0c3e\u0c32\u0c3e useful. Meter reading feature \u0c35\u0c32\u0c4d\u0c32 electricity bill calculation easy \u0c05\u0c2f\u0c3f\u0c2a\u0c4b\u0c2f\u0c3f\u0c02\u0c26\u0c3f.",
    name: "Srinivas Reddy",
    location: "Hyderabad",
    role: "Boys PG Owner",
    initials: "SR",
    lang: "Telugu",
  },
  {
    quote: "\u092a\u0941\u0923\u094d\u092f\u093e\u0924 \u092e\u093e\u091d\u0947 \u0968 PG \u0906\u0939\u0947\u0924. \u0906\u0927\u0940 Excel \u092e\u0927\u094d\u092f\u0947 \u0938\u0917\u0933\u0902 \u0932\u093f\u0939\u093e\u092f\u091a\u094b. \u0906\u0924\u093e ManageKar \u092e\u0941\u0933\u0947 \u0935\u0947\u0933 \u0935\u093e\u091a\u0924\u094b \u0906\u0923\u093f \u091a\u0941\u0915\u093e \u0939\u094b\u0924 \u0928\u093e\u0939\u0940\u0924.",
    name: "Mahesh Patil",
    location: "Pune",
    role: "Student Hostel Owner",
    initials: "MP",
    lang: "Marathi",
  },
]

export function TestimonialsSection() {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-pink-100 to-rose-100 dark:from-pink-900 dark:to-rose-900 text-pink-700 dark:text-pink-300 text-sm font-medium mb-4">
            <Users className="h-4 w-4" />
            Success Stories
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Loved by PG Owners Across India
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From Delhi to Chennai, Kolkata to Bangalore - hear from business owners who transformed their operations with ManageKar.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, i) => (
            <Card key={i} variant="interactive" className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                  {testimonial.lang}
                </span>
              </div>
              <blockquote className="text-muted-foreground mb-4 leading-relaxed text-sm">
                &quot;{testimonial.quote}&quot;
              </blockquote>
              <div className="flex items-center gap-3 pt-4 border-t">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-semibold text-sm">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="font-semibold text-sm">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role} \u2022 {testimonial.location}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
