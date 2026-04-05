export type PriorityComponentCategory =
  | "overlay"
  | "form"
  | "data-display"
  | "navigation"
  | "feedback"
  | "interaction"
  | "workspace"
  | "grid"

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
    name: "PriorityCommandBar",
    category: "navigation",
    path: "@/components/priority/PriorityCommandBar",
    base: "ui/command.tsx + ui/dialog.tsx",
    purpose: "Global desktop-first command surface for fast navigation and reduced training cost.",
    approvedFor: ["global navigation", "shortcut launch", "cross-workspace jumping"],
  },
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
    name: "PriorityCollectionTable",
    category: "data-display",
    path: "@/components/priority/collection/PriorityCollectionTable",
    base: "ui/data-table.tsx + TanStack Table",
    purpose: "Canonical browse/list table for read-mostly ERP records, detail tabs, and embedded lists.",
    approvedFor: ["detail tabs", "master data lists", "embedded browse tables", "CRM sublists"],
  },
  {
    name: "PriorityDataTable",
    category: "data-display",
    path: "@/components/priority/PriorityDataTable",
    base: "ui/data-table.tsx",
    purpose: "Legacy compatibility wrapper that forwards to PriorityCollectionTable while older imports are migrated.",
    approvedFor: ["temporary backward compatibility only"],
  },
  {
    name: "PriorityFormEngine",
    category: "form",
    path: "@/components/priority/forms/PriorityFormEngine",
    base: "react-hook-form + zod + Priority field registry",
    purpose: "Schema-driven ERP form renderer with shared sections, field components, and submit behavior.",
    approvedFor: ["standard forms", "modal forms", "wizard steps", "hybrid form sections"],
  },
  {
    name: "PriorityGrid",
    category: "grid",
    path: "@/components/priority/grid/PriorityGrid",
    base: "ag-grid-react + ag-grid-community",
    purpose: "Canonical dense editable grid wrapper for ERP-grade row/cell workflows with mobile fallback.",
    approvedFor: ["charge lines", "permissions matrix", "pricing rows", "shipment events", "bulk editing"],
  },
  {
    name: "PriorityGridToolbar",
    category: "grid",
    path: "@/components/priority/grid/PriorityGridToolbar",
    base: "Priority grid composition",
    purpose: "Shared high-signal header for dense grids with context and grid-local actions.",
    approvedFor: ["editable grids", "matrix workspaces", "hybrid form + grid screens"],
  },
  {
    name: "PriorityHybridFormLayout",
    category: "form",
    path: "@/components/priority/forms/PriorityFormWorkflow",
    base: "Priority workflow composition",
    purpose: "Responsive split layout for hybrid screens where a schema form and a dense grid must coexist.",
    approvedFor: ["quotation detail", "shipments", "finance hybrids", "pricing workspaces"],
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
  {
    name: "PriorityWorkspaceHeader",
    category: "workspace",
    path: "@/components/priority/PriorityWorkspace",
    base: "Priority workspace composition",
    purpose: "Compact branded header for operator workspaces with title, context, metadata, and actions.",
    approvedFor: ["page headers", "detail workspaces", "dense list views"],
  },
  {
    name: "PriorityWorkspacePath",
    category: "navigation",
    path: "@/components/priority/PriorityWorkspacePath",
    base: "ui/breadcrumb.tsx + Next pathname routing",
    purpose: "Interactive in-header route path for fast backtracking without repeating navigation chrome in the topbar.",
    approvedFor: ["workspace headers", "detail routes", "operator backtracking"],
  },
  {
    name: "PriorityMetricStrip",
    category: "workspace",
    path: "@/components/priority/PriorityWorkspace",
    base: "Priority workspace composition",
    purpose: "Shared metric band for high-signal workspace stats without card clutter.",
    approvedFor: ["dashboards", "list workspaces", "detail summaries"],
  },
  {
    name: "PriorityMetricCard",
    category: "workspace",
    path: "@/components/priority/PriorityWorkspace",
    base: "Priority workspace composition",
    purpose: "Dense metric card with tuned tones for information hierarchy.",
    approvedFor: ["summary KPIs", "status snapshots", "operator metrics"],
  },
  {
    name: "PrioritySummaryRail",
    category: "workspace",
    path: "@/components/priority/PriorityWorkspace",
    base: "Priority workspace composition",
    purpose: "High-level orientation rail that explains the current workspace before the user acts.",
    approvedFor: ["detail headers", "dashboard orientation", "admin summaries"],
  },
]

export function getPriorityComponent(name: string) {
  return priorityComponentRegistry.find((component) => component.name === name)
}
