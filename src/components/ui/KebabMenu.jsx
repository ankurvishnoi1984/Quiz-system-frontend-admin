import { MoreVertical } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

function KebabMenu({ items, align = 'right' }) {
  const [open, setOpen] = useState(false)
  const [openUp, setOpenUp] = useState(false)
  const ref = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const onMouseDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  useEffect(() => {
    if (!open) return

    const updateDirection = () => {
      if (!ref.current || !menuRef.current) return
      const triggerRect = ref.current.getBoundingClientRect()
      const menuRect = menuRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - triggerRect.bottom
      const spaceAbove = triggerRect.top

      // Open upward when there is not enough space below and more room above.
      setOpenUp(spaceBelow < menuRect.height + 12 && spaceAbove > spaceBelow)
    }

    const frameId = requestAnimationFrame(updateDirection)
    window.addEventListener('resize', updateDirection)
    window.addEventListener('scroll', updateDirection, true)
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', updateDirection)
      window.removeEventListener('scroll', updateDirection, true)
    }
  }, [open, items.length])

  return (
    <div ref={ref} className={`relative ${open ? 'z-50' : 'z-10'}`}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center justify-center rounded-xl border border-blue-200/70 bg-white p-2 text-slate-700 transition hover:bg-blue-50"
        aria-label="Actions"
      >
        <MoreVertical className="size-4" />
      </button>

      {open && (
        <div
          ref={menuRef}
          className={`absolute z-50 w-48 rounded-2xl border border-blue-200/70 bg-white p-1 shadow-2xl shadow-blue-900/20 ${
            openUp ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setOpen(false)
                item.onClick?.()
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold transition ${
                item.variant === 'danger' ? 'text-red-700 hover:bg-red-50' : 'text-slate-700 hover:bg-blue-50'
              }`}
            >
              <span className="flex items-center gap-2">
                {item.icon ? <item.icon className="size-4" /> : null}
                {item.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default KebabMenu

