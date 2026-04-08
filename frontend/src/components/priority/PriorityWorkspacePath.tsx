"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { getWorkspaceBreadcrumbs } from "@/lib/workspace-navigation"

export function PriorityWorkspacePath() {
  const pathname = usePathname()
  const items = getWorkspaceBreadcrumbs(pathname)

  return (
    <Breadcrumb>
      <BreadcrumbList className="gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7E8DA2]">
        {items.map((item, index) => (
          <Fragment key={`${item.label}-${index}`}>
            <BreadcrumbItem>
              {item.href ? (
                <BreadcrumbLink
                  asChild
                  className="rounded-full px-2 py-1 text-[#7E8DA2] transition-colors hover:bg-[rgba(11,31,59,0.06)] hover:text-[var(--brand-navy)]"
                >
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="rounded-full px-2 py-1 font-semibold text-[var(--brand-navy)]">
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < items.length - 1 ? (
              <BreadcrumbSeparator className="text-[#A5B1C2]" />
            ) : null}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
