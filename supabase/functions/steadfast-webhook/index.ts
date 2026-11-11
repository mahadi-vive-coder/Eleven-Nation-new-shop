// Supabase Edge Function: steadfast-webhook
// Secure inbound webhook receiver for Steadfast Courier status updates.
// Authenticates webhook requests using the shared STEADFAST_WEBHOOK_SECRET.
// Deduplicates and transactionally processes shipment status updates via PostgreSQL RPC.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseClient.ts';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const expectedSecret = Deno.env.get('STEADFAST_WEBHOOK_SECRET');

  // Verify webhook authenticity: header 'x-webhook-secret', query param '?token=', or bearer token
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token') || url.searchParams.get('secret');
  const tokenFromHeader = req.headers.get('x-webhook-secret') || req.headers.get('x-steadfast-secret');
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  const tokenFromBearer = authHeader?.startsWith('Bearer ') ? authHeader.replace(/^Bearer\s+/i, '').trim() : null;

  const providedSecret = tokenFromHeader || tokenFromQuery || tokenFromBearer;

  if (expectedSecret && providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized webhook request' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Malformed JSON payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Extract consignment_id and courier_status from Steadfast webhook format
  const rawConsignmentId = payload.consignment_id || payload.id || payload.consignmentId || payload.tracking_code;
  const rawStatus = payload.status || payload.delivery_status || payload.courier_status;

  if (!rawConsignmentId || !rawStatus) {
    return new Response(
      JSON.stringify({ success: false, error: 'Missing consignment_id or status in webhook payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const consignmentId = String(rawConsignmentId).trim();
  const courierStatus = String(rawStatus).trim().toLowerCase();

  const invoiceNumber = payload.invoice || payload.invoice_number || payload.order_number || '';
  const eventId = String(payload.event_id || `sf_evt_${consignmentId}_${courierStatus}_${payload.updated_at || Date.now()}`);

  const adminClient = createAdminClient();

  try {
    // Process webhook atomically in PostgreSQL (deduplication in courier_webhook_events + state transition)
    const { data: result, error: rpcErr } = await adminClient.rpc('process_steadfast_webhook', {
      p_event_id: eventId,
      p_consignment_id: consignmentId,
      p_invoice: invoiceNumber,
      p_status: courierStatus,
      p_payload: payload,
    });

    if (rpcErr) {
      console.error('Error executing process_steadfast_webhook RPC:', rpcErr);
      return new Response(
        JSON.stringify({ success: false, error: `Database webhook processing failed: ${rpcErr.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        result,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown webhook error';
    console.error('Webhook processing exception:', errorMsg);
    return new Response(JSON.stringify({ success: false, error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
