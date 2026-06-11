import { PrismaClient } from '@prisma/client';
import Link from 'next/link';

const prisma = new PrismaClient();

export default async function SiteDetailsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    include: {
      pages: {
        include: {
          scans: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      }
    }
  });

  if (!site) {
    return <div>Site not found</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/sites" style={{ fontSize: '0.875rem', display: 'inline-block', marginBottom: '1rem' }}>&larr; Back to Sites</Link>
        <h2 style={{ color: 'var(--color-primary-light)' }}>{site.name}</h2>
        <a href={site.sitemapUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          {site.sitemapUrl}
        </a>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Tracked Pages</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {site.pages.map(page => {
            const latestScan = page.scans[0];
            const hasFailed = latestScan?.status === 'FAILED';
            
            return (
              <div key={page.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: hasFailed ? '#fef2f2' : 'var(--color-surface)' }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '1rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.25rem', fontSize: '1rem' }}>
                    {page.title || 'Untitled Page'}
                  </div>
                  <a href={page.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 500, fontSize: '0.875rem' }}>
                    {page.url}
                  </a>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    {latestScan ? `Last scanned: ${new Date(latestScan.createdAt).toLocaleString()} (${latestScan.status})` : 'Never scanned'}
                  </div>
                </div>
                
                <div>
                  {latestScan ? (
                    <Link href={`/scans/${latestScan.id}`} className="btn-primary" style={{ backgroundColor: hasFailed ? '#dc2626' : 'var(--color-primary)' }}>
                      {hasFailed ? 'Review Diff' : 'View Scan'}
                    </Link>
                  ) : (
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Pending...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
