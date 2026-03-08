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
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-[#6B7280]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-6">
        {children}
      </div>
    </div>
  )
}

