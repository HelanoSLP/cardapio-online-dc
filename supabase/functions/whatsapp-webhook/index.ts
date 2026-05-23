import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const phone = body?.phone;
    const isFromMe = body?.fromMe;

    if (!phone || isFromMe) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
    const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
      console.error('Z-API credentials not configured');
      return new Response(JSON.stringify({ ok: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if customer has an active (not delivered/cancelled) order.
    // If yes -> do NOT reply. Only welcome again after the last order is delivered/cancelled.
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const digits = String(phone).replace(/\D/g, '');
    // Match by last 10 digits to handle 55 prefix variations
    const tail = digits.slice(-10);

    const { data: recentOrders } = await supabase
      .from('orders')
      .select('status, customer_whatsapp, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    const customerOrders = (recentOrders ?? []).filter((o: any) => {
      const od = String(o.customer_whatsapp ?? '').replace(/\D/g, '');
      return od.endsWith(tail);
    });

    if (customerOrders.length > 0) {
      const lastStatus = String(customerOrders[0].status);
      const finished = lastStatus === 'delivered' || lastStatus === 'cancelled';
      if (!finished) {
        // Order in progress — bot stays silent
        return new Response(JSON.stringify({ ok: true, skipped: 'order_in_progress' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const siteUrl = 'https://cardapio-online-dc.lovable.app';

    const hourBR = (new Date().getUTCHours() - 3 + 24) % 24;
    let saudacao = 'Boa noite';
    if (hourBR >= 5 && hourBR < 12) saudacao = 'Bom dia';
    else if (hourBR >= 12 && hourBR < 18) saudacao = 'Boa tarde';

    const welcomeMessage = `${saudacao}, esse é o WhatsApp da DC, ficamos felizes pela sua preferência! 😁\n\nEsse aqui é o nosso cardápio: ${siteUrl}\n\nÉ só clicar e fazer seu pedido. Assim que seu pedido for finalizado, estaremos te enviando toda a atualização do seu pedido por aqui.\n\nFique à vontade! 😁`;

    let formattedPhone = digits;
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = `55${formattedPhone}`;
    }

    const zapiUrl = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (ZAPI_CLIENT_TOKEN) {
      headers['Client-Token'] = ZAPI_CLIENT_TOKEN;
    }

    await fetch(zapiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        phone: formattedPhone,
        message: welcomeMessage,
      }),
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
