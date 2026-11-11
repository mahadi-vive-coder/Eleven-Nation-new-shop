// Supabase Edge Function: admin-operations
// Provides secure administrative server operations for verified administrators.
// Strictly requires authentication and checks PostgreSQL public.user_roles.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseClient.ts';
import { requireAdminAuth } from '../_shared/auth.ts';

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
    adminUser = await requireAdminAuth(req, ['super_admin', 'order_manager', 'product_manager']);
  } catch (authErr: unknown) {
    const message = authErr instanceof Error ? authErr.message : 'Unauthorized';
    const status = message.includes('403') ? 403 : 401;
    return new Response(JSON.stringify({ success: false, error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { action: string; [key: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Malformed JSON payload' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { action } = body;
  const adminClient = createAdminClient();

  try {
    switch (action) {
      case 'get-order-metrics': {
        const { data: counts, error: countsErr } = await adminClient
          .from('orders')
          .select('status, total');

        if (countsErr) throw countsErr;

        const metrics = {
          totalOrders: counts.length,
          pending: counts.filter((o) => o.status === 'pending').length,
          confirmed: counts.filter((o) => o.status === 'confirmed').length,
          processing: counts.filter((o) => o.status === 'processing').length,
          shipped: counts.filter((o) => o.status === 'shipped').length,
          delivered: counts.filter((o) => o.status === 'delivered').length,
          cancelled: counts.filter((o) => o.status === 'cancelled').length,
          returned: counts.filter((o) => o.status === 'returned').length,
          totalRevenue: counts
            .filter((o) => o.status !== 'cancelled' && o.status !== 'returned')
            .reduce((acc, curr) => acc + (Number(curr.total) || 0), 0),
        };

        return new Response(JSON.stringify({ success: true, metrics }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'routine-security-cleanup': {
        if (adminUser.role !== 'super_admin') {
          return new Response(JSON.stringify({ success: false, error: 'Forbidden: super_admin required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { error: cleanupErr } = await adminClient.rpc('routine_security_cleanup');
        if (cleanupErr) throw cleanupErr;

        return new Response(
          JSON.stringify({ success: true, message: 'Expired idempotency keys and rate limits cleaned' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'test-courier-connection': {
        const apiKey = Deno.env.get('STEADFAST_API_KEY');
        const secretKey = Deno.env.get('STEADFAST_SECRET_KEY');

        if (!apiKey || !secretKey) {
          return new Response(
            JSON.stringify({ success: false, error: 'Steadfast credentials not configured in environment' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const res = await fetch('https://portal.steadfast.com.bd/api/v1/get_balance', {
          method: 'GET',
          headers: { 'Api-Key': apiKey, 'Secret-Key': secretKey },
        });

        const data = await res.json().catch(() => ({}));

        return new Response(
          JSON.stringify({
            success: res.ok && data.status === 200,
            status: res.status,
            balanceData: data,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(JSON.stringify({ success: false, error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Server error';
    return new Response(JSON.stringify({ success: false, error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
