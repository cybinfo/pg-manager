import Link from "next/link"
import { BrandLogo } from "@/components/ui/brand-logo"

type FooterVariant = "full" | "compact"

interface PublicFooterProps {
  /** "full" shows the 4-column grid layout, "compact" shows a single line */
  variant?: FooterVariant
}

export function PublicFooter({ variant = "full" }: PublicFooterProps) {
  if (variant === "compact") {
    return (
      <footer className="py-8 px-4 border-t mt-12">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ManageKar. Made with &#10084;&#65039; in India.</p>
        </div>
      </footer>
    )
  }

  return (
    <footer className="py-12 px-4 bg-foreground text-background">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="mb-4">
              <BrandLogo size="sm" linkTo={null} />
            </div>
            <p className="text-muted-foreground text-sm mb-3">
              Simple management software for Indian small businesses.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-primary/20 text-primary rounded">PG Manager</span>
              <span className="px-2 py-1 bg-slate-700 text-slate-400 rounded">Shop Manager</span>
              <span className="px-2 py-1 bg-slate-700 text-slate-400 rounded">Rent Manager</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Products</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li><Link href="/products/pg-manager" className="hover:text-background transition-colors">PG Manager</Link></li>
              <li><span className="opacity-50">Shop Manager (Coming)</span></li>
              <li><span className="opacity-50">Rent Manager (Coming)</span></li>
              <li><span className="opacity-50">Society Manager (Coming)</span></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li><Link href="/contact" className="hover:text-background transition-colors">Contact Us</Link></li>
              <li><Link href="/help" className="hover:text-background transition-colors">Help Center</Link></li>
              <li><Link href="/pricing" className="hover:text-background transition-colors">Pricing</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-muted-foreground text-sm">
              <li><Link href="/privacy" className="hover:text-background transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-background transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-muted-foreground/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ManageKar. Made with &#10084;&#65039; in India.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with &#10084;&#65039; for Indian Businesses
          </p>
        </div>
      </div>
    </footer>
  )
}
