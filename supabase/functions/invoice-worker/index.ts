// Supabase Edge Function: invoice-worker
// Processes pending background jobs from public.invoice_generation_queue using PostgreSQL SKIP LOCKED.
// Strictly requires service_role or CRON_SECRET authorization.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseClient.ts';

interface InvoiceQueueJob {
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
    items?: Array<{
      variant_id: string;
      product_name?: string;
      size?: string;
      color?: string;
      quantity: number;
      unit_price?: number;
      total_price?: number;
      custom_name?: string;
      custom_number?: string;
    }>;
  };
}

function renderInvoiceHtml(snapshot: InvoiceQueueJob['snapshot_data']): string {
  const itemsRows = (snapshot.items || [])
    .map(
      (item, idx) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">${idx + 1}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px;">
          <strong>${item.product_name || `Variant ${item.variant_id.slice(0, 8)}`}</strong>
          <br/><small style="color: #6b7280;">Size: ${item.size || 'M'} | Color: ${item.color || 'Default'}</small>
          ${item.custom_name ? `<br/><small style="color: #8A927A; font-weight: bold;">Custom: ${item.custom_name} #${item.custom_number || ''}</small>` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: center; font-size: 12px;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 12px;">৳${item.unit_price ? Number(item.unit_price).toFixed(2) : '-'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-size: 12px; font-weight: bold;">৳${item.total_price ? Number(item.total_price).toFixed(2) : '-'}</td>
      </tr>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice #${snapshot.order_number} — Eleven Nation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 40px; color: #171717; background: #ffffff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #171717; padding-bottom: 20px; }
    .brand-title { font-size: 26px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
    .brand-tagline { font-size: 11px; color: #77746D; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
    .invoice-meta { text-align: right; }
    .invoice-title { font-size: 20px; font-weight: 800; text-transform: uppercase; color: #171717; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 28px 0; font-size: 12px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #F5F3EE; padding: 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
    .totals-box { margin-top: 24px; float: right; width: 280px; font-size: 12px; }
    .total-line { display: flex; justify-content: space-between; padding: 6px 0; }
    .grand-total { border-top: 2px solid #171717; font-weight: 800; font-size: 15px; margin-top: 8px; padding-top: 8px; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #E1DBD0; font-size: 10px; color: #77746D; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand-title">ELEVEN NATION</div>
      <div class="brand-tagline">Wear Your Identity · Dhaka, Bangladesh</div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">OFFICIAL INVOICE</div>
      <div><strong>Order Ref:</strong> ${snapshot.order_number}</div>
    </div>
  </div>

  <div class="details-grid">
    <div>
      <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #77746D;">Customer & Destination</div>
      <div style="font-weight: bold; font-size: 14px; margin-top: 4px;">${snapshot.customer_name}</div>
      <div>Phone: ${snapshot.customer_phone}</div>
      <div style="white-space: pre-wrap; margin-top: 4px;">${snapshot.shipping_address}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #77746D;">Billing Information</div>
      <div>Payment Method: <strong>Cash on Delivery (COD)</strong></div>
      <div>Currency: <strong>Bangladeshi Taka (BDT ৳)</strong></div>
      <div>Delivery: <strong>Steadfast Courier Network</strong></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th>Product & Details</th>
        <th style="text-align: center; width: 60px;">Qty</th>
        <th style="text-align: right; width: 80px;">Rate</th>
        <th style="text-align: right; width: 90px;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <div class="totals-box">
    <div class="total-line"><span>Subtotal:</span><span>৳${Number(snapshot.subtotal).toFixed(2)}</span></div>
    <div class="total-line"><span>Delivery Fee:</span><span>৳${Number(snapshot.delivery_charge).toFixed(2)}</span></div>
    ${snapshot.discount_amount > 0 ? `<div class="total-line" style="color: #2E7D32;"><span>Discount:</span><span>-৳${Number(snapshot.discount_amount).toFixed(2)}</span></div>` : ''}
    <div class="total-line grand-total"><span>Total Payable:</span><span>৳${Number(snapshot.total).toFixed(2)}</span></div>
  </div>

  <div style="clear: both;"></div>

  <div class="footer">
    Thank you for choosing Eleven Nation. For order support, contact elevennation.support@gmail.com
  </div>
</body>
</html>`;
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Authorization: must match CRON_SECRET or be service_role
  const cronSecret = Deno.env.get('CRON_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

  const isAuthorized =
    (cronSecret && token === cronSecret) ||
    (serviceRoleKey && token === serviceRoleKey);

  if (!isAuthorized) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized: invalid worker credentials' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { batchSize?: number; workerId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // Default values if empty payload
  }

  const batchSize = Math.min(Math.max(body.batchSize || 10, 1), 50);
  const workerId = body.workerId || `worker-${crypto.randomUUID()}`;

  const adminClient = createAdminClient();

  try {
    // 1. Claim batch of jobs atomically via PostgreSQL SKIP LOCKED
    const { data: jobs, error: claimError } = await adminClient.rpc('claim_invoice_queue_jobs', {
      p_worker_id: workerId,
      p_batch_size: batchSize,
      p_lease_seconds: 180,
    });

    if (claimError) {
      return new Response(
        JSON.stringify({ success: false, error: `Claim RPC failed: ${claimError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, errors: 0, message: 'Invoice queue is empty' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let processed = 0;
    let errors = 0;

    for (const job of (jobs as InvoiceQueueJob[])) {
      try {
        const html = renderInvoiceHtml(job.snapshot_data);
        const storagePath = `${job.order_number}/invoice_${job.order_number}.html`;

        // Upload to private 'invoices' storage bucket
        const { error: uploadError } = await adminClient.storage
          .from('invoices')
          .upload(storagePath, new TextEncoder().encode(html), {
            contentType: 'text/html; charset=utf-8',
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Invoice upload failed: ${uploadError.message}`);
        }

        // Generate signed URL (valid for 1 year)
        const { data: signedData, error: signedError } = await adminClient.storage
          .from('invoices')
          .createSignedUrl(storagePath, 31536000);

        if (signedError || !signedData?.signedUrl) {
          throw new Error(`Failed to generate signed URL: ${signedError?.message}`);
        }

        // Complete job in database
        const { data: completedOk, error: completeError } = await adminClient.rpc('complete_invoice_queue_job', {
          p_job_id: job.job_id,
          p_pdf_url: signedData.signedUrl,
          p_worker_id: workerId,
        });

        if (completeError || !completedOk) {
          throw new Error(`Failed to finalize completion in database: ${completeError?.message}`);
        }

        processed++;
      } catch (jobErr: unknown) {
        errors++;
        const errMsg = jobErr instanceof Error ? jobErr.message : 'Unknown generation error';
        await adminClient.rpc('fail_invoice_queue_job', {
          p_job_id: job.job_id,
          p_error_message: errMsg,
          p_worker_id: workerId,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        worker_id: workerId,
        processed,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Worker failure';
    return new Response(JSON.stringify({ success: false, error: errMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
