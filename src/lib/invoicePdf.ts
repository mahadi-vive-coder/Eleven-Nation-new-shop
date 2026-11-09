import { jsPDF } from 'jspdf';
import { Order } from '../types';

export interface InvoicePdfOptions {
  autoPrint?: boolean;
  filename?: string;
}

/**
 * Currency formatter for Bangladesh Taka (BDT)
 */
function formatBdt(amount: number): string {
  const rounded = Math.round(amount);
  return `BDT ${rounded.toLocaleString('en-US')}`;
}

/**
 * Clean text to ensure compatibility with standard PDF rendering
 */
function sanitizeText(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .trim();
}

/**
 * Generates an authoritative, publication-quality A4 PDF invoice for Eleven Nation
 * using jsPDF. Designed with authentic Eleven Nation brand aesthetics:
 * Deep Olive (#1E2618), Vintage Gold (#B08A4A), Cream (#F7F4EC) accents.
 */
export function generateInvoicePdf(order: Order, _options?: InvoicePdfOptions): jsPDF {
  // A4 portrait: 210mm x 297mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm

  // Colors
  const oliveDark = [30, 38, 24]; // #1E2618
  const gold = [176, 138, 74];    // #B08A4A
  const goldLight = [216, 188, 133]; // #D8BC85
  const cream = [247, 244, 236];  // #F7F4EC
  const muted = [119, 116, 109];  // #77746D
  const ink = [23, 23, 23];       // #171717
  const line = [225, 219, 208];   // #E1DBD0

  // 1. Dual Accent Rule at top
  doc.setFillColor(oliveDark[0], oliveDark[1], oliveDark[2]);
  doc.rect(marginX, 12, contentWidth * 0.65, 2, 'F');
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.rect(marginX + contentWidth * 0.65, 12, contentWidth * 0.35, 2, 'F');

  // 2. Masthead Box (Deep Olive background with Gold accent)
  const mastheadY = 16;
  const mastheadHeight = 36;
  doc.setFillColor(oliveDark[0], oliveDark[1], oliveDark[2]);
  doc.roundedRect(marginX, mastheadY, contentWidth, mastheadHeight, 3, 3, 'F');

  // Masthead bottom gold border
  doc.setDrawColor(gold[0], gold[1], gold[2]);
  doc.setLineWidth(0.8);
  doc.line(marginX, mastheadY + mastheadHeight, marginX + contentWidth, mastheadY + mastheadHeight);

  // Brand Name & Tagline (Left side of Masthead)
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('ELEVEN NATION', marginX + 8, mastheadY + 14);

  doc.setTextColor(goldLight[0], goldLight[1], goldLight[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('WEAR YOUR IDENTITY.  |  DHAKA, BANGLADESH', marginX + 8, mastheadY + 22);

  doc.setTextColor(240, 240, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('elevennation.shop  •  support: elevennation.support@gmail.com', marginX + 8, mastheadY + 29);

  // Invoice Title & Meta (Right side of Masthead)
  const rightX = marginX + contentWidth - 8;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TAX INVOICE', rightX, mastheadY + 12, { align: 'right' });

  const invoiceNum = order.orderNumber.startsWith('EN-INV-')
    ? order.orderNumber
    : `EN-INV-${order.orderNumber.replace(/^(EN-ORD-|EN-)/i, '')}`;

  const orderDate = new Date(order.createdAt);
  const formattedDate = isNaN(orderDate.getTime())
    ? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(goldLight[0], goldLight[1], goldLight[2]);
  doc.text(`Invoice No: ${invoiceNum}`, rightX, mastheadY + 19, { align: 'right' });
  doc.setTextColor(255, 255, 255);
  doc.text(`Order Ref: ${order.orderNumber}`, rightX, mastheadY + 25, { align: 'right' });
  doc.text(`Date: ${formattedDate}`, rightX, mastheadY + 31, { align: 'right' });

  // 3. Information Cards (Customer Details & Order Details)
  const cardsY = mastheadY + mastheadHeight + 8;
  const cardWidth = (contentWidth - 6) / 2; // 88mm each
  const cardHeight = 44;

  // Left Card: Customer Details
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(line[0], line[1], line[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX, cardsY, cardWidth, cardHeight, 2, 2, 'FD');

  // Left Card Header
  doc.setFillColor(cream[0], cream[1], cream[2]);
  doc.roundedRect(marginX, cardsY, cardWidth, 8, 2, 2, 'F');
  doc.rect(marginX, cardsY + 4, cardWidth, 4, 'F'); // flatten bottom corners of header
  doc.line(marginX, cardsY + 8, marginX + cardWidth, cardsY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(oliveDark[0], oliveDark[1], oliveDark[2]);
  doc.text('CUSTOMER & DELIVERY DETAILS', marginX + 6, cardsY + 5.5);

  // Left Card Body
  doc.setFontSize(7.5);
  let cy = cardsY + 13;
  const labelX = marginX + 6;
  const valX = marginX + cardWidth - 6;

  const renderKv = (label: string, value: string, isRightAligned = true) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(label, labelX, cy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(ink[0], ink[1], ink[2]);
    if (isRightAligned) {
      doc.text(value, valX, cy, { align: 'right' });
    } else {
      doc.text(value, labelX + 26, cy);
    }
    cy += 5.5;
  };

  renderKv('Customer:', sanitizeText(order.customerName));
  renderKv('Phone:', sanitizeText(order.customerPhone));
  renderKv('District:', sanitizeText(order.deliveryAddress.district || 'Dhaka'));
  
  // Wrap address if long
  const rawAddr = sanitizeText(order.deliveryAddress.fullAddress || order.deliveryAddress.area);
  const splitAddr = doc.splitTextToSize(rawAddr, 50);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text('Address:', labelX, cy);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.text(splitAddr[0] || '', valX, cy, { align: 'right' });

  // Right Card: Order & Payment Status
  const rightCardX = marginX + cardWidth + 6;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(line[0], line[1], line[2]);
  doc.roundedRect(rightCardX, cardsY, cardWidth, cardHeight, 2, 2, 'FD');

  // Right Card Header
  doc.setFillColor(cream[0], cream[1], cream[2]);
  doc.roundedRect(rightCardX, cardsY, cardWidth, 8, 2, 2, 'F');
  doc.rect(rightCardX, cardsY + 4, cardWidth, 4, 'F');
  doc.line(rightCardX, cardsY + 8, rightCardX + cardWidth, cardsY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(oliveDark[0], oliveDark[1], oliveDark[2]);
  doc.text('ORDER & PAYMENT DETAILS', rightCardX + 6, cardsY + 5.5);

  // Right Card Body
  cy = cardsY + 13;
  const rLabelX = rightCardX + 6;
  const rValX = rightCardX + cardWidth - 6;

  const renderRightKv = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(label, rLabelX, cy);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text(value, rValX, cy, { align: 'right' });
    cy += 5.5;
  };

  const isDelivered = order.status.toLowerCase() === 'delivered';
  const paymentStatus = isDelivered ? 'PAID (Cash Collected)' : 'DUE (Cash on Delivery)';

  renderRightKv('Payment Method:', 'Cash on Delivery (COD)');
  renderRightKv('Order Status:', order.status.toUpperCase());
  renderRightKv('Payment Status:', paymentStatus);
  renderRightKv('Currency:', 'BDT (Taka - BDT)');
  renderRightKv('Delivery Via:', 'Designated Courier Service');

  // 4. Order Items Table
  const tableY = cardsY + cardHeight + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(oliveDark[0], oliveDark[1], oliveDark[2]);
  doc.text('ORDER ITEMS', marginX, tableY);

  // Table Header
  const thY = tableY + 3;
  const thHeight = 7;
  doc.setFillColor(oliveDark[0], oliveDark[1], oliveDark[2]);
  doc.rect(marginX, thY, contentWidth, thHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(goldLight[0], goldLight[1], goldLight[2]);

  const colX = {
    sl: marginX + 3,
    item: marginX + 14,
    size: marginX + 96,
    qty: marginX + 114,
    rate: marginX + 144,
    total: marginX + contentWidth - 4,
  };

  doc.text('SL', colX.sl, thY + 4.8);
  doc.text('ITEM DESCRIPTION', colX.item, thY + 4.8);
  doc.text('SIZE', colX.size, thY + 4.8, { align: 'center' });
  doc.text('QTY', colX.qty, thY + 4.8, { align: 'center' });
  doc.text('UNIT PRICE', colX.rate, thY + 4.8, { align: 'right' });
  doc.text('TOTAL (BDT)', colX.total, thY + 4.8, { align: 'right' });

  // Table Rows
  let rowY = thY + thHeight;
  let customSum = 0;

  order.items.forEach((item, idx) => {
    const isEven = idx % 2 === 1;
    const hasCustomization = Boolean(item.customization && (item.customization.name || item.customization.number));
    const rowHeight = hasCustomization ? 12 : 8;

    if (isEven) {
      doc.setFillColor(cream[0], cream[1], cream[2]);
      doc.rect(marginX, rowY, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(line[0], line[1], line[2]);
    doc.setLineWidth(0.2);
    doc.line(marginX, rowY + rowHeight, marginX + contentWidth, rowY + rowHeight);

    // SL
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(String(idx + 1).padStart(2, '0'), colX.sl, rowY + 5.2);

    // Item Title
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(ink[0], ink[1], ink[2]);
    const cleanTitle = sanitizeText(item.productName);
    doc.text(cleanTitle.slice(0, 48), colX.item, rowY + 5.2);

    // Customization Subtitle if present
    if (hasCustomization && item.customization) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(oliveDark[0], oliveDark[1], oliveDark[2]);
      const customDetail = `Custom: ${item.customization.name || 'N/A'} (#${item.customization.number || '0'}) +BDT ${item.customization.price || 0}`;
      doc.text(customDetail, colX.item + 2, rowY + 9.5);
      customSum += (item.customization.price || 0) * item.quantity;
    }

    // Size
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(oliveDark[0], oliveDark[1], oliveDark[2]);
    doc.text(item.size || '-', colX.size, rowY + 5.2, { align: 'center' });

    // Qty
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(ink[0], ink[1], ink[2]);
    doc.text(String(item.quantity), colX.qty, rowY + 5.2, { align: 'center' });

    // Unit Price
    doc.text(formatBdt(item.unitPrice), colX.rate, rowY + 5.2, { align: 'right' });

    // Line Total
    doc.setFont('helvetica', 'bold');
    doc.text(formatBdt(item.totalPrice), colX.total, rowY + 5.2, { align: 'right' });

    rowY += rowHeight;
  });

  // 5. Bottom Section: Notes & Summary
  const bottomY = rowY + 6;
  const summaryWidth = 78;
  const notesWidth = contentWidth - summaryWidth - 6;

  // Notes Box (Left)
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(line[0], line[1], line[2]);
  doc.roundedRect(marginX, bottomY, notesWidth, 38, 2, 2, 'FD');

  doc.setFillColor(cream[0], cream[1], cream[2]);
  doc.roundedRect(marginX, bottomY, notesWidth, 7, 2, 2, 'F');
  doc.rect(marginX, bottomY + 4, notesWidth, 3, 'F');
  doc.line(marginX, bottomY + 7, marginX + notesWidth, bottomY + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(oliveDark[0], oliveDark[1], oliveDark[2]);
  doc.text('DELIVERY & SPECIAL INSTRUCTIONS', marginX + 5, bottomY + 4.8);

  const orderNote = sanitizeText(order.deliveryAddress.instructions || order.notes || 'Handle parcel with care. Verify size with customer prior to dispatch.');
  const wrappedNotes = doc.splitTextToSize(orderNote, notesWidth - 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(wrappedNotes, marginX + 5, bottomY + 13);

  // Summary Card (Right)
  const summaryX = marginX + notesWidth + 6;
  const summaryHeight = 44;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(line[0], line[1], line[2]);
  doc.roundedRect(summaryX, bottomY, summaryWidth, summaryHeight, 2, 2, 'FD');

  let sy = bottomY + 6;
  const sLabelX = summaryX + 5;
  const sValX = summaryX + summaryWidth - 5;

  const renderSummaryRow = (label: string, value: string, isDeduction = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text(label, sLabelX, sy);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(isDeduction ? 180 : ink[0], isDeduction ? 40 : ink[1], isDeduction ? 40 : ink[2]);
    doc.text(value, sValX, sy, { align: 'right' });
    sy += 5.2;
  };

  renderSummaryRow('Items Subtotal:', formatBdt(order.subtotal));
  if (customSum > 0) {
    renderSummaryRow('Customization Charge:', formatBdt(customSum));
  }
  if (order.discount > 0) {
    renderSummaryRow('Discount Applied:', `- ${formatBdt(order.discount)}`, true);
  }
  renderSummaryRow('Delivery Charge:', order.deliveryCharge === 0 ? 'FREE' : formatBdt(order.deliveryCharge));

  // Grand Total Highlight Block
  const grandTotalY = sy + 1;
  doc.setFillColor(oliveDark[0], oliveDark[1], oliveDark[2]);
  doc.roundedRect(summaryX + 2, grandTotalY, summaryWidth - 4, 11, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(goldLight[0], goldLight[1], goldLight[2]);
  doc.text('TOTAL DUE (COD):', summaryX + 5, grandTotalY + 7);

  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(formatBdt(order.grandTotal), summaryX + summaryWidth - 5, grandTotalY + 7, { align: 'right' });

  // 6. Security & Verification Watermark / Seal
  const footerY = pageHeight - 26;
  doc.setDrawColor(gold[0], gold[1], gold[2]);
  doc.setLineWidth(0.6);
  doc.line(marginX, footerY, marginX + contentWidth, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(oliveDark[0], oliveDark[1], oliveDark[2]);
  doc.text('THANK YOU FOR SHOPPING WITH ELEVEN NATION', pageWidth / 2, footerY + 5.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text('Wear Your Identity. Authentic Streetwear & Matchday Football Jerseys in Bangladesh.', pageWidth / 2, footerY + 9.5, { align: 'center' });
  doc.text('Official Website: elevennation.shop  •  Customer Support WhatsApp: +880 1700-000000', pageWidth / 2, footerY + 13.5, { align: 'center' });

  return doc;
}

/**
 * Triggers client-side direct download of the PDF invoice
 */
export function downloadInvoicePdf(order: Order, filename?: string): void {
  const doc = generateInvoicePdf(order);
  const finalFilename = filename || `ElevenNation_Invoice_${order.orderNumber}.pdf`;
  doc.save(finalFilename);
}

/**
 * Returns raw Uint8Array bytes of the generated PDF (for server-side upload or streaming)
 */
export function getInvoicePdfBytes(order: Order): Uint8Array {
  const doc = generateInvoicePdf(order);
  const arrayBuffer = doc.output('arraybuffer');
  return new Uint8Array(arrayBuffer);
}

/**
 * Returns Blob of generated PDF (for in-browser preview or iframe embedding)
 */
export function getInvoicePdfBlob(order: Order): Blob {
  const doc = generateInvoicePdf(order);
  return doc.output('blob');
}
