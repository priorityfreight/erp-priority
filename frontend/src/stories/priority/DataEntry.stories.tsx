import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { PriorityDateField } from "@/components/priority/PriorityDateField"
import { PrioritySearchCombobox } from "@/components/priority/PrioritySearchCombobox"
import { PriorityToolbar } from "@/components/priority/PriorityToolbar"
import { PriorityTypography } from "@/components/priority/PriorityTypography"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"

const sampleOptions = [
  { code: "USLAF", name: "Lafayette", country: "United States" },
  { code: "MXMTY", name: "Monterrey", country: "Mexico" },
  { code: "USHOU", name: "Houston", country: "United States" },
  { code: "MXQRO", name: "Queretaro", country: "Mexico" },
]

const meta = {
  title: "Priority/Data Entry",
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
} satisfies Meta

export default meta

type Story = StoryObj<typeof meta>

function DataEntryPreview() {
  const [query, setQuery] = useState("")
  const [selectedCode, setSelectedCode] = useState("")
  const [selectedLabel, setSelectedLabel] = useState("")
  const [requiredQuoteDate, setRequiredQuoteDate] = useState("2026-04-15")

  return (
    <div className="space-y-6 rounded-[32px] border border-[var(--border-subtle)] bg-[rgba(255,255,255,0.92)] p-8 shadow-[0_32px_80px_-48px_rgba(3,10,24,0.4)]">
      <div className="space-y-2">
        <PriorityTypography variant="eyebrow">ERP Data Entry</PriorityTypography>
        <PriorityTypography as="h1" variant="pageTitle">
          Formularios más claros y más rápidos de usar
        </PriorityTypography>
        <PriorityTypography variant="bodyMuted">
          Esta historia sirve para revisar búsqueda, fechas y toolbars compactas antes de llevarlas a
          oportunidades, quotations y pricing.
        </PriorityTypography>
      </div>

      <PriorityToolbar>
        <div className="min-w-[18rem] flex-1">
          <PrioritySearchCombobox
            label="Origen"
            query={query}
            selectedKey={selectedCode}
            selectedLabel={selectedLabel}
            placeholder="Buscar UN/LOCODE o ciudad"
            helperText="Usa esta base para UN/LOCODE y catálogos densos."
            results={sampleOptions.filter((option) => {
              const normalizedQuery = query.trim().toLowerCase()
              if (!normalizedQuery) {
                return true
              }

              return [option.code, option.name, option.country].some((value) =>
                value.toLowerCase().includes(normalizedQuery)
              )
            })}
            onQueryChange={setQuery}
            onClear={() => {
              setQuery("")
              setSelectedCode("")
              setSelectedLabel("")
            }}
            onSelect={(record) => {
              setSelectedCode(record.code)
              setSelectedLabel(record.name)
              setQuery("")
            }}
            getKey={(record) => record.code}
            getLabel={(record) => record.name}
            getDescription={(record) => `${record.country} · ${record.code}`}
          />
        </div>

        <div className="min-w-[16rem]">
          <PriorityTypography variant="fieldLabel" className="mb-3">
            Fecha requerida de cotización
          </PriorityTypography>
          <PriorityDateField value={requiredQuoteDate} onChange={setRequiredQuoteDate} />
        </div>

        <div className="ml-auto flex items-end">
          <ButtonGroup>
            <Button type="button" variant="outline">
              Limpiar
            </Button>
            <Button type="button" variant="secondary">
              Guardar borrador
            </Button>
            <Button type="button">Aplicar</Button>
          </ButtonGroup>
        </div>
      </PriorityToolbar>
    </div>
  )
}

export const SearchAndDateFields: Story = {
  render: () => <DataEntryPreview />,
}
