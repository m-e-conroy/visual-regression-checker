import { PrismaClient } from '@prisma/client';
import Link from 'next/link';

const prisma = new PrismaClient();

export default async function DashboardPage() {
  // Fetch real metrics
  const siteCount = await prisma.site.count();
  
  const recentFailedScans = await prisma.scan.findMany({
    where: { status: 'FAILED' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      page: {
        include: { site: true }
      }
    }
  });

  const totalPages = await prisma.page.count();

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--color-primary-light)' }}>Dashboard Overview</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        
        <div className="card">
          <h3 style={{ marginBottom: '0.5rem' }}>Tracked Sites</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem', fontSize: '2rem', fontWeight: 600 }}>
            {siteCount}
          </p>
          <p style={{ color: 'var(--color-text-muted)' }}>Monitoring {totalPages} total pages.</p>
          <Link href="/sites" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem' }}>Manage Sites</Link>
        </div>

        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
            Recent Visual Regressions
          </h3>
          
          {recentFailedScans.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              No visual regressions detected recently. Looking good!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentFailedScans.map(scan => (
                <div key={scan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #fee2e2', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#b91c1c' }}>{scan.page.site.name}</div>
                    <div style={{ fontSize: '0.875rem', color: '#7f1d1d' }}>{scan.page.url}</div>
                    <div style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Difference: <strong>{scan.diffPercentage}%</strong></div>
                  </div>
                  <Link href={`/scans/${scan.id}`} className="btn-primary" style={{ backgroundColor: '#dc2626' }}>
                    View Diff
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
