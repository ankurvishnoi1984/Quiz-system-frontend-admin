function Tabs({ items, active, onChange }) {
  return (
    <div className="inline-flex rounded-2xl border border-blue-200/70 bg-white/70 p-1 shadow-sm shadow-blue-900/5 backdrop-blur">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
            active === item ? 'bg-linear-to-r from-navy-900 via-blue-700 to-indigo-500 text-white shadow' : 'text-slate-600 hover:bg-blue-50'
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

export default Tabs

