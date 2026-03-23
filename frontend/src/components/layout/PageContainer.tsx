import type { ReactNode } from "react"

type PageContainerProps = {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}

export function PageContainer({
  title,
  description,
  actions,
  children,
}: PageContainerProps) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,_rgba(11,31,59,0.82),_rgba(7,16,32,0.9))] px-5 py-5 shadow-[0_24px_60px_-34px_rgba(3,10,24,0.8)] sm:flex-row sm:items-center sm:px-6">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[var(--brand-gray)]">
            Priority Freight Intelligence
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm text-[var(--brand-soft-gray)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      <div className="brand-card rounded-[30px] p-4 sm:p-6">
        {children}
      </div>
    </div>
  )
}
