// Supabase Edge Function: steadfast-dispatch
// Handles secure merchant courier consignment creation via Steadfast Courier Portal API.
// Strictly requires admin authorization ('super_admin' or 'order_manager').
// Secrets (STEADFAST_API_KEY, STEADFAST_SECRET_KEY) are kept strictly server-side.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseClient.ts';
import { requireAdminAuth } from '../_shared/auth.ts';

const STEADFAST_API_BASE = 'https://portal.steadfast.com.bd/api/v1';

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let adminUser;
  try {
    adminUser = await requireAdminAuth(req, ['super_admin', 'order_manager']);
  } catch (authErr: unknown) {
    const message = authErr instanceof Error ? authErr.message : 'Unauthorized';
    const status = message.includes('403') ? 403 : 401;
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiKey = Deno.env.get('STEADFAST_API_KEY');
  const secretKey = Deno.env.get('STEADFAST_SECRET_KEY');

  if (!apiKey || !secretKey) {
    return new Response(
      JSON.stringify({ success: false, error: 'Server courier credentials not configured in Edge Function secrets' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Invalid JSON request payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { orderId } = body;
  if (!orderId || typeof orderId !== 'string') {
    return new Response(JSON.stringify({ success: false, error: 'Missing required parameter: orderId' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createAdminClient();

  // 1. Fetch order details from database
  const { data: order, error: orderErr } = await adminClient
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    return new Response(JSON.stringify({ success: false, error: 'Order not found in database' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Check state machine: order must be 'confirmed' or 'processing'
  const eligibleStatuses = ['confirmed', 'processing'];
  if (!eligibleStatuses.includes(order.status)) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Order cannot be dispatched from current status: ${order.status}. Must be 'confirmed' or 'processing'.`,
      }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // 2. Acquire persistent atomic dispatch lease in PostgreSQL
  const { data: claimData, error: claimErr } = await adminClient.rpc('claim_order_for_dispatch', {
    p_order_id: order.id,
    p_courier_code: 'steadfast',
    p_admin_id: adminUser.id,
    p_lease_seconds: 300,
  });

  if (claimErr || !claimData?.success) {
    return new Response(
      JSON.stringify({
        success: false,
        error: claimErr?.message || claimData?.message || 'Failed to acquire dispatch claim. Order may already be locked or dispatched.',
      }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const claimToken = claimData.claim_token;
  const invoiceNumber = order.order_number;

  try {
    // 3. Pre-dispatch reconciliation: check if Steadfast already has a consignment for this invoice
    try {
      const checkRes = await fetch(`${STEADFAST_API_BASE}/status_by_invoice/${encodeURIComponent(invoiceNumber)}`, {
        method: 'GET',
        headers: { 'Api-Key': apiKey, 'Secret-Key': secretKey },
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.status === 200 && checkData.delivery_status) {
          const existingCid = String(checkData.delivery_status.consignment_id || checkData.delivery_status.id);
          const existingTracking = String(checkData.delivery_status.tracking_code || existingCid);

          // Finalize dispatch using existing external shipment
          await adminClient.rpc('finalize_order_dispatch', {
            p_order_id: order.id,
            p_claim_token: claimToken,
            p_admin_id: adminUser.id,
            p_courier_code: 'steadfast',
            p_consignment_id: existingCid,
            p_tracking_code: existingTracking,
            p_dispatch_payload: checkData,
          });

          return new Response(
            JSON.stringify({
              success: true,
              consignment_id: existingCid,
              tracking_code: existingTracking,
              status: checkData.delivery_status.status || 'in_review',
              message: 'Reconciled existing Steadfast consignment',
              reconciled_existing: true,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch {
      // Proceed to create_order if invoice lookup fails or returns 404
    }

    // 4. Create consignment on Steadfast Portal API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const steadfastRes = await fetch(`${STEADFAST_API_BASE}/create_order`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoice: invoiceNumber,
        recipient_name: order.customer_name,
        recipient_phone: order.customer_phone,
        recipient_address: order.shipping_address,
        cod_amount: Math.round(Number(order.total)),
        note: order.customer_note || `Order ${order.order_number}`,
      }),
    });
    clearTimeout(timeoutId);

    const steadfastData = await steadfastRes.json();

    if (!steadfastRes.ok || steadfastData.status !== 200 || !steadfastData.consignment) {
      const errMsg = steadfastData.message || `Steadfast API error: HTTP ${steadfastRes.status}`;
      await adminClient.rpc('release_order_dispatch_claim', {
        p_order_id: order.id,
        p_claim_token: claimToken,
        p_admin_id: adminUser.id,
        p_error_message: errMsg,
      });

      return new Response(JSON.stringify({ success: false, error: errMsg }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const consignment = steadfastData.consignment;
    const consignmentId = String(consignment.id);
    const trackingCode = String(consignment.tracking_code);

    // 5. Finalize order dispatch atomically in database
    const { error: finalizeErr } = await adminClient.rpc('finalize_order_dispatch', {
      p_order_id: order.id,
      p_claim_token: claimToken,
      p_admin_id: adminUser.id,
      p_courier_code: 'steadfast',
      p_consignment_id: consignmentId,
      p_tracking_code: trackingCode,
      p_dispatch_payload: steadfastData,
    });

    if (finalizeErr) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Dispatch succeeded on Steadfast but failed to record in database: ${finalizeErr.message}`,
          consignment_id: consignmentId,
          tracking_code: trackingCode,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        consignment_id: consignmentId,
        tracking_code: trackingCode,
        status: consignment.status || 'in_review',
        message: 'Order successfully dispatched to Steadfast Courier',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown dispatch exception';
    await adminClient.rpc('release_order_dispatch_claim', {
      p_order_id: order.id,
      p_claim_token: claimToken,
      p_admin_id: adminUser.id,
      p_error_message: errorMsg,
    });

    return new Response(JSON.stringify({ success: false, error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
