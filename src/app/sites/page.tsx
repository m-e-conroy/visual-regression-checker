'use client';

import { useState, useEffect } from 'react';

export default function SitesPage() {
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal / Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSitemap, setNewSitemap] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchSites = async () => {
    try {
      const res = await fetch('/api/sites');
      if (res.ok) {
        const data = await res.json();
        setSites(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, sitemapUrl: newSitemap })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add site.');
      }

      // Reset form and refresh list
      setNewName('');
      setNewSitemap('');
      setShowAddForm(false);
      await fetchSites();

      alert(`Successfully added site tracking ${data.pageCount} pages!`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriggerScan = async (siteId: string) => {
    try {
      const res = await fetch('/api/scan/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId })
      });
      if (res.ok) {
        alert('Scan triggered in the background!');
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to trigger scan.');
    }
  };

  if (loading) return <div>Loading tracked sites...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: 'var(--color-primary-light)' }}>Monitored Sites</h2>
        <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : '+ Add Site'}
        </button>
      </div>

      {showAddForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Add New Site to Monitor</h3>
          {error && (
            <div style={{ padding: '0.75rem', marginBottom: '1rem', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--radius-md)' }}>
              {error}
            </div>
          )}
          <form onSubmit={handleAddSite} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '1rem', alignItems: 'end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>Site Name</label>
              <input type="text" required placeholder="e.g. Corporate Blog" value={newName} onChange={e => setNewName(e.target.value)} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>XML Sitemap URL</label>
              <input type="url" required placeholder="https://example.com/sitemap.xml" value={newSitemap} onChange={e => setNewSitemap(e.target.value)} style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
            </div>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Parsing...' : 'Add & Parse'}
            </button>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sites.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No sites are currently being monitored.</p>
        ) : (
          sites.map(site => (
            <div key={site.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{site.name}</h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Tracking {site._count?.pages || 0} pages</p>
                <a href={site.sitemapUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.875rem' }}>{site.sitemapUrl}</a>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <a href={`/sites/${site.id}`} className="btn-primary" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}>View Pages</a>
                <button className="btn-primary" onClick={() => handleTriggerScan(site.id)}>Run Scan Now</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
