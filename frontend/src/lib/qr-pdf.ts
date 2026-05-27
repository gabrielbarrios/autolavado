import jsPDF from "jspdf";

/**
 * Genera un PDF con el QR del cliente y el nombre del autolavado como encabezado.
 * Espera el QR ya renderizado a dataURL (canvas.toDataURL("image/png")).
 */
export function downloadQrPdf(opts: {
  qrDataUrl: string;
  customerName: string;
  qrToken: string;
  businessName: string;
}) {
  const { qrDataUrl, customerName, qrToken, businessName } = opts;

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const padding = 56; // padding generoso de página

  // Header — nombre del autolavado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(20);
  doc.text(businessName, pageWidth / 2, padding + 8, { align: "center" });

  // Separador horizontal bajo el header
  doc.setDrawColor(200);
  doc.setLineWidth(0.7);
  doc.line(padding, padding + 28, pageWidth - padding, padding + 28);

  // Subtítulo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(110);
  doc.text(
    "Código QR personal del cliente",
    pageWidth / 2,
    padding + 50,
    { align: "center" },
  );

  // Nombre del cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20);
  doc.text(customerName, pageWidth / 2, padding + 90, { align: "center" });

  // QR centrado con padding
  const qrSize = 280;
  const qrX = (pageWidth - qrSize) / 2;
  const qrY = padding + 120;
  // Recuadro/Fondo del QR
  doc.setDrawColor(220);
  doc.setFillColor("#ffffff");
  doc.roundedRect(qrX - 14, qrY - 14, qrSize + 28, qrSize + 28, 10, 10, "FD");
  doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);

  // Token bajo el QR
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(qrToken, pageWidth / 2, qrY + qrSize + 40, { align: "center" });

  // Footer
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(
    "Muestra este QR al personal del autolavado para acelerar tu visita.",
    pageWidth / 2,
    pageHeight - padding,
    { align: "center" },
  );

  const safeName = customerName.replace(/[^a-zA-Z0-9-_ ]/g, "").trim() || "cliente";
  doc.save(`qr-${safeName}.pdf`);
}
