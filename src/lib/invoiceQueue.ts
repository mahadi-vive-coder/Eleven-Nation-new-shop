import { createClient } from '@supabase/supabase-js';
import { getInvoicePdfBytes } from './invoicePdf';
import { Order } from '../types';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase admin credentials are missing');
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface InvoiceJob {
  job_id: string;
  order_id: string;
  order_number: string;
  snapshot_data: Record<string, unknown>;
}

/**
 * Worker process to claim and generate queued invoice PDFs.
 * Uses atomic PostgreSQL SKIP LOCKED so multiple workers never process the same job.
 */
export async function processInvoiceBatch(workerId: string, batchSize = 10): Promise<{ processed: number; errors: number }> {
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Claim batch of jobs atomically
  const { data: jobs, error: claimError } = await supabaseAdmin.rpc('claim_invoice_queue_jobs', {
    p_worker_id: workerId,
    p_batch_size: batchSize,
    p_lease_seconds: 180,
  });

  if (claimError) {
    throw new Error(`Failed to claim invoice jobs: ${claimError.message}`);
  }

  if (!jobs || jobs.length === 0) {
    return { processed: 0, errors: 0 };
  }

  let processed = 0;
  let errors = 0;

  for (const job of (jobs as InvoiceJob[])) {
    try {
      const invoicePath = `${job.order_number}/invoice_${job.order_number}.pdf`;
      const snap = job.snapshot_data || {};
      
      const orderModel: Order = {
        id: job.order_id,
        orderNumber: job.order_number,
        customerName: (snap.customer_name as string) || 'Customer',
        customerPhone: (snap.customer_phone as string) || '',
        customerEmail: (snap.customer_email as string) || '',
        deliveryAddress: {
          district: (snap.delivery_zone as string) === 'inside_dhaka' ? 'Dhaka' : 'Outside Dhaka',
          area: '',
          fullAddress: (snap.shipping_address as string) || 'Bangladesh',
          instructions: (snap.delivery_instructions as string) || '',
        },
        items: Array.isArray(snap.items) ? (snap.items as any) : [],
        subtotal: Number(snap.subtotal) || 0,
        deliveryCharge: Number(snap.delivery_charge) || 0,
        discount: Number(snap.discount_amount) || 0,
        grandTotal: Number(snap.total) || 0,
        paymentMethod: 'Cash on Delivery',
        status: (snap.status as any) || 'Pending',
        timeline: [],
        createdAt: (snap.created_at as string) || new Date().toISOString(),
      };

      const realPdfBytes = getInvoicePdfBytes(orderModel);

      const { error: uploadError } = await supabaseAdmin.storage
        .from('invoices')
        .upload(invoicePath, realPdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      // Generate signed URL (expires in 1 year for private bucket) or store storage path
      const { data: signedData } = await supabaseAdmin.storage
        .from('invoices')
        .createSignedUrl(invoicePath, 31536000);

      const pdfUrl = signedData?.signedUrl || invoicePath;

      // Mark job completed atomically
      await supabaseAdmin.rpc('complete_invoice_queue_job', {
        p_job_id: job.job_id,
        p_pdf_url: pdfUrl,
        p_worker_id: workerId,
      });

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
