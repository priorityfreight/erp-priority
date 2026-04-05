"use client"

import { MoreHorizontalIcon } from "lucide-react"
import {
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
} from "react-aria-components"
import { Button } from "@/components/ui/button"

export type PriorityMenuAction = {
  label: string
  onPress?: () => void
  href?: string
  disabled?: boolean
}

export function PriorityActionMenu({
  label = "Más acciones",
  actions,
}: {
  label?: string
  actions: PriorityMenuAction[]
}) {
  return (
    <MenuTrigger>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={label}>
        <MoreHorizontalIcon className="size-4" />
      </Button>
      <Popover className="z-[75] min-w-[220px] rounded-[18px] border border-[var(--border-subtle)] bg-white p-1.5 shadow-[0_24px_48px_-30px_rgba(3,10,24,0.3)]">
        <Menu className="outline-none">
          {actions.map((action) => (
            <MenuItem
              key={`${action.label}-${action.href ?? "action"}`}
              isDisabled={action.disabled}
              onAction={() => {
                if (action.href) {
                  window.location.assign(action.href)
                  return
                }
                action.onPress?.()
              }}
              className={({ isFocused, isDisabled }) =>
                [
                  "flex cursor-default items-center rounded-[12px] px-3 py-2 text-sm font-medium text-[var(--brand-navy)] outline-none transition",
                  isFocused ? "bg-[rgba(11,31,59,0.06)]" : "",
                  isDisabled ? "opacity-50" : "",
                ].join(" ")
              }
            >
              {action.label}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}
