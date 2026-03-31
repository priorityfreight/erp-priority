export type PriorityComponentCategory =
  | "overlay"
  | "form"
  | "data-display"
  | "navigation"
  | "feedback"
  | "interaction"

export type PriorityComponentRegistryItem = {
  name: string
  category: PriorityComponentCategory
  path: string
  base: string
  purpose: string
  approvedFor: string[]
}

export const priorityComponentRegistry: PriorityComponentRegistryItem[] = [
  {
    name: "PriorityDialog",
    category: "overlay",
    path: "@/components/priority/PriorityDialog",
    base: "ui/dialog.tsx",
    purpose: "Modal wrapper for premium ERP forms and confirmations that need branded structure.",
    approvedFor: ["modal forms", "record edit dialogs", "short review flows"],
  },
  {
    name: "PrioritySheet",
    category: "overlay",
    path: "@/components/priority/PrioritySheet",
    base: "ui/sheet.tsx",
    purpose: "Side-panel wrapper for editing or reviewing secondary data without leaving context.",
    approvedFor: ["quick edit", "supporting detail panels", "dense side workflows"],
  },
  {
    name: "PrioritySearchCombobox",
    category: "interaction",
    path: "@/components/priority/PrioritySearchCombobox",
    base: "ui/combobox.tsx",
    purpose: "ERP-facing combobox contract for searchable catalogs and remote lookups.",
    approvedFor: ["UN/LOCODE", "provider lookup", "client lookup", "large catalogs"],
  },
  {
    name: "PriorityDataTable",
    category: "data-display",
    path: "@/components/priority/PriorityDataTable",
    base: "ui/data-table.tsx",
    purpose: "Canonical ERP list/grid wrapper with toolbar, pagination, row actions, and optional selection.",
    approvedFor: ["master data", "CRM lists", "pricing lists", "dense operator grids"],
  },
  {
    name: "PriorityEmptyState",
    category: "feedback",
    path: "@/components/priority/PriorityEmptyState",
    base: "ui/empty.tsx",
    purpose: "Canonical empty, blocked, search-empty, and recoverable error state wrapper.",
    approvedFor: ["empty data", "no results", "blocked states", "recoverable failures"],
  },
  {
    name: "PriorityFormHeader",
    category: "form",
    path: "@/components/priority/PriorityForm",
    base: "Priority form composition",
    purpose: "Standard form opening block for title and description.",
    approvedFor: ["dialogs", "sheets", "premium card forms"],
  },
  {
    name: "PriorityFormSection",
    category: "form",
    path: "@/components/priority/PriorityForm",
    base: "Priority form composition",
    purpose: "Section card for grouped form inputs and guidance.",
    approvedFor: ["long forms", "structured data capture", "modal editing"],
  },
  {
    name: "PriorityFormField",
    category: "form",
    path: "@/components/priority/PriorityForm",
    base: "ui/field.tsx",
    purpose: "Canonical field wrapper for labels, descriptions, and validation-ready layouts.",
    approvedFor: ["all non-tabular forms"],
  },
  {
    name: "PriorityInfoField",
    category: "data-display",
    path: "@/components/priority/PriorityForm",
    base: "Priority form composition",
    purpose: "Read-only value card for derived or backend-owned fields.",
    approvedFor: ["derived values", "audit dates", "normalized location values", "totals"],
  },
  {
    name: "PrioritySubmitBar",
    category: "form",
    path: "@/components/priority/PriorityForm",
    base: "Priority form composition",
    purpose: "Sticky branded action bar for form submission and secondary actions.",
    approvedFor: ["dialogs", "sheets", "long forms", "tabular capture forms"],
  },
  {
    name: "PriorityDateField",
    category: "form",
    path: "@/components/priority/PriorityDateField",
    base: "ui/calendar.tsx + ui/popover.tsx + ui/button.tsx",
    purpose: "Canonical composed date field for premium ERP surfaces.",
    approvedFor: ["validity dates", "exchange rates", "operational date capture"],
  },
  {
    name: "PrioritySectionAlert",
    category: "feedback",
    path: "@/components/priority/PrioritySectionAlert",
    base: "ui/alert.tsx",
    purpose: "Inline informational, warning, success, or destructive section-level feedback.",
    approvedFor: ["validation guidance", "sync status", "blocking explanations", "operator warnings"],
  },
  {
    name: "PriorityRowActions",
    category: "interaction",
    path: "@/components/priority/PriorityRowActions",
    base: "ui/dropdown-menu.tsx",
    purpose: "Canonical dense row action menu for administrative and CRM tables.",
    approvedFor: ["table row actions", "secondary list actions", "dense operator screens"],
  },
  {
    name: "PriorityToolbar",
    category: "navigation",
    path: "@/components/priority/PriorityToolbar",
    base: "Priority composition",
    purpose: "Reusable toolbar shell for list filters and quick actions.",
    approvedFor: ["list pages", "admin workspaces", "table filters"],
  },
  {
    name: "PriorityUserAvatar",
    category: "data-display",
    path: "@/components/priority/PriorityUserAvatar",
    base: "ui/avatar.tsx",
    purpose: "Canonical avatar/fallback wrapper for user and owner identity surfaces.",
    approvedFor: ["users", "owner chips", "assigned record displays"],
  },
  {
    name: "PriorityTypography",
    category: "data-display",
    path: "@/components/priority/PriorityTypography",
    base: "Priority typography composition",
    purpose: "Semantic typography layer for titles, labels, captions, and data values.",
    approvedFor: ["all new workspaces", "forms", "cards", "tabs", "tables"],
  },
  {
    name: "PriorityHoverPreview",
    category: "interaction",
    path: "@/components/priority/PriorityHoverPreview",
    base: "ui/hover-card.tsx",
    purpose: "Context preview wrapper to reduce unnecessary navigation in dense workspaces.",
    approvedFor: ["record previews", "contact/provider previews", "supporting context"],
  },
  {
    name: "usePriorityConfirm",
    category: "interaction",
    path: "@/components/priority/usePriorityConfirm",
    base: "ui/alert-dialog.tsx",
    purpose: "Shared destructive confirmation flow replacing window.confirm.",
    approvedFor: ["deletes", "state transitions", "destructive workspace actions"],
  },
]

export function getPriorityComponent(name: string) {
  return priorityComponentRegistry.find((component) => component.name === name)
}
