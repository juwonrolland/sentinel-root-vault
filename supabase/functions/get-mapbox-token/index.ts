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
    // Get the Mapbox token from environment - try multiple possible names
    const mapboxToken = Deno.env.get('MAPBOX_TOKEN') || 
                        Deno.env.get('VITE_MAPBOX_TOKEN') || 
                        Deno.env.get('MAPBOX_ACCESS_TOKEN');
    
    console.log('Checking for Mapbox token...');
    console.log('MAPBOX_TOKEN exists:', !!Deno.env.get('MAPBOX_TOKEN'));
    console.log('VITE_MAPBOX_TOKEN exists:', !!Deno.env.get('VITE_MAPBOX_TOKEN'));
    
    if (!mapboxToken) {
      console.warn('Mapbox token not found in environment');
      return new Response(
        JSON.stringify({ 
          error: 'Mapbox token not configured',
          configured: false 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Mapbox token found, returning...');
    return new Response(
      JSON.stringify({ 
        token: mapboxToken,
        configured: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in get-mapbox-token:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
