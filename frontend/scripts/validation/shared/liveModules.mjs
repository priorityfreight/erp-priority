export const liveModuleCatalog = [
  {
    id: "login-access",
    label: "Login y control de acceso",
    routes: ["/login"],
    entryFiles: [
      "frontend/app/login/page.tsx",
      "frontend/src/components/auth/LoginScreen.tsx",
      "frontend/proxy.ts",
    ],
    queryFiles: [
      "frontend/src/lib/auth.ts",
      "frontend/src/lib/permissions/server.ts",
      "frontend/src/lib/db/permissions.ts",
    ],
    apiFiles: [],
    permissionNotes: [
      "Gate global via proxy + erp_can_access_route().",
      "Perfil actual via get_current_erp_user().",
    ],
  },
  {
    id: "dashboard",
    label: "Dashboard",
    routes: ["/dashboard"],
    entryFiles: [
      "frontend/app/dashboard/page.tsx",
      "frontend/src/components/crm/CrmOverview.tsx",
    ],
    queryFiles: [],
    apiFiles: [],
    permissionNotes: ["Acceso de ruta resuelto por proxy."],
  },
  {
    id: "master-data-users",
    label: "Master Data / Users",
    routes: ["/master-data/users"],
    entryFiles: [
      "frontend/app/master-data/users/page.tsx",
      "frontend/src/components/master-data/UsersManager.tsx",
    ],
    queryFiles: [
      "frontend/src/lib/db/users.ts",
      "frontend/src/lib/permissions/server.ts",
    ],
    apiFiles: ["frontend/app/api/admin/users/route.ts"],
    permissionNotes: [
      "Server gate via ensureRouteAccessOrRedirect('/master-data/users').",
      "Mutaciones sensibles pasan por /api/admin/users.",
    ],
  },
  {
    id: "roles-permissions",
    label: "Roles y permisos",
    routes: ["/master-data/users/roles"],
    entryFiles: [
      "frontend/app/master-data/users/roles/page.tsx",
      "frontend/src/components/master-data/RolesPermissionsManager.tsx",
    ],
    queryFiles: [
      "frontend/src/lib/db/permissions.ts",
      "frontend/src/lib/permissions/server.ts",
    ],
    apiFiles: [],
    permissionNotes: [
      "Server gate via ensureRouteAccessOrRedirect('/master-data/users/roles').",
      "Masking y acceso dependen de role_resource_permissions / role_field_permissions.",
    ],
  },
  {
    id: "clients",
    label: "Clients",
    routes: ["/clients"],
    entryFiles: ["frontend/app/clients/page.tsx"],
    queryFiles: [
      "frontend/src/lib/db/clients.ts",
      "frontend/src/lib/db/users.ts",
      "frontend/src/lib/db/backendMode.ts",
    ],
    apiFiles: [],
    permissionNotes: [
      "Acceso por proxy + RLS de clients.",
      "Owner visibility depende de reglas owner_only activadas en backend.",
    ],
  },
  {
    id: "client-detail",
    label: "Client detail",
    routes: ["/clients/[id]"],
    entryFiles: ["frontend/app/clients/[id]/page.tsx"],
    queryFiles: [
      "frontend/src/lib/db/clients.ts",
      "frontend/src/lib/db/contacts.ts",
      "frontend/src/lib/db/opportunities.ts",
      "frontend/src/lib/db/masterData.ts",
      "frontend/src/lib/db/users.ts",
      "frontend/src/lib/db/backendMode.ts",
    ],
    apiFiles: [],
    permissionNotes: [
      "Acceso por proxy + RLS derivado del client.",
      "Incluye logistics parties como subflujo live del detalle.",
    ],
  },
  {
    id: "contacts",
    label: "Contacts",
    routes: ["/contacts"],
    entryFiles: ["frontend/app/contacts/page.tsx"],
    queryFiles: [
      "frontend/src/lib/db/contacts.ts",
      "frontend/src/lib/db/clients.ts",
      "frontend/src/lib/db/backendMode.ts",
    ],
    apiFiles: [],
    permissionNotes: [
      "Acceso por proxy + RLS de contacts derivado del client.",
    ],
  },
  {
    id: "opportunities",
    label: "Opportunities",
    routes: ["/opportunities"],
    entryFiles: ["frontend/app/opportunities/page.tsx"],
    queryFiles: [
      "frontend/src/lib/db/opportunities.ts",
      "frontend/src/lib/db/clients.ts",
      "frontend/src/lib/db/masterData.ts",
      "frontend/src/lib/db/users.ts",
      "frontend/src/lib/db/backendMode.ts",
    ],
    apiFiles: [],
    permissionNotes: [
      "Acceso por proxy + owner visibility sobre salesperson_id.",
    ],
  },
  {
    id: "opportunity-detail",
    label: "Opportunity detail",
    routes: ["/opportunities/[id]"],
    entryFiles: ["frontend/app/opportunities/[id]/page.tsx"],
    queryFiles: [
      "frontend/src/lib/db/opportunities.ts",
      "frontend/src/lib/db/quotations.ts",
      "frontend/src/lib/db/masterData.ts",
      "frontend/src/lib/db/users.ts",
      "frontend/src/lib/db/backendMode.ts",
    ],
    apiFiles: [],
    permissionNotes: [
      "Acceso por proxy + owner visibility.",
      "Create quotation usa create_quotation_from_opportunity().",
    ],
  },
  {
    id: "quotations",
    label: "Quotations",
    routes: ["/quotations"],
    entryFiles: ["frontend/app/quotations/page.tsx"],
    queryFiles: ["frontend/src/lib/db/quotations.ts"],
    apiFiles: [],
    permissionNotes: [
      "Listado usa search_quotations() y quotation_summary_view.",
      "Masking economico depende de quotation_summary_view.",
    ],
  },
  {
    id: "quotation-detail",
    label: "Quotation detail",
    routes: ["/quotations/[id]"],
    entryFiles: [
      "frontend/app/quotations/[id]/page.tsx",
      "frontend/src/components/forms/QuotationForm.tsx",
      "frontend/src/components/forms/QuotationCargoLineForm.tsx",
      "frontend/src/components/forms/QuotationChargeLineForm.tsx",
    ],
    queryFiles: [
      "frontend/src/lib/db/quotations.ts",
      "frontend/src/lib/db/masterData.ts",
      "frontend/src/lib/auth.ts",
    ],
    apiFiles: [],
    permissionNotes: [
      "Acceso por proxy + masking en quotation_summary_view / quotation_cost_line_secure_view.",
      "Incluye create booking como subflujo live dependiente.",
    ],
  },
  {
    id: "customer-document",
    label: "Customer document preview y PDF",
    routes: ["/quotations/[id]/document", "/quotations/[id]/document/pdf"],
    entryFiles: [
      "frontend/app/quotations/[id]/document/page.tsx",
      "frontend/app/quotations/[id]/document/pdf/route.ts",
      "frontend/src/components/quotations/CustomerQuotationPdf.tsx",
    ],
    queryFiles: ["frontend/src/lib/db/quotations.ts"],
    apiFiles: [],
    permissionNotes: [
      "Debe permanecer sincronizado con quotation_summary_view y opciones customer-facing.",
    ],
  },
  {
    id: "pricing-request",
    label: "Pricing request preview y PDF",
    routes: ["/quotations/[id]/pricing-request", "/quotations/[id]/pricing-request/pdf"],
    entryFiles: [
      "frontend/app/quotations/[id]/pricing-request/page.tsx",
      "frontend/app/quotations/[id]/pricing-request/pdf/route.ts",
      "frontend/src/components/quotations/ProviderPricingRequestPdf.tsx",
    ],
    queryFiles: ["frontend/src/lib/db/quotations.ts"],
    apiFiles: [],
    permissionNotes: [
      "Debe ocultar cliente y montos comerciales.",
    ],
  },
  {
    id: "pricing-providers",
    label: "Pricing / Providers",
    routes: ["/pricing/providers"],
    entryFiles: ["frontend/app/pricing/providers/page.tsx"],
    queryFiles: [
      "frontend/src/lib/db/providers.ts",
      "frontend/src/lib/db/masterData.ts",
    ],
    apiFiles: [],
    permissionNotes: [
      "Acceso por proxy + RLS de providers.",
    ],
  },
  {
    id: "pricing-provider-detail",
    label: "Pricing / Provider detail",
    routes: ["/pricing/providers/[id]"],
    entryFiles: ["frontend/app/pricing/providers/[id]/page.tsx"],
    queryFiles: [
      "frontend/src/lib/db/providers.ts",
      "frontend/src/lib/db/masterData.ts",
    ],
    apiFiles: [],
    permissionNotes: [
      "Acceso por proxy + RLS de providers/provider_contacts/provider_service_offerings.",
    ],
  },
  {
    id: "pricing-quotations",
    label: "Pricing / Quotations",
    routes: ["/pricing/quotations"],
    entryFiles: ["frontend/app/pricing/quotations/page.tsx"],
    queryFiles: [
      "frontend/src/lib/db/quotations.ts",
      "frontend/src/lib/db/providers.ts",
      "frontend/src/lib/db/masterData.ts",
    ],
    apiFiles: [],
    permissionNotes: [
      "Usa take_quotation_for_pricing() y save_quotation_purchase_option().",
      "Masking economico parcial por vistas seguras.",
    ],
  },
  {
    id: "master-data-shell",
    label: "Master Data shell",
    routes: ["/master-data"],
    entryFiles: [
      "frontend/app/master-data/page.tsx",
      "frontend/src/components/master-data/MasterDataOverview.tsx",
    ],
    queryFiles: [],
    apiFiles: [],
    permissionNotes: ["Acceso por proxy."],
  },
  {
    id: "service-types",
    label: "Service transport types",
    routes: ["/master-data/sales/service-types"],
    entryFiles: [
      "frontend/app/master-data/sales/service-types/page.tsx",
      "frontend/src/components/master-data/ServiceTransportTypeManager.tsx",
    ],
    queryFiles: ["frontend/src/lib/db/masterData.ts"],
    apiFiles: [],
    permissionNotes: [
      "CRUD via create/update/delete_service_transport_type().",
    ],
  },
  {
    id: "accounting-concepts",
    label: "Sales accounting concepts",
    routes: ["/master-data/sales/accounting-concepts"],
    entryFiles: [
      "frontend/app/master-data/sales/accounting-concepts/page.tsx",
      "frontend/src/components/master-data/SalesAccountingConceptManager.tsx",
    ],
    queryFiles: ["frontend/src/lib/db/masterData.ts"],
    apiFiles: [],
    permissionNotes: [
      "CRUD via create/update/delete_sales_accounting_concept().",
    ],
  },
  {
    id: "quotation-rejection-reasons",
    label: "Quotation rejection reasons",
    routes: ["/master-data/sales/quotation-rejection-reasons"],
    entryFiles: [
      "frontend/app/master-data/sales/quotation-rejection-reasons/page.tsx",
      "frontend/src/components/master-data/QuotationRejectionReasonManager.tsx",
    ],
    queryFiles: ["frontend/src/lib/db/masterData.ts"],
    apiFiles: [],
    permissionNotes: [
      "CRUD via create/update/delete_quotation_rejection_reason().",
    ],
  },
  {
    id: "exchange-rates",
    label: "Exchange rates",
    routes: [
      "/master-data/accounting/exchange-rates",
      "/api/admin/exchange-rates/sync",
      "/api/cron/exchange-rates",
    ],
    entryFiles: [
      "frontend/app/master-data/accounting/exchange-rates/page.tsx",
      "frontend/src/components/master-data/ExchangeRateManager.tsx",
    ],
    queryFiles: ["frontend/src/lib/db/masterData.ts"],
    apiFiles: [
      "frontend/app/api/admin/exchange-rates/sync/route.ts",
      "frontend/app/api/cron/exchange-rates/route.ts",
    ],
    permissionNotes: [
      "Server gate en ruta live + sync admin path protegido.",
    ],
  },
  {
    id: "unlocode",
    label: "UN/LOCODE lookup",
    routes: ["/master-data/unlocode", "/api/master-data/unlocodes"],
    entryFiles: [
      "frontend/app/master-data/unlocode/page.tsx",
      "frontend/src/components/master-data/UnlocodeExplorer.tsx",
    ],
    queryFiles: [
      "frontend/src/lib/db/masterData.ts",
      "frontend/src/lib/masterData/unlocodeSnapshot.ts",
      "frontend/src/lib/db/backendMode.ts",
    ],
    apiFiles: ["frontend/app/api/master-data/unlocodes/route.ts"],
    permissionNotes: [
      "Canonical contract via unlocode_lookup_view + search_unlocodes().",
      "Snapshot fallback sigue presente como rollback safety.",
    ],
  },
]

export const liveValidationTableCounts = [
  { table: "users" },
  { table: "roles" },
  { table: "permission_modules" },
  { table: "permission_submodules" },
  { table: "permission_resources" },
  { table: "permission_fields" },
  { table: "role_resource_permissions" },
  { table: "role_field_permissions" },
  { table: "clients", filters: [{ column: "is_deleted", operator: "eq", value: false }] },
  { table: "contacts" },
  { table: "client_logistics_parties" },
  { table: "opportunities" },
  { table: "quotation_rejection_reasons" },
  { table: "quotations" },
  { table: "quotation_options" },
  { table: "quotation_costs" },
  { table: "quotation_cargo_lines" },
  { table: "providers" },
  { table: "provider_contacts" },
  { table: "provider_service_offerings" },
  { table: "service_transport_types" },
  { table: "sales_accounting_concepts" },
  { table: "exchange_rates" },
  { table: "unlocodes" },
  { table: "incoterms" },
  { table: "shipments" },
]

export const stressPrefixes = ["TEST_", "LOADTEST_", "QA_", "STRESS_"]
