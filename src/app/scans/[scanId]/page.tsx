import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import ScanActions from './ScanActions';

const prisma = new PrismaClient();

export default async function ScanViewerPage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: {
      page: {
        include: { site: true }
      }
    }
  });

  if (!scan) {
    return <div>Scan not found</div>;
  }

  // Find the baseline for this page
  const baseline = await prisma.scan.findFirst({
    where: { pageId: scan.pageId, isBaseline: true },
    orderBy: { createdAt: 'desc' }
  });

  // Calculate Next and Previous Pages for the same site
  const sitePages = await prisma.page.findMany({
    where: { siteId: scan.page.siteId },
    orderBy: { url: 'asc' },
    select: { id: true, url: true }
  });
  
  const currentIndex = sitePages.findIndex(p => p.id === scan.pageId);
  const prevPage = currentIndex > 0 ? sitePages[currentIndex - 1] : null;
  const nextPage = currentIndex < sitePages.length - 1 ? sitePages[currentIndex + 1] : null;

  // We need to find the latest scan for the prev/next pages to link to their viewer
  const getLatestScanId = async (pId: string) => {
    const s = await prisma.scan.findFirst({ where: { pageId: pId }, orderBy: { createdAt: 'desc' } });
    return s?.id || null;
  };

  const prevScanId = prevPage ? await getLatestScanId(prevPage.id) : null;
  const nextScanId = nextPage ? await getLatestScanId(nextPage.id) : null;

  const encodePath = (filepath: string) => encodeURIComponent(filepath);

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <Link href={`/sites/${scan.page.siteId}`} style={{ fontSize: '0.875rem', display: 'inline-block', marginBottom: '1rem' }}>
          &larr; Back to {scan.page.site.name}
        </Link>
        <h2 style={{ color: 'var(--color-primary-light)', marginBottom: '0.5rem' }}>Visual Regression Viewer</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
          <a href={scan.page.url} target="_blank" rel="noopener noreferrer">{scan.page.url}</a>
        </p>
        <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>
          Scan Status: <strong style={{ color: scan.status === 'FAILED' ? '#dc2626' : scan.status === 'APPROVED' ? '#16a34a' : 'var(--color-primary)' }}>{scan.status}</strong>
          {scan.diffPercentage !== null && ` (${scan.diffPercentage}% diff)`}
        </p>
        {scan.status === 'APPROVED' && scan.approvedReason && (
          <p style={{ fontSize: '0.875rem', color: '#166534', backgroundColor: '#dcfce7', padding: '0.5rem', borderRadius: '4px', display: 'inline-block' }}>
            Approved Reason: {scan.approvedReason}
          </p>
        )}

        <ScanActions 
          scanId={scan.id} 
          pageId={scan.pageId} 
          status={scan.status} 
          diffPercentage={scan.diffPercentage} 
        />

        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
          {prevScanId ? (
            <Link href={`/scans/${prevScanId}`} className="btn-primary" style={{ backgroundColor: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              &larr; Previous Page
            </Link>
          ) : <div style={{ color: 'var(--color-border)', padding: '0.5rem' }}>No Previous Page</div>}
          
          {nextScanId ? (
            <Link href={`/scans/${nextScanId}`} className="btn-primary" style={{ backgroundColor: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Next Page &rarr;
            </Link>
          ) : <div style={{ color: 'var(--color-border)', padding: '0.5rem' }}>No Next Page</div>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        {/* Baseline Image */}
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Baseline</h3>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#f9fafb', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {baseline?.screenshotPath ? (
              <img 
                src={`/api/image?path=${encodePath(baseline.screenshotPath)}`} 
                alt="Baseline" 
                style={{ width: '100%', height: 'auto', display: 'block' }} 
              />
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>No baseline available</span>
            )}
          </div>
          {baseline && (
            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              {new Date(baseline.createdAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* Current Scan Image */}
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ marginBottom: '1rem', textAlign: 'center' }}>Current Scan</h3>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#f9fafb', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {scan.screenshotPath ? (
              <img 
                src={`/api/image?path=${encodePath(scan.screenshotPath)}`} 
                alt="Current Scan" 
                style={{ width: '100%', height: 'auto', display: 'block' }} 
              />
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>Screenshot missing</span>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            {new Date(scan.createdAt).toLocaleString()}
          </div>
        </div>

        {/* Diff Image */}
        <div className="card" style={{ padding: '1rem', gridColumn: '1 / -1' }}>
          <h3 style={{ marginBottom: '1rem', textAlign: 'center', color: '#dc2626' }}>Difference Overlay</h3>
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', backgroundColor: '#f9fafb', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {scan.diffPath ? (
              <img 
                src={`/api/image?path=${encodePath(scan.diffPath)}`} 
                alt="Diff Overlay" 
                style={{ width: '100%', height: 'auto', display: 'block' }} 
              />
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>
                {scan.isBaseline ? 'This is the baseline scan. No diff available.' : 'No visual differences detected.'}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
