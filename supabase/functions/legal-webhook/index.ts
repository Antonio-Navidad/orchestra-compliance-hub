import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();

    // Accept single or array of laws from Make.com
    const laws = Array.isArray(body) ? body : [body];

    const records = laws.map((law: any) => ({
      title: law.title || 'Untitled Regulation',
      jurisdiction: law.jurisdiction || 'Unknown',
      regulation_body: law.regulation_body || 'Unknown',
      hs_codes_affected: law.hs_codes_affected || [],
      summary: law.summary || '',
      full_text: law.full_text || null,
      effective_date: law.effective_date || new Date().toISOString().split('T')[0],
      source_url: law.source_url || null,
      transport_modes: law.transport_modes || [],
    }));

    const { data, error } = await supabase
      .from('legal_knowledge')
      .insert(records)
      .select();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, inserted: data.length, records: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
