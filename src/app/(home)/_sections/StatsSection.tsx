const stats = [
  { value: "500+", label: "PGs Managed" },
  { value: "10,000+", label: "Happy Tenants" },
  { value: "\u20b92Cr+", label: "Rent Collected" },
  { value: "18+", label: "Cities in India" },
]

export function StatsSection() {
  return (
    <section className="py-12 bg-gradient-to-r from-teal-500 to-emerald-500 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjLTIgMC00IDItNCAyczIgNCA0IDRjMiAwIDQtMiA0LTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />
      <div className="container mx-auto px-4 relative">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className={`text-center text-white animate-fade-in-up ${["animation-delay-0", "animation-delay-100", "animation-delay-200", "animation-delay-300"][i] || ""}`}>
              <div className="text-3xl md:text-4xl font-bold mb-1 tabular-nums">{stat.value}</div>
              <div className="text-teal-100 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
