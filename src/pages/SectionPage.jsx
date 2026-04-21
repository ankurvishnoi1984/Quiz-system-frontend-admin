function SectionPage({ title, subtitle }) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-blue-200/70 bg-white/85 p-6 shadow-lg shadow-blue-900/5 backdrop-blur">
        <h2 className="text-2xl font-bold text-navy-900">{title}</h2>
        <p className="mt-2 text-slate-600">{subtitle}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Status</p>
          <p className="mt-2 text-sm text-slate-600">Module structure is ready for implementation.</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Design</p>
          <p className="mt-2 text-sm text-slate-600">Follows the shared light + navy design system.</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">Next Step</p>
          <p className="mt-2 text-sm text-slate-600">We can now implement this page feature by feature.</p>
        </div>
      </div>
    </section>
  )
}

export default SectionPage
