import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import type { QuotationCargoLine, QuotationSummary } from "@/lib/db"
import { priorityPalette } from "@/lib/quotations/customerDocument"

type ProviderPricingRequestPdfProps = {
  quotation: QuotationSummary
  cargoLines: QuotationCargoLine[]
  logoDataUri: string
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 9.4,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  header: {
    borderWidth: 1,
    borderColor: "#D7DEE8",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
  },
  headerTop: {
    backgroundColor: priorityPalette.navy,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    padding: 18,
  },
  brandWrap: {
    flex: 1,
  },
  logoShell: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 10,
  },
  logo: {
    width: "100%",
    height: 52,
    objectFit: "contain",
  },
  eyebrow: {
    marginTop: 12,
    fontSize: 8,
    color: "#CFD8E3",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 5,
    fontSize: 21,
    fontWeight: 700,
    color: "#FFFFFF",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 9.2,
    lineHeight: 1.45,
    color: "#E5E5E5",
    maxWidth: 360,
  },
  referenceBox: {
    width: 160,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    padding: 14,
  },
  referenceLabel: {
    fontSize: 8,
    color: "#CFD8E3",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  referenceValue: {
    marginTop: 6,
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: 700,
    lineHeight: 1.3,
  },
  metaRow: {
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
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  metaValue: {
    marginTop: 5,
    fontSize: 9.5,
    color: "#111827",
    fontWeight: 700,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  summaryCard: {
    width: "31.7%",
    borderWidth: 1,
    borderColor: "#E7EAF0",
    borderRadius: 10,
    backgroundColor: "#FBFCFE",
    padding: 10,
    minHeight: 48,
  },
  summaryLabel: {
    fontSize: 7.2,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  summaryValue: {
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
    marginTop: 10,
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
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  fieldValue: {
    marginTop: 3,
    fontSize: 9.2,
    color: "#111827",
    lineHeight: 1.35,
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
  tableHeaderCell: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 7.2,
    color: "#FFFFFF",
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
  closingWrap: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#D7DEE8",
    paddingTop: 14,
  },
  closingText: {
    fontSize: 9.6,
    color: "#334155",
    lineHeight: 1.6,
    textAlign: "center",
  },
})

function renderCell(value: string) {
  return <Text style={styles.tableCell}>{value}</Text>
}

export function ProviderPricingRequestPdf({
  quotation,
  cargoLines,
  logoDataUri,
}: ProviderPricingRequestPdfProps) {
  return (
    <Document
      title={`Solicitud ${quotation.reference_number || ""}`}
      author="Priority Freight Intelligence"
      subject="Solicitud de cotizacion a proveedor"
      creator="Priority ERP"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.brandWrap}>
              <View style={styles.logoShell}>
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image src={logoDataUri} style={styles.logo} />
              </View>
              <Text style={styles.eyebrow}>Documento interno de pricing</Text>
              <Text style={styles.title}>Solicitud de Cotizacion a Proveedor</Text>
              <Text style={styles.subtitle}>
                Documento interno para recopilacion de costos y condiciones. Esta salida no
                muestra nombre de cliente ni importes comerciales.
              </Text>
            </View>

            <View style={styles.referenceBox}>
              <Text style={styles.referenceLabel}>Referencia interna</Text>
              <Text style={styles.referenceValue}>
                {quotation.reference_number || "Pendiente"}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Fecha de emision</Text>
              <Text style={styles.metaValue}>{new Date().toLocaleDateString("es-MX")}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Fecha requerida</Text>
              <Text style={styles.metaValue}>{quotation.required_quote_date || "No disponible"}</Text>
            </View>
            <View style={styles.metaCard}>
              <Text style={styles.metaLabel}>Incoterm</Text>
              <Text style={styles.metaValue}>{quotation.incoterm_code || "No disponible"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Servicio</Text>
            <Text style={styles.summaryValue}>{quotation.service_type || "No disponible"}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Transporte</Text>
            <Text style={styles.summaryValue}>{quotation.transport_type || "No disponible"}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Tipo de operacion</Text>
            <Text style={styles.summaryValue}>{quotation.operation_type || "No disponible"}</Text>
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

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Informacion de carga</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "14%" }]}>Tipo</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Cantidad</Text>
              <Text style={[styles.tableHeaderCell, { width: "24%" }]}>Dimensiones</Text>
              <Text style={[styles.tableHeaderCell, { width: "12%" }]}>Peso</Text>
              <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Commodities</Text>
              <Text style={[styles.tableHeaderCell, { width: "10%" }]}>CBM</Text>
              <Text style={[styles.tableHeaderCell, { width: "10%" }]}>KG / VOL</Text>
            </View>
            {cargoLines.length === 0 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: "100%", textAlign: "center" }]}>
                  No hay informacion de carga capturada todavia.
                </Text>
              </View>
            ) : (
              cargoLines.map((line) => (
                <View key={line.id} style={styles.tableRow}>
                  <View style={{ width: "14%" }}>{renderCell(line.load_type)}</View>
                  <View style={{ width: "12%" }}>
                    {renderCell(line.piece_count != null ? String(line.piece_count) : "—")}
                  </View>
                  <View style={{ width: "24%" }}>
                    {renderCell(
                      [line.length, line.width, line.height].every((value) => value != null)
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
                  <View style={{ width: "10%" }}>
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

        <View style={styles.closingWrap}>
          <Text style={styles.closingText}>
            Solicitud interna para recopilacion de costos y condiciones. Favor de compartir
            tarifa, vigencia, tiempos libres y cualquier observacion operativa aplicable.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
