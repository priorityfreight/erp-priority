import type { ReactNode } from "react"
import { PriorityWorkspaceHeader } from "@/components/priority/PriorityWorkspace"
import { PriorityWorkspacePath } from "@/components/priority/PriorityWorkspacePath"
import { cn } from "@/lib/utils"

type PageContainerProps = {
  title: string
  description?: string
  actions?: ReactNode
  meta?: ReactNode
  children: ReactNode
  density?: "default" | "compact"
}

export function PageContainer({
  title,
  description,
  actions,
  meta,
  children,
  density = "default",
}: PageContainerProps) {
  return (
    <div className={cn("mx-auto flex max-w-[94rem] flex-col", density === "compact" ? "gap-3.5" : "gap-5")}>
      <PriorityWorkspaceHeader
        variant={density === "compact" ? "compact" : "default"}
        eyebrow={<PriorityWorkspacePath />}
        title={title}
        description={description}
        meta={meta}
        actions={actions}
      />

      <div className={cn("brand-card rounded-[30px]", density === "compact" ? "p-3.5 xl:p-4" : "p-4 sm:p-5 xl:p-6")}>
        {children}
      </div>
    </div>
  )
}
