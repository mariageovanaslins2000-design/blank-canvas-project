import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  phoneNumber: string;
  message: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ZAPI_BASE_URL = Deno.env.get('ZAPI_BASE_URL');
    const ZAPI_INSTANCE_ID = Deno.env.get('ZAPI_INSTANCE_ID');
    const ZAPI_TOKEN = Deno.env.get('ZAPI_TOKEN');
    const ZAPI_CLIENT_TOKEN = Deno.env.get('ZAPI_CLIENT_TOKEN');

    if (!ZAPI_BASE_URL || !ZAPI_INSTANCE_ID || !ZAPI_TOKEN || !ZAPI_CLIENT_TOKEN) {
      throw new Error('Missing required Z-API environment variables');
    }

    const { phoneNumber, message }: SendMessageRequest = await req.json();

    if (!phoneNumber || !message) {
      throw new Error('phoneNumber and message are required');
    }

    console.log('[WhatsApp Send] Sending message to:', phoneNumber);

    const response = await fetch(
      `${ZAPI_BASE_URL}/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': ZAPI_CLIENT_TOKEN
        },
        body: JSON.stringify({
          phone: phoneNumber,
          message: message
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WhatsApp Send] Z-API error:', errorText);
      throw new Error(`Failed to send message: ${errorText}`);
    }

    const result = await response.json();
    console.log('[WhatsApp Send] Message sent successfully:', result);

    return new Response(
      JSON.stringify({ 
        success: true,
        result 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[WhatsApp Send] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});