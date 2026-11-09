import { supabaseAdmin } from './supabaseAdmin';

export interface InvoiceQueueJob {
  job_id: string;
  order_id: string;
  order_number: string;
  snapshot_data: {
    order_number: string;
    customer_name: string;
    customer_phone: string;
    shipping_address: string;
    subtotal: number;
    delivery_charge: number;
    discount_amount: number;
    total: number;
    items: Array<{
      variant_id: string;
      quantity: number;
      custom_name?: string;
      custom_number?: string;
    }>;
  };
}

/**
 * Generates an HTML invoice document with full UTF-8 / Bangla character support
 * that is ready for PDF conversion or direct browser printing.
 */
export function generateInvoiceHtml(snapshot: InvoiceQueueJob['snapshot_data']): string {
  const itemsRows = (snapshot.items || [])
    .map(
      (item, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <strong>Item (Variant ${item.variant_id.slice(0, 8)})</strong>
          ${item.custom_name ? `<br/><small style="color: #6b7280;">Name: ${item.custom_name} | No: ${item.custom_number || '-'}</small>` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="bn">
    <head>
      <meta charset="UTF-8">
      <title>Invoice - ${snapshot.order_number}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Inter:wght@400;600;700&display=swap');
        body { font-family: 'Inter', 'Hind Siliguri', sans-serif; margin: 0; padding: 40px; color: #111827; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 20px; }
        .title { font-size: 24px; font-weight: 700; letter-spacing: 1px; }
        .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 13px; }
        .totals { margin-top: 30px; float: right; width: 300px; }
        .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
        .grand-total { border-top: 2px solid #111827; font-weight: 700; font-size: 18px; margin-top: 8px; padding-top: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">ELEVEN NATION</div>
          <div>Authentic Football Kits & Apparel</div>
        </div>
        <div style="text-align: right;">
          <h2>INVOICE</h2>
          <div><strong>Order #:</strong> ${snapshot.order_number}</div>
        </div>
      </div>

      <div class="details-grid">
        <div>
          <h4>Billed / Shipped To:</h4>
          <div><strong>${snapshot.customer_name}</strong></div>
          <div>${snapshot.customer_phone}</div>
          <div style="white-space: pre-wrap;">${snapshot.shipping_address}</div>
        </div>
        <div style="text-align: right;">
          <h4>Payment Method:</h4>
          <div>Cash on Delivery (COD)</div>
          <div>Currency: BDT (৳)</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px;">#</th>
            <th>Item & Customization</th>
            <th style="text-align: center; width: 80px;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
        </tbody>
      </table>

      <div class="totals">
        <div class="total-row"><span>Subtotal:</span><span>৳ ${Number(snapshot.subtotal).toFixed(2)}</span></div>
        <div class="total-row"><span>Delivery:</span><span>৳ ${Number(snapshot.delivery_charge).toFixed(2)}</span></div>
        ${snapshot.discount_amount > 0 ? `<div class="total-row" style="color: #16a34a;"><span>Discount:</span><span>- ৳ ${Number(snapshot.discount_amount).toFixed(2)}</span></div>` : ''}
        <div class="total-row grand-total"><span>Total Payable:</span><span>৳ ${Number(snapshot.total).toFixed(2)}</span></div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Claims and processes a batch of queued invoice PDF tasks atomically using SKIP LOCKED.
 */
export async function processInvoiceQueueBatch(workerId: string, batchSize = 10): Promise<{ processed: number; errors: number }> {
  const { data: jobs, error: claimError } = await supabaseAdmin.rpc('claim_invoice_queue_jobs', {
    p_worker_id: workerId,
    p_batch_size: batchSize,
    p_lease_seconds: 180,
  });

  if (claimError) {
    throw new Error(`Failed to claim invoice queue jobs: ${claimError.message}`);
  }

  if (!jobs || jobs.length === 0) {
    return { processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  for (const job of (jobs as InvoiceQueueJob[])) {
    try {
      const htmlContent = generateInvoiceHtml(job.snapshot_data);
      const storagePath = `${job.order_number}/invoice_${job.order_number}.html`;

      // Upload rendered invoice document to private 'invoices' bucket
      const { error: uploadError } = await supabaseAdmin.storage
        .from('invoices')
        .upload(storagePath, Buffer.from(htmlContent, 'utf-8'), {
          contentType: 'text/html; charset=utf-8',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Generate signed URL (valid for 1 year)
      const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from('invoices')
        .createSignedUrl(storagePath, 31536000);

      if (signedError || !signedData?.signedUrl) {
        throw new Error(`Signed URL generation failed: ${signedError?.message}`);
      }

      // Mark job completed atomically in database
      const { data: completedOk } = await supabaseAdmin.rpc('complete_invoice_queue_job', {
        p_job_id: job.job_id,
        p_pdf_url: signedData.signedUrl,
        p_worker_id: workerId,
      });

      if (!completedOk) {
        throw new Error('Worker lease expired before job completion could be finalized');
      }

      processed++;
    } catch (err: unknown) {
      errors++;
      const errorMessage = err instanceof Error ? err.message : 'Unknown generation error';
      await supabaseAdmin.rpc('fail_invoice_queue_job', {
        p_job_id: job.job_id,
        p_error_message: errorMessage,
        p_worker_id: workerId,
      });
    }
  }

  return { processed, errors };
}
