import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { Contact, QuotationCargoLine, QuotationChargeLine, QuotationSummary } from "@/lib/db"
import {
  formatCurrency,
  getCustomerOptionRemarks,
  getPrimaryContact,
  getVisibleCustomerOptionSummaries,
  priorityPalette,
} from "@/lib/quotations/customerDocument"

type CustomerQuotationPdfProps = {
  quotation: QuotationSummary
  chargeLines: QuotationChargeLine[]
  cargoLines: QuotationCargoLine[]
  clientContacts: Contact[]
  logoDataUri: string
}

const styles = StyleSheet.create({
  page: {
    padding: 22,
    fontSize: 9.2,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  header: {
    borderWidth: 1,
    borderColor: "#D7DEE8",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  headerTop: {
    backgroundColor: priorityPalette.navy,
    flexDirection: "row",
    alignItems: "stretch",
  },
  brandWrap: {
    flex: 1,
    padding: 18,
  },
  brandShell: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 14,
  },
  logoBox: {
    width: "100%",
    height: 54,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  logo: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  eyebrow: {
    fontSize: 8,
    color: "#CFD8E3",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  title: {
    fontSize: 22,
    color: "#FFFFFF",
    fontWeight: 700,
  },
  directedBox: {
    width: 176,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255,255,255,0.10)",
    padding: 18,
  },
  directedHeading: {
    fontSize: 8,
    color: "#CFD8E3",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  directedName: {
    marginTop: 8,
    fontSize: 15,
    color: "#FFFFFF",
    fontWeight: 700,
    lineHeight: 1.2,
  },
  directedText: {
    marginTop: 5,
    fontSize: 9,
    color: "#E5E5E5",
    lineHeight: 1.3,
  },
  headerMeta: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  metaCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
  },
  metaLabel: {
    fontSize: 7.2,
    color: "#64748B",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  metaValue: {
    marginTop: 5,
    fontSize: 9.5,
    color: "#111827",
    fontWeight: 700,
  },
  gridFour: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  detailCard: {
    width: "23.8%",
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#E7EAF0",
    borderRadius: 10,
    backgroundColor: "#FBFCFE",
    padding: 9,
  },
  detailLabel: {
    fontSize: 7.2,
    color: "#94A3B8",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  detailValue: {
    marginTop: 3,
    fontSize: 9.2,
    color: "#111827",
    fontWeight: 600,
  },
  section: {
    borderWidth: 1,
    borderColor: "#E7EAF0",
    borderRadius: 14,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 11.5,
    color: priorityPalette.navy,
    fontWeight: 700,
    marginBottom: 9,
  },
  twoCol: {
    flexDirection: "row",
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldWide: {
    marginTop: 9,
  },
  fieldLabel: {
    fontSize: 7.2,
    color: "#94A3B8",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  fieldValue: {
    marginTop: 3,
    fontSize: 9.2,
    color: "#111827",
    lineHeight: 1.3,
  },
  table: {
    borderWidth: 1,
    borderColor: "#E7EAF0",
    borderRadius: 10,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: priorityPalette.navy,
  },
  tableHeaderSoft: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
  },
  tableHeaderCell: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 7.2,
    color: "#FFFFFF",
    fontWeight: 700,
    textTransform: "uppercase",
  },
  tableHeaderCellSoft: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 7.2,
    color: "#64748B",
    fontWeight: 700,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  tableCell: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontSize: 8.4,
    color: "#475569",
  },
  optionCard: {
    borderWidth: 1,
    borderColor: "#E7EAF0",
    borderRadius: 12,
    overflow: "hidden",
  },
  optionHeader: {
    backgroundColor: priorityPalette.navy,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  optionLabel: {
    fontSize: 8.2,
    color: "#CFD8E3",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  optionSubtext: {
    marginTop: 4,
    fontSize: 8.4,
    color: "#E5E5E5",
  },
  optionTotal: {
    fontSize: 9.2,
    color: "#FFFFFF",
    fontWeight: 700,
    textAlign: "right",
  },
  remarksWrap: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 12,
    backgroundColor: "#FBFCFE",
  },
  remarksTitle: {
    fontSize: 8.2,
    color: priorityPalette.burgundy,
    fontWeight: 700,
    textTransform: "uppercase",
    marginBottom: 7,
  },
  remarkHeading: {
    fontSize: 8.2,
    color: "#111827",
    fontWeight: 700,
    textTransform: "uppercase",
    marginTop: 5,
  },
  remarkBody: {
    marginTop: 2,
    fontSize: 8.4,
    color: "#475569",
    lineHeight: 1.35,
  },
  closingWrap: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: "#D7DEE8",
    paddingTop: 16,
  },
  closingText: {
    fontSize: 10,
    color: "#334155",
    lineHeight: 1.7,
    textAlign: "center",
  },
})

function renderCell(value: string) {
  return <Text style={styles.tableCell}>{value}</Text>
}

export function CustomerQuotationPdf({
  quotation,
  chargeLines,
  cargoLines,
  clientContacts,
  logoDataUri,
}: CustomerQuotationPdfProps) {
  const primaryContact = getPrimaryContact(clientContacts)
  const visibleOptions = getVisibleCustomerOptionSummaries(chargeLines)

  return (
    <Document
      title={`Cotizacion ${quotation.reference_number || ""}`}
      author="Priority Freight Intelligence"
      subject="Cotizacion comercial"
      creator="Priority ERP"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandWrap}>
              <View style={styles.brandShell}>
                <View style={styles.logoBox}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={logoDataUri} style={styles.logo} />
                </View>
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.eyebrow}>Priority Freight Intelligence</Text>
                  <Text style={styles.title}>Cotizacion Comercial</Text>
                </View>
              </View>
            </View>

            <View style={styles.directedBox}>
              <Text style={styles.directedHeading}>Dirigido a</Text>
              <Text style={styles.directedName}>{quotation.client_name || "Cliente"}</Text>
              <Text style={styles.directedText}>{primaryContact?.name || "Sin contacto principal"}</Text>
              <Text style={styles.directedText}>{primaryContact?.email || "Sin correo"}</Text>
              <Text style={styles.directedText}>{primaryContact?.phone || "Sin telefono"}</Text>
            </View>
          </View>

          <View style={styles.headerMeta}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Referencia</Text>
              <Text style={styles.metaValue}>{quotation.reference_number || "Pendiente"}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Fecha de emision</Text>
              <Text style={styles.metaValue}>{new Date().toLocaleDateString("es-MX")}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Fecha requerida</Text>
              <Text style={styles.metaValue}>{quotation.required_quote_date || "No disponible"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.gridFour}>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Servicio</Text>
            <Text style={styles.detailValue}>{quotation.service_type || "—"}</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Transporte</Text>
            <Text style={styles.detailValue}>{quotation.transport_type || "—"}</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Tipo de operacion</Text>
            <Text style={styles.detailValue}>{quotation.operation_type || "—"}</Text>
          </View>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Incoterm</Text>
            <Text style={styles.detailValue}>{quotation.incoterm_code || "—"}</Text>
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Ruta</Text>
          <View style={styles.twoCol}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Origen</Text>
              <Text style={styles.fieldValue}>{quotation.origin || "No disponible"}</Text>
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Destino</Text>
              <Text style={styles.fieldValue}>{quotation.destination || "No disponible"}</Text>
            </View>
          </View>
          <View style={styles.fieldWide}>
            <Text style={styles.fieldLabel}>Direccion de recoleccion</Text>
            <Text style={styles.fieldValue}>{quotation.pickup_address || "No disponible"}</Text>
          </View>
          <View style={styles.fieldWide}>
            <Text style={styles.fieldLabel}>Direccion de entrega</Text>
            <Text style={styles.fieldValue}>{quotation.delivery_address || "No disponible"}</Text>
          </View>
        </View>

        <View style={[styles.section, { marginTop: 10 }]} wrap={false}>
          <Text style={styles.sectionTitle}>Informacion de carga</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Tipo</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Cantidad</Text>
              <Text style={[styles.tableHeaderCell, { width: "22%" }]}>Dimensiones</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Peso</Text>
              <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Commodities</Text>
              <Text style={[styles.tableHeaderCell, { width: "10%" }]}>CBM</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>KG / VOL</Text>
            </View>
            {cargoLines.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: "100%", textAlign: "center" }]}>
                  No hay detalles de carga capturados todavia.
                </Text>
              </View>
            ) : (
              cargoLines.map((line) => (
                <View key={line.id} style={styles.tableRow}>
                  <View style={{ width: "14%" }}>{renderCell(line.load_type)}</View>
                  <View style={{ width: "12%" }}>
                    {renderCell(line.piece_count != null ? String(line.piece_count) : "—")}
                  </View>
                  <View style={{ width: "22%" }}>
                    {renderCell(
                      [line.width, line.length, line.height].every((value) => value != null)
                        ? `${line.length} x ${line.width} x ${line.height} cm`
                        : "No disponible"
                    )}
                  </View>
                  <View style={{ width: "12%" }}>
                    {renderCell(line.weight != null ? `${line.weight} kg` : "No disponible")}
                  </View>
                  <View style={{ width: "18%" }}>{renderCell(line.commodities || "No disponible")}</View>
                  <View style={{ width: "10%" }}>
                    {renderCell(line.cbm != null ? line.cbm.toFixed(3) : "No disponible")}
                  </View>
                  <View style={{ width: "12%" }}>
                    {renderCell(
                      line.volumetric_weight_kg != null
                        ? line.volumetric_weight_kg.toFixed(2)
                        : "No disponible"
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </Page>

      {visibleOptions.length === 0 ? (
        <Page size="A4" style={styles.page}>
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Opciones de la cotizacion</Text>
            <Text style={styles.fieldValue}>
              Todavia no hay opciones comerciales listas para compartir.
            </Text>
          </View>
          <View style={styles.closingWrap}>
            <Text style={styles.closingText}>
              Propuesta formal de servicio logístico preparada para evaluación comercial.
              Los importes mostrados corresponden únicamente a la versión dirigida al cliente
            </Text>
          </View>
        </Page>
      ) : (
        visibleOptions.map((option, index) => {
          const remarks = getCustomerOptionRemarks(option.lines)
          const isLastOption = index === visibleOptions.length - 1

          return (
            <Page key={option.optionId} size="A4" style={styles.page}>
              <View style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>Opciones de la cotizacion</Text>
                <View style={styles.optionCard}>
                  <View style={styles.optionHeader}>
                    <View>
                      <Text style={styles.optionLabel}>{option.optionLabel}</Text>
                      <Text style={styles.optionSubtext}>
                        Vigencia de la propuesta: {option.salesValidUntil || "No disponible"}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.optionSubtext}>
                        Subtotal MXN: {formatCurrency(option.subtotalMxn)}
                      </Text>
                      <Text style={styles.optionTotal}>
                        Total MXN: {formatCurrency(option.totalMxn)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.table}>
                    <View style={styles.tableHeaderSoft}>
                      <Text style={[styles.tableHeaderCellSoft, { width: "46%" }]}>Concepto</Text>
                      <Text style={[styles.tableHeaderCellSoft, { width: "18%" }]}>Venta</Text>
                      <Text style={[styles.tableHeaderCellSoft, { width: "12%" }]}>IVA</Text>
                      <Text style={[styles.tableHeaderCellSoft, { width: "24%" }]}>Total MXN</Text>
                    </View>
                    {option.lines.map((line) => {
                      const saleMxn = line.sale_amount_mxn ?? line.sale_amount ?? 0
                      const totalMxn = saleMxn * (1 + (line.vat_rate ?? 0) / 100)

                      return (
                        <View key={line.id} style={styles.tableRow}>
                          <View style={{ width: "46%" }}>
                            {renderCell(line.accounting_concept || line.service_name)}
                          </View>
                          <View style={{ width: "18%" }}>
                            {renderCell(formatCurrency(line.sale_amount, line.sale_currency))}
                          </View>
                          <View style={{ width: "12%" }}>{renderCell(`${line.vat_rate}%`)}</View>
                          <View style={{ width: "24%" }}>{renderCell(formatCurrency(totalMxn))}</View>
                        </View>
                      )
                    })}
                  </View>

                  {remarks.length > 0 ? (
                    <View style={styles.remarksWrap}>
                      <Text style={styles.remarksTitle}>REMARKS:</Text>
                      {remarks.map((remark, remarkIndex) => (
                        <View key={`${remark.heading}-${remarkIndex}`}>
                          <Text style={styles.remarkHeading}>{remark.heading}:</Text>
                          <Text style={styles.remarkBody}>{remark.note}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>

              {isLastOption ? (
                <View style={styles.closingWrap}>
                  <Text style={styles.closingText}>
                    Propuesta formal de servicio logístico preparada para evaluación comercial.
                    Los importes mostrados corresponden únicamente a la versión dirigida al cliente
                  </Text>
                </View>
              ) : null}
            </Page>
          )
        })
      )}
    </Document>
  )
}
