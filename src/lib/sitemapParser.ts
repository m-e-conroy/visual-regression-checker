import xml2js from 'xml2js';

export async function fetchAndParseSitemap(sitemapUrl: string): Promise<string[]> {
  try {
    const response = await fetch(sitemapUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.statusText}`);
    }

    const xmlData = await response.text();
    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    const result = await parser.parseStringPromise(xmlData);

    const urls: string[] = [];

    // Depending on the sitemap structure, it could be a single urlset
    // or a sitemapindex containing multiple sitemaps.
    // For this utility, we'll handle standard urlsets.
    if (result.urlset && result.urlset.url) {
      const urlEntries = Array.isArray(result.urlset.url) 
        ? result.urlset.url 
        : [result.urlset.url];
        
      for (const entry of urlEntries) {
        if (entry.loc) {
          urls.push(entry.loc);
        }
      }
    } else if (result.sitemapindex && result.sitemapindex.sitemap) {
      // In a more robust system, we would recursively fetch nested sitemaps.
      // For now, we will throw an error as we're targeting small-medium sites.
      throw new Error('Nested sitemap indexes are not currently supported by this parser.');
    }

    return urls;
  } catch (error) {
    console.error('Error parsing sitemap:', error);
    throw error;
  }
}
