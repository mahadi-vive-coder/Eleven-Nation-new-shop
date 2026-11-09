import { supabaseAdmin } from './supabaseAdmin';

const STEADFAST_API_BASE = 'https://portal.steadfast.com.bd/api/v1';

export interface SteadfastCreateOrderPayload {
  orderId: string;
  adminId: string;
  invoice: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number;
  note?: string;
}

export interface SteadfastDispatchResponse {
  success: boolean;
  consignmentId?: string;
  trackingCode?: string;
  status?: string;
  message?: string;
  reconciledExisting?: boolean;
  error?: string;
}

/**
 * Dispatches an order to Steadfast Courier.
 * Features:
 * 1. Database-backed dispatch claim lease to prevent concurrent admin double-dispatches.
 * 2. Pre-dispatch invoice reconciliation to detect prior ambiguous shipments.
 * 3. Safe claim release on API failure.
 */
export async function dispatchOrderToSteadfast(
  payload: SteadfastCreateOrderPayload
): Promise<SteadfastDispatchResponse> {
  const apiKey = process.env.STEADFAST_API_KEY;
  const secretKey = process.env.STEADFAST_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error('Steadfast credentials (STEADFAST_API_KEY or STEADFAST_SECRET_KEY) are missing');
  }

  // 1. Acquire persistent dispatch lease in PostgreSQL
  const { data: claimData, error: claimError } = await supabaseAdmin.rpc('claim_order_for_dispatch', {
    p_order_id: payload.orderId,
    p_courier_code: 'steadfast',
    p_admin_id: payload.adminId,
    p_lease_seconds: 300,
  });

  if (claimError || !claimData?.success) {
    return {
      success: false,
      error: claimError?.message || 'Failed to acquire dispatch claim. Order may already be dispatched or locked.',
    };
  }

  const claimToken = claimData.claim_token;

  try {
    // 2. Pre-dispatch reconciliation: check if Steadfast already has a consignment for this invoice
    // (Prevents duplicate consignment creation on retried timeouts)
    try {
      const checkRes = await fetch(`${STEADFAST_API_BASE}/status_by_invoice/${encodeURIComponent(payload.invoice)}`, {
        method: 'GET',
        headers: { 'Api-Key': apiKey, 'Secret-Key': secretKey },
      });

      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (checkData.status === 200 && checkData.delivery_status) {
          const existingCid = String(checkData.delivery_status.consignment_id || checkData.delivery_status.id);
          const existingTracking = String(checkData.delivery_status.tracking_code || existingCid);

          // Finalize dispatch using the already existing external shipment!
          await supabaseAdmin.rpc('finalize_order_dispatch', {
            p_order_id: payload.orderId,
            p_claim_token: claimToken,
            p_admin_id: payload.adminId,
            p_courier_code: 'steadfast',
            p_consignment_id: existingCid,
            p_tracking_code: existingTracking,
            p_dispatch_payload: checkData,
          });

          return {
            success: true,
            consignmentId: existingCid,
            trackingCode: existingTracking,
            status: checkData.delivery_status.status || 'in_review',
            message: 'Reconciled existing Steadfast consignment',
            reconciledExisting: true,
          };
        }
      }
    } catch {
      // If invoice lookup fails or endpoint returns 404, proceed to creation
    }

    // 3. Create consignment on Steadfast with network timeout (15s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${STEADFAST_API_BASE}/create_order`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invoice: payload.invoice,
        recipient_name: payload.recipientName,
        recipient_phone: payload.recipientPhone,
        recipient_address: payload.recipientAddress,
        cod_amount: payload.codAmount,
        note: payload.note || '',
      }),
    });
    clearTimeout(timeoutId);

    const result = await response.json();

    if (!response.ok || result.status !== 200 || !result.consignment) {
      const errMsg = result.message || `Steadfast API error: HTTP ${response.status}`;
      await supabaseAdmin.rpc('release_order_dispatch_claim', {
        p_order_id: payload.orderId,
        p_claim_token: claimToken,
        p_admin_id: payload.adminId,
        p_error_message: errMsg,
      });

      return { success: false, error: errMsg };
    }

    const consignment = result.consignment;

    // 4. Finalize order dispatch atomically in database
    const { error: finalizeError } = await supabaseAdmin.rpc('finalize_order_dispatch', {
      p_order_id: payload.orderId,
      p_claim_token: claimToken,
      p_admin_id: payload.adminId,
      p_courier_code: 'steadfast',
      p_consignment_id: String(consignment.id),
      p_tracking_code: String(consignment.tracking_code),
      p_dispatch_payload: result,
    });

    if (finalizeError) {
      throw new Error(`Failed to record dispatch in database: ${finalizeError.message}`);
    }

    return {
      success: true,
      consignmentId: String(consignment.id),
      trackingCode: String(consignment.tracking_code),
      status: consignment.status,
      message: result.message,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown dispatch error';
    await supabaseAdmin.rpc('release_order_dispatch_claim', {
      p_order_id: payload.orderId,
      p_claim_token: claimToken,
      p_admin_id: payload.adminId,
      p_error_message: errorMessage,
    });

    return { success: false, error: errorMessage };
  }
}
