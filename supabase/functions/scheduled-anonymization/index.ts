import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check authorization - either cron secret or admin user
    const authHeader = req.headers.get('Authorization');
    const cronSecret = req.headers.get('X-Cron-Secret');
    const expectedCronSecret = Deno.env.get('CRON_SECRET');
    
    let isAuthorized = false;
    let runType = 'scheduled';

    // Check if it's a cron job with valid secret
    if (cronSecret && expectedCronSecret && cronSecret === expectedCronSecret) {
      isAuthorized = true;
      runType = 'scheduled';
    } 
    // Or check if it's an admin user
    else if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (!error && user) {
        // Check if user is admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .single();
        
        if (roleData) {
          isAuthorized = true;
          runType = 'manual';
        }
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create anonymization run record
    const { data: runRecord, error: insertError } = await supabase
      .from('anonymization_runs')
      .insert({
        run_type: runType,
        status: 'running',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating run record:', insertError);
    }

    // Run the anonymization function
    const { data: result, error: rpcError } = await supabase.rpc('anonymize_old_ips_with_logging');

    if (rpcError) {
      // Update run record with error
      if (runRecord) {
        await supabase
          .from('anonymization_runs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: rpcError.message,
          })
          .eq('id', runRecord.id);
      }

      return new Response(
        JSON.stringify({ error: 'Anonymization failed', details: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update run record with success
    if (runRecord) {
      await supabase
        .from('anonymization_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          records_processed: result?.total || 0,
          tables_affected: result,
        })
        .eq('id', runRecord.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        run_type: runType,
        records_processed: result?.total || 0,
        details: result,
        message: 'IP anonymization completed successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error in scheduled-anonymization:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});