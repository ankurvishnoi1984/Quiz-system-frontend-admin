import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

function SortableRankingRow({ id, text, index, disabled = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border border-blue-200/70 bg-white px-3 py-3 shadow-sm ${
        isDragging ? 'opacity-70' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex min-w-9 items-center justify-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-navy-700">
          #{index + 1}
        </span>
        <button
          type="button"
          aria-label="Reorder option"
          disabled={disabled}
          className="rounded-xl p-1 text-slate-500 transition hover:bg-blue-50 disabled:cursor-not-allowed"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{text}</span>
      </div>
    </div>
  )
}

export function RankingOptions({ question, currentResponse, inputsLocked, onRankingChange }) {
  const options = question?.options || []
  const optionIds = options.map((opt) => Number(opt.option_id)).filter(Boolean)
  const responseOrder = Array.isArray(currentResponse?.rankingOrder)
    ? currentResponse.rankingOrder.map(Number).filter(Boolean)
    : []

  const orderedIds =
    responseOrder.length === optionIds.length &&
    optionIds.every((id) => responseOrder.includes(id))
      ? responseOrder
      : optionIds

  const optionById = new Map(options.map((opt) => [Number(opt.option_id), opt]))
  const orderedOptions = orderedIds
    .map((id) => optionById.get(Number(id)))
    .filter(Boolean)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = (event) => {
    if (inputsLocked) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedIds.findIndex((id) => id === Number(active.id))
    const newIndex = orderedIds.findIndex((id) => id === Number(over.id))
    if (oldIndex < 0 || newIndex < 0) return
    onRankingChange(arrayMove(orderedIds, oldIndex, newIndex))
  }

  if (!orderedOptions.length) return null

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Drag to rank all options from most preferred (<strong>#1</strong>) to least preferred.
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {orderedOptions.map((option, index) => (
              <SortableRankingRow
                key={option.option_id}
                id={Number(option.option_id)}
                index={index}
                text={option.option_text}
                disabled={inputsLocked}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
