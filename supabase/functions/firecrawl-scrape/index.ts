const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Scraping URL:', formattedUrl);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown', 'links'],
        onlyMainContent: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || `Request failed with status ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract metadata from the scrape result
    const metadata = data.data?.metadata || data.metadata || {};
    const markdown = data.data?.markdown || data.markdown || '';
    const links = data.data?.links || data.links || [];
    const statusCode = metadata.statusCode || null;

    // Detect error pages (404, 500, etc.)
    const title = metadata.title || '';
    const description = metadata.description || '';
    const ogTitle = metadata.ogTitle || '';
    const contentLower = `${title} ${description} ${ogTitle} ${markdown.substring(0, 500)}`.toLowerCase();
    
    const isErrorPage = 
      (statusCode && statusCode >= 400) ||
      /\b(404|erro 404|page not found|página não encontrada|not found|403|500|502|503)\b/i.test(contentLower);

    if (isErrorPage) {
      console.log('Detected error page for:', formattedUrl, '| statusCode:', statusCode);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `A página retornou um erro (${statusCode || 'página não encontrada'}). Verifique se a URL está correta e acessível.`,
          detectedStatus: statusCode,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build structured result
    const result = {
      success: true,
      url: formattedUrl,
      title: metadata.title || null,
      description: metadata.description || null,
      keywords: metadata.keywords ? metadata.keywords.split(',').map((k: string) => k.trim()) : null,
      language: metadata.language || null,
      sourceURL: metadata.sourceURL || formattedUrl,
      markdown: markdown,
      links: links,
      ogTitle: metadata.ogTitle || null,
      ogDescription: metadata.ogDescription || null,
      ogImage: metadata.ogImage || null,
    };

    console.log('Scrape successful for:', formattedUrl);
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
