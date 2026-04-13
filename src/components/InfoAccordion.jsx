import { useId, useState } from 'react'

export default function InfoAccordion({ title = 'Справка', children }) {
  const contentId = useId()
  const [open, setOpen] = useState(false)

  return (
    <section className="rounded-xl border border-zinc-800/90 bg-zinc-950/25 lg:rounded-2xl">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-zinc-900/25 lg:gap-4 lg:px-5 lg:py-4"
        aria-controls={contentId}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-orange-400 lg:text-base">{title}</div>
          <div className="mt-0.5 text-xs text-zinc-500 lg:text-sm">
            Нажмите, чтобы {open ? 'свернуть' : 'раскрыть'}.
          </div>
        </div>
        <span
          className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/10 text-zinc-300 transition lg:h-8 lg:w-8 lg:text-lg ${
            open ? 'rotate-180' : ''
          }`}
        >
          ▾
        </span>
      </button>

      <div
        id={contentId}
        className={`grid transition-all duration-300 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden px-4 pb-4 text-sm text-zinc-200 lg:px-5 lg:pb-5 lg:text-base">
          {children}
        </div>
      </div>
    </section>
  )
}

