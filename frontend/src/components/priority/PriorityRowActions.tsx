"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { MoreHorizontalIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type PriorityRowAction = {
  label: string
  icon?: ReactNode
  onSelect?: () => void
  href?: string
  disabled?: boolean
  destructive?: boolean
}

export function PriorityRowActions({
  label = "Acciones",
  actions,
}: {
  label?: string
  actions: PriorityRowAction[]
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="icon-sm" className="rounded-full">
          <MoreHorizontalIcon />
          <span className="sr-only">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 rounded-[18px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.98)] p-1.5 shadow-[0_24px_48px_-36px_rgba(3,10,24,0.45)]"
      >
        <DropdownMenuLabel className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B7B90]">
          {label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action, index) => (
          action.href ? (
            <DropdownMenuItem
              key={`${action.label}-${index}`}
              asChild
              variant={action.destructive ? "destructive" : "default"}
              disabled={action.disabled}
              className="rounded-[14px] px-3 py-2.5 font-medium"
            >
              <Link href={action.href}>
                {action.icon}
                {action.label}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={`${action.label}-${index}`}
              variant={action.destructive ? "destructive" : "default"}
              disabled={action.disabled}
              className="rounded-[14px] px-3 py-2.5 font-medium"
              onSelect={action.onSelect}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          )
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
