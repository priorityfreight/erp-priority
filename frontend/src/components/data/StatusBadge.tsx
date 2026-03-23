type StatusBadgeProps = {
  status: string | null | undefined
}

const statusStyles: Record<string, string> = {
  active: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
  prospecto: "border-[#E0E7FF] bg-[#EEF2FF] text-[#4338CA]",
  buscando_informacion: "border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8]",
  cotizando: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  borrador: "border-[#E5E7EB] bg-[#F8FAFC] text-[#334155]",
  pendiente: "border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8]",
  lista_para_enviar: "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]",
  enviada: "border-[#CFFAFE] bg-[#ECFEFF] text-[#0F766E]",
  cancelada: "border-[#E5E7EB] bg-[#F3F4F6] text-[#4B5563]",
  renegociar_tarifa: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  aceptacion_verbal: "border-[#CFFAFE] bg-[#ECFEFF] text-[#0F766E]",
  cliente: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
  investigando: "border-[#DBEAFE] bg-[#EFF6FF] text-[#1D4ED8]",
  confirmado: "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]",
  aceptado: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
  rechazada: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
  vencida: "border-[#E5E7EB] bg-[#F3F4F6] text-[#4B5563]",
  activo: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
  ya_no_trabaja: "border-[#E5E7EB] bg-[#F3F4F6] text-[#4B5563]",
  en_proceso_de_alta: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  inactivo: "border-[#E5E7EB] bg-[#F3F4F6] text-[#4B5563]",
  open: "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]",
  won: "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]",
  qualification: "border-[#DDD6FE] bg-[#F5F3FF] text-[#6D28D9]",
  quoted: "border-[#CFFAFE] bg-[#ECFEFF] text-[#0F766E]",
  negotiation: "border-[#FDE68A] bg-[#FFFBEB] text-[#B45309]",
  lost: "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]",
  archived: "border-[#E5E7EB] bg-[#F3F4F6] text-[#4B5563]",
}

function toLabel(status: string) {
  const labels: Record<string, string> = {
    prospecto: "Prospecto",
    buscando_informacion: "Buscando informacion",
    cotizando: "Cotizando",
    borrador: "Borrador",
    pendiente: "Pendiente de cotizar",
    lista_para_enviar: "Lista para enviar",
    enviada: "Enviada",
    cancelada: "Cancelada",
    renegociar_tarifa: "Renegociar tarifa",
    aceptacion_verbal: "Aceptacion verbal",
    cliente: "Cliente",
    investigando: "Investigando",
    confirmado: "Confirmado",
    aceptado: "Aceptado",
    rechazada: "Rechazada",
    vencida: "Vencida",
    activo: "Activo",
    ya_no_trabaja: "Ya no trabaja",
    en_proceso_de_alta: "En proceso de alta",
    inactivo: "Inactivo",
  }

  if (labels[status]) {
    return labels[status]
  }

  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = (status || "unknown").toLowerCase()
  const classes =
    statusStyles[normalized] ?? "border-[#E5E7EB] bg-[#F8FAFC] text-[#334155]"

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      {toLabel(normalized)}
    </span>
  )
}
