import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const phone = typeof body?.phone === 'string' || typeof body?.phone === 'number'
      ? String(body.phone)
      : '';
    const isFromMe = body?.fromMe === true;

    if (!phone || phone.length > 30 || isFromMe) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
    const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Webhook credentials not configured');
      return new Response(JSON.stringify({ ok: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const digits = String(phone).replace(/\D/g, '');

    if (digits.length < 10 || digits.length > 15) {
      return new Response(JSON.stringify({ ok: true, skipped: 'invalid_phone' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Atomically claim the single welcome allowed for this customer/order cycle.
    const { data: shouldReply, error: claimError } = await supabase.rpc(
      'claim_whatsapp_welcome',
      { p_phone: digits },
    );

    if (claimError) {
      console.error('Could not claim WhatsApp welcome:', claimError.message);
      return new Response(JSON.stringify({ ok: false }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!shouldReply) {
      return new Response(JSON.stringify({ ok: true, skipped: 'already_welcomed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    const zapiResponse = await fetch(zapiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        phone: formattedPhone,
        message: welcomeMessage,
      }),
    });

    if (!zapiResponse.ok) {
      console.error('Z-API welcome failed with status:', zapiResponse.status);
    }

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
