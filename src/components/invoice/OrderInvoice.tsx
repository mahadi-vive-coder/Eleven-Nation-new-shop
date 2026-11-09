import React from 'react';
import { Order } from '../../types';

interface OrderInvoiceProps {
  order: Order;
  className?: string;
}

export const OrderInvoice: React.FC<OrderInvoiceProps> = ({ order, className = '' }) => {
  // Format invoice reference: EN-INV-XXXXX
  const invoiceNumber = order.orderNumber.startsWith('EN-INV-')
    ? order.orderNumber
    : order.orderNumber.replace(/^(EN-ORD-|EN-)/i, 'EN-INV-') || `EN-INV-${order.orderNumber}`;

  // Format order date nicely (e.g. 05 November 2026)
  const orderDate = new Date(order.createdAt);
  const formattedDate = isNaN(orderDate.getTime())
    ? new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : orderDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  // Payment status
  const isPaid = order.status === 'Delivered';
  const paymentStatus = isPaid ? 'Paid' : 'Unpaid';

  // Calculate customization charge sum across items
  const customizationTotal = order.items.reduce(
    (sum, item) => sum + (item.customization ? (item.customization.price || 0) * item.quantity : 0),
    0
  );

  // Order notes
  const orderNotes = order.deliveryAddress.instructions || order.notes || '';

  return (
    <div className={`en-invoice-scope ${className}`}>
      <style>{`
        .en-invoice-scope {
          --bg:         #EDE8DE;
          --ink:        #171717;
          --white:      #FFFFFF;
          --cream:      #F7F4EC;
          --cream-2:    #FBF9F3;
          --muted:      #77746D;
          --line:       #E1DBD0;
          --olive-900:  #1E2618;
          --olive-800:  #2B3527;
          --olive-600:  #4A5A40;
          --sage:       #8A927A;
          --gold:       #B08A4A;
          --gold-light: #D8BC85;
          --gold-deep:  #8A6A2F;
          --gold-tint:  rgba(176,138,74,.14);
          --olive-tint: rgba(74,90,64,.10);

          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          font-size: 13px;
          line-height: 1.55;
          color: var(--ink);
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }

        .en-invoice-scope *,
        .en-invoice-scope *::before,
        .en-invoice-scope *::after {
          box-sizing: border-box;
        }

        /* ---------- A4 SHEET ---------- */
        .en-invoice-scope .sheet {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: var(--white);
          padding: 16mm 15mm 13mm;
          border: 1px solid var(--line);
          border-radius: 10px;
          box-shadow: 0 2px 4px rgba(30,38,24,.05), 0 18px 44px rgba(30,38,24,.10);
        }

        /* ---------- SLIM BRAND RULE ---------- */
        .en-invoice-scope .brand-rule {
          display: flex;
          height: 3px;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 22px;
        }
        .en-invoice-scope .brand-rule span:first-child { flex: 0 0 64%; background: var(--olive-800); }
        .en-invoice-scope .brand-rule span:last-child { flex: 1; background: var(--gold); }

        /* ---------- MASTHEAD ---------- */
        .en-invoice-scope .masthead {
          position: relative;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 28px;
          padding: 26px 28px 24px;
          border-radius: 12px;
          background: var(--olive-900);
          border-bottom: 2px solid var(--gold);
          color: var(--cream);
          overflow: hidden;
        }

        .en-invoice-scope .brand { flex: 0 0 auto; }

        .en-invoice-scope .logo {
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          font-size: 27px;
          line-height: .98;
          letter-spacing: .17em;
          text-transform: uppercase;
          color: var(--cream);
        }
        .en-invoice-scope .logo span { display: block; }

        .en-invoice-scope .tagline {
          margin-top: 12px;
          font-family: 'Manrope', sans-serif;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .26em;
          text-transform: uppercase;
          color: var(--gold-light);
        }

        .en-invoice-scope .invoice-meta {
          text-align: right;
          min-width: 246px;
        }

        .en-invoice-scope .invoice-meta h1 {
          margin: 0 0 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(216,188,133,.35);
          font-family: 'Manrope', sans-serif;
          font-size: 19px;
          font-weight: 800;
          letter-spacing: .26em;
          text-transform: uppercase;
          color: var(--cream);
        }

        .en-invoice-scope .meta-list {
          margin: 0;
          display: grid;
          gap: 7px;
        }

        .en-invoice-scope .meta-row {
          display: flex;
          justify-content: flex-end;
          align-items: baseline;
          gap: 16px;
          font-size: 12px;
        }
        .en-invoice-scope .meta-row .k {
          color: rgba(247,244,236,.58);
          letter-spacing: .02em;
        }
        .en-invoice-scope .meta-row .v {
          font-weight: 500;
          color: var(--cream);
          min-width: 136px;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        /* ---------- SECTIONS ---------- */
        .en-invoice-scope .section { margin-top: 24px; }

        .en-invoice-scope .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 12px;
          font-family: 'Manrope', sans-serif;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: var(--olive-800);
        }
        .en-invoice-scope .section-title::before {
          content: "";
          width: 20px;
          height: 2px;
          border-radius: 2px;
          background: var(--gold);
          display: block;
        }

        /* ---------- INFO CARDS ---------- */
        .en-invoice-scope .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .en-invoice-scope .card {
          background: var(--white);
          border: 1px solid var(--line);
          border-radius: 10px;
          overflow: hidden;
        }

        .en-invoice-scope .card-head {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 10px 18px;
          background: var(--cream);
          border-bottom: 1px solid var(--line);
          font-family: 'Manrope', sans-serif;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: .17em;
          text-transform: uppercase;
          color: var(--olive-800);
        }
        .en-invoice-scope .card-head--gold { background: var(--gold-tint); border-bottom-color: rgba(176,138,74,.30); }
        .en-invoice-scope .card-head--olive { background: var(--olive-tint); border-bottom-color: rgba(74,90,64,.22); }

        .en-invoice-scope .dot {
          width: 6px;
          height: 6px;
          border-radius: 2px;
          display: block;
          flex: 0 0 auto;
        }
        .en-invoice-scope .dot--olive { background: var(--olive-600); }
        .en-invoice-scope .dot--gold { background: var(--gold); }

        .en-invoice-scope .card-body { padding: 12px 18px 14px; }

        .en-invoice-scope .kv {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          padding: 7px 0;
          font-size: 12.5px;
        }
        .en-invoice-scope .kv + .kv { border-top: 1px solid rgba(225,219,208,.75); }
        .en-invoice-scope .kv .k { color: var(--muted); flex: 0 0 auto; }
        .en-invoice-scope .kv .v {
          font-weight: 500;
          color: var(--ink);
          text-align: right;
          flex: 1 1 auto;
          word-break: break-word;
          font-variant-numeric: tabular-nums;
        }

        /* ---------- ITEMS TABLE ---------- */
        .en-invoice-scope .table-wrap { width: 100%; }

        .en-invoice-scope .items {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 12.5px;
          border-radius: 10px;
          overflow: hidden;
        }

        .en-invoice-scope .items thead th {
          background: var(--olive-900);
          padding: 11px 10px;
          text-align: left;
          font-family: 'Manrope', sans-serif;
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: var(--gold-light);
          white-space: nowrap;
        }
        .en-invoice-scope .items thead th:first-child { padding-left: 14px; }
        .en-invoice-scope .items thead th:last-child { padding-right: 14px; }

        .en-invoice-scope .items tbody td {
          padding: 14px 10px;
          vertical-align: top;
          border-bottom: 1px solid var(--line);
        }
        .en-invoice-scope .items tbody td:first-child { padding-left: 14px; }
        .en-invoice-scope .items tbody td:last-child { padding-right: 14px; }

        .en-invoice-scope .items tbody tr:nth-child(even) td { background: var(--cream-2); }
        .en-invoice-scope .items tbody tr:last-child td { border-bottom: 0; }

        .en-invoice-scope .items .num { text-align: right; font-variant-numeric: tabular-nums; }
        .en-invoice-scope .items .ctr { text-align: center; }

        .en-invoice-scope .p-name {
          font-weight: 500;
          font-size: 13px;
          color: var(--ink);
          letter-spacing: .005em;
        }

        .en-invoice-scope .p-custom {
          margin-top: 8px;
          padding-left: 11px;
          border-left: 2px solid var(--gold);
          display: grid;
          gap: 2px;
        }
        .en-invoice-scope .p-custom span {
          font-size: 10.5px;
          color: var(--muted);
          letter-spacing: .015em;
        }
        .en-invoice-scope .p-custom b {
          font-weight: 700;
          color: var(--olive-800);
          letter-spacing: .06em;
        }

        .en-invoice-scope .sku {
          color: var(--muted);
          font-size: 11px;
          letter-spacing: .06em;
          white-space: nowrap;
        }

        .en-invoice-scope .size-cell { font-weight: 700; color: var(--olive-800); }
        .en-invoice-scope .qty-cell { font-weight: 500; font-variant-numeric: tabular-nums; }
        .en-invoice-scope .total-cell { font-weight: 700; }

        /* ---------- BOTTOM AREA ---------- */
        .en-invoice-scope .bottom {
          display: grid;
          grid-template-columns: 1fr 304px;
          gap: 14px;
          align-items: start;
          margin-top: 16px;
        }

        .en-invoice-scope .stack { display: grid; gap: 14px; }

        /* ---------- TOTALS ---------- */
        .en-invoice-scope .totals .card-body { padding: 14px 18px 16px; }

        .en-invoice-scope .totals .kv { padding: 6px 0; font-size: 12.5px; }

        .en-invoice-scope .grand {
          margin-top: 14px;
          padding: 14px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          border-radius: 10px;
          background: var(--olive-900);
          border: 1px solid var(--olive-900);
        }
        .en-invoice-scope .grand .k {
          font-family: 'Manrope', sans-serif;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: var(--gold-light);
        }
        .en-invoice-scope .grand .v {
          font-family: 'Manrope', sans-serif;
          font-size: 21px;
          font-weight: 800;
          letter-spacing: .01em;
          color: var(--white);
          font-variant-numeric: tabular-nums;
          line-height: 1.1;
        }

        /* ---------- BADGE ---------- */
        .en-invoice-scope .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 3px 11px;
          border-radius: 999px;
          background: var(--gold-tint);
          border: 1px solid rgba(176,138,74,.45);
          font-family: 'Manrope', sans-serif;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
          color: var(--gold-deep);
          line-height: 1.7;
        }
        .en-invoice-scope .badge::before {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--gold);
          display: block;
        }

        /* ---------- NOTES ---------- */
        .en-invoice-scope .note-text {
          font-size: 12px;
          color: var(--muted);
          line-height: 1.7;
          margin: 0;
        }
        .en-invoice-scope .note-text.empty { font-style: italic; opacity: .7; }

        /* ---------- FOOTER ---------- */
        .en-invoice-scope .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid var(--gold);
          text-align: center;
        }
        .en-invoice-scope .footer .thanks {
          font-family: 'Manrope', sans-serif;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: var(--olive-900);
        }
        .en-invoice-scope .footer .identity {
          margin-top: 8px;
          font-family: 'Manrope', sans-serif;
          font-size: 8.5px;
          font-weight: 800;
          letter-spacing: .34em;
          text-transform: uppercase;
          color: var(--gold);
        }
        .en-invoice-scope .footer .site {
          margin-top: 10px;
          font-size: 11px;
          letter-spacing: .1em;
          color: var(--muted);
        }

        /* ---------- RESPONSIVE SCREEN ---------- */
        @media screen and (max-width: 860px) {
          .en-invoice-scope .sheet { width: 100%; min-height: 0; padding: 26px 20px 24px; }
          .en-invoice-scope .masthead { flex-direction: column; gap: 22px; padding: 22px 20px 20px; }
          .en-invoice-scope .invoice-meta { text-align: left; min-width: 0; width: 100%; }
          .en-invoice-scope .invoice-meta h1 { border-bottom: 0; padding-bottom: 0; margin-bottom: 12px; }
          .en-invoice-scope .meta-row { justify-content: flex-start; }
          .en-invoice-scope .meta-row .v { min-width: 0; text-align: left; }
          .en-invoice-scope .grid-2, .en-invoice-scope .bottom { grid-template-columns: 1fr; }
          .en-invoice-scope .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .en-invoice-scope .items { min-width: 580px; }
        }

        /* ============================================================
           PRINT — A4 PORTRAIT
           ============================================================ */
        @page {
          size: A4 portrait;
          margin: 13mm;
        }

        @media print {
          /* Hide non-invoice elements during print */
          header, footer, nav, .no-print, .top-announcement-bar {
            display: none !important;
          }

          html, body {
            background: #FFFFFF !important;
            padding: 0 !important;
            margin: 0 !important;
            font-size: 12px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .en-invoice-scope {
            padding: 0 !important;
            margin: 0 !important;
            background: #FFFFFF !important;
          }

          .en-invoice-scope .sheet {
            width: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #FFFFFF !important;
          }

          .en-invoice-scope .masthead,
          .en-invoice-scope .items thead th,
          .en-invoice-scope .grand,
          .en-invoice-scope .badge,
          .en-invoice-scope .card-head,
          .en-invoice-scope .brand-rule span,
          .en-invoice-scope .footer {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .en-invoice-scope .brand-rule { margin-bottom: 16px; }
          .en-invoice-scope .masthead { padding: 20px 22px 18px; }
          .en-invoice-scope .section { margin-top: 18px; }

          /* page-break safety */
          .en-invoice-scope .card,
          .en-invoice-scope .grand,
          .en-invoice-scope .bottom,
          .en-invoice-scope .footer {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .en-invoice-scope .items tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .en-invoice-scope thead { display: table-header-group; }
          .en-invoice-scope tfoot { display: table-footer-group; }

          .en-invoice-scope .table-wrap { overflow: visible !important; }
          .en-invoice-scope .items { min-width: 0 !important; }

          a { color: inherit; text-decoration: none; }
        }
      `}</style>

      <main className="sheet" role="document" aria-label={`Invoice ${invoiceNumber}`}>
        {/* ===================== SLIM BRAND RULE ===================== */}
        <div className="brand-rule" aria-hidden="true">
          <span></span>
          <span></span>
        </div>

        {/* ========================= MASTHEAD ======================== */}
        <header className="masthead">
          <div className="brand">
            <div className="logo" aria-label="Eleven Nation">
              <span>Eleven</span>
              <span>Nation</span>
            </div>
            <div className="tagline">Wear Your Identity.</div>
          </div>

          <div className="invoice-meta">
            <h1>Invoice</h1>
            <div className="meta-list">
              <div className="meta-row">
                <span className="k">Invoice No</span>
                <span className="v">{invoiceNumber}</span>
              </div>
              <div className="meta-row">
                <span className="k">Order No</span>
                <span className="v">{order.orderNumber}</span>
              </div>
              <div className="meta-row">
                <span className="k">Invoice Date</span>
                <span className="v">{formattedDate}</span>
              </div>
            </div>
          </div>
        </header>

        {/* ================= CUSTOMER / ORDER INFORMATION ============ */}
        <section className="section" aria-label="Customer and order information">
          <div className="grid-2">
            {/* LEFT CARD */}
            <div className="card">
              <div className="card-head card-head--olive">
                <span className="dot dot--olive"></span>Customer Details
              </div>
              <div className="card-body">
                <div className="kv">
                  <span className="k">Customer Name</span>
                  <span className="v">{order.customerName}</span>
                </div>
                <div className="kv">
                  <span className="k">Phone Number</span>
                  <span className="v">{order.customerPhone}</span>
                </div>
                <div className="kv">
                  <span className="k">Email Address</span>
                  <span className="v">{order.customerEmail || 'N/A'}</span>
                </div>
                <div className="kv">
                  <span className="k">Delivery Address</span>
                  <span className="v">{order.deliveryAddress.fullAddress}</span>
                </div>
                <div className="kv">
                  <span className="k">City / District</span>
                  <span className="v">{order.deliveryAddress.district}</span>
                </div>
              </div>
            </div>

            {/* RIGHT CARD */}
            <div className="card">
              <div className="card-head card-head--gold">
                <span className="dot dot--gold"></span>Order Details
              </div>
              <div className="card-body">
                <div className="kv">
                  <span className="k">Order Number</span>
                  <span className="v">{order.orderNumber}</span>
                </div>
                <div className="kv">
                  <span className="k">Order Date</span>
                  <span className="v">{formattedDate}</span>
                </div>
                <div className="kv">
                  <span className="k">Payment Method</span>
                  <span className="v">{order.paymentMethod}</span>
                </div>
                <div className="kv">
                  <span className="k">Order Status</span>
                  <span className="v">{order.status}</span>
                </div>
                <div className="kv">
                  <span className="k">Payment Status</span>
                  <span className="v">{paymentStatus}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ======================= PRODUCT TABLE ===================== */}
        <section className="section" aria-label="Order items">
          <h2 className="section-title">Order Items</h2>

          <div className="table-wrap">
            <table className="items">
              <thead>
                <tr>
                  <th className="ctr" style={{ width: '6%' }}>SL</th>
                  <th style={{ width: '34%' }}>Product Name</th>
                  <th style={{ width: '14%' }}>SKU</th>
                  <th className="ctr" style={{ width: '8%' }}>Size</th>
                  <th className="ctr" style={{ width: '8%' }}>Qty</th>
                  <th className="num" style={{ width: '15%' }}>Unit Price</th>
                  <th className="num" style={{ width: '15%' }}>Total</th>
                </tr>
              </thead>

              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="ctr">{String(idx + 1).padStart(2, '0')}</td>
                    <td>
                      <div className="p-name">{item.productName}</div>
                      {item.customization && (
                        <div className="p-custom">
                          <span>Custom Name: <b>{item.customization.name}</b></span>
                          <span>Squad Number: <b>{item.customization.number}</b></span>
                        </div>
                      )}
                    </td>
                    <td><span className="sku">{item.variantSku || 'EN-ITEM'}</span></td>
                    <td className="ctr size-cell">{item.size}</td>
                    <td className="ctr qty-cell">{item.quantity}</td>
                    <td className="num">৳{item.unitPrice.toLocaleString()}</td>
                    <td className="num total-cell">৳{item.totalPrice.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ================== PAYMENT / NOTES / TOTALS =============== */}
        <section className="bottom" aria-label="Payment summary">
          {/* LEFT COLUMN */}
          <div className="stack">
            {/* PAYMENT INFORMATION */}
            <div className="card">
              <div className="card-head card-head--gold">
                <span className="dot dot--gold"></span>Payment Information
              </div>
              <div className="card-body">
                <div className="kv">
                  <span className="k">Payment Method</span>
                  <span className="v">{order.paymentMethod}</span>
                </div>
                <div className="kv">
                  <span className="k">Payment Status</span>
                  <span className="v"><span className="badge">{paymentStatus}</span></span>
                </div>
                <div className="kv">
                  <span className="k">Amount Due</span>
                  <span className="v">৳{order.grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* ORDER NOTES (optional) */}
            <div className="card">
              <div className="card-head card-head--olive">
                <span className="dot dot--olive"></span>Order Notes
              </div>
              <div className="card-body">
                {orderNotes ? (
                  <p className="note-text">{orderNotes}</p>
                ) : (
                  <p className="note-text empty">No additional notes for this order.</p>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — PRICE SUMMARY */}
          <div className="card totals">
            <div className="card-head">
              <span className="dot dot--olive"></span>Price Summary
            </div>
            <div className="card-body">
              <div className="kv">
                <span className="k">Subtotal</span>
                <span className="v">৳{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="kv">
                <span className="k">Discount</span>
                <span className="v">
                  {order.discount > 0 ? `− ৳${order.discount.toLocaleString()}` : '৳0'}
                </span>
              </div>
              <div className="kv">
                <span className="k">Delivery Charge</span>
                <span className="v">
                  {order.deliveryCharge === 0 ? 'FREE' : `৳${order.deliveryCharge.toLocaleString()}`}
                </span>
              </div>
              <div className="kv">
                <span className="k">Customization Charge</span>
                <span className="v">
                  {customizationTotal > 0 ? `৳${customizationTotal.toLocaleString()}` : '৳0'}
                </span>
              </div>

              <div className="grand">
                <span className="k">Grand Total</span>
                <span className="v">৳{order.grandTotal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================== FOOTER ======================== */}
        <footer className="footer">
          <div className="thanks">Thank you for shopping with Eleven Nation.</div>
          <div className="identity">Wear Your Identity.</div>
          <div className="site">elevennation.shop</div>
        </footer>
      </main>
    </div>
  );
};
