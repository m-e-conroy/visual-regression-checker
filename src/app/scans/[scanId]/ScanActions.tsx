'use client';

import { useState } from 'react';

interface ScanActionsProps {
  scanId: string;
  pageId: string;
  status: string;
  diffPercentage: number | null;
}

export default function ScanActions({ scanId, pageId, status, diffPercentage }: ScanActionsProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approveReason, setApproveReason] = useState('');
  const [makeBaseline, setMakeBaseline] = useState(true);
  const [isApproving, setIsApproving] = useState(false);

  const handleRunScan = async () => {
    setIsScanning(true);
    try {
      const res = await fetch(`/api/pages/${pageId}/scan`, { method: 'POST' });
      if (res.ok) {
        // Start polling for status
        const intervalId = setInterval(async () => {
          try {
            const statusRes = await fetch(`/api/pages/${pageId}/latest-scan`);
            if (statusRes.ok) {
              const data = await statusRes.json();
              if (data.scan && data.scan.status !== 'PENDING') {
                clearInterval(intervalId);
                if (data.scan.id !== scanId) {
                  window.location.href = `/scans/${data.scan.id}`;
                } else {
                  window.location.reload();
                }
              }
            }
          } catch (e) {
            console.error('Polling error:', e);
          }
        }, 2000);
      } else {
        alert('Failed to trigger scan.');
        setIsScanning(false);
      }
    } catch (error) {
      console.error(error);
      alert('Error triggering scan.');
      setIsScanning(false);
    }
  };

  const handleApprove = async () => {
    if (!approveReason) {
      alert('Please provide a reason for approval.');
      return;
    }
    
    setIsApproving(true);
    try {
      const res = await fetch(`/api/scans/${scanId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: approveReason, makeBaseline })
      });
      if (res.ok) {
        alert('Scan approved successfully!');
        window.location.reload();
      } else {
        alert('Failed to approve scan.');
      }
    } catch (error) {
      console.error(error);
      alert('Error approving scan.');
    }
    setIsApproving(false);
  };

  return (
    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <button 
        className="btn-primary" 
        onClick={handleRunScan} 
        disabled={isScanning}
        style={{ 
          backgroundColor: isScanning ? '#e2e8f0' : 'var(--color-primary-light)',
          color: isScanning ? 'var(--color-text)' : '#fff',
          position: 'relative',
          overflow: 'hidden',
          minWidth: '200px'
        }}
      >
        {isScanning && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, bottom: 0,
            width: '100%',
            backgroundColor: 'rgba(37, 99, 235, 0.2)',
            animation: 'scanProgress 2s infinite linear'
          }} />
        )}
        <span style={{ position: 'relative', zIndex: 1 }}>
          {isScanning ? 'Scanning (Auto-refreshing)...' : 'Run Scan on This Page'}
        </span>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes scanProgress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}} />
      </button>

      {status === 'FAILED' && !showApproveDialog && (
        <button 
          className="btn-primary" 
          onClick={() => setShowApproveDialog(true)}
          style={{ backgroundColor: '#16a34a' }} // Green for approval
        >
          Review & Approve Differences
        </button>
      )}

      {showApproveDialog && (
        <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', backgroundColor: '#f0fdf4', width: '100%' }}>
          <h4 style={{ color: '#166534', marginBottom: '0.5rem' }}>Approve Failed Scan</h4>
          <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: '#15803d' }}>
            Mark this {diffPercentage}% difference as acceptable.
          </p>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>Reason</label>
            <input 
              type="text" 
              placeholder="e.g. Expected UI change, False Positive" 
              value={approveReason}
              onChange={(e) => setApproveReason(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}
            />
          </div>

          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
            <input 
              type="checkbox" 
              id="makeBaseline" 
              checked={makeBaseline} 
              onChange={(e) => setMakeBaseline(e.target.checked)} 
              style={{ marginRight: '0.5rem' }}
            />
            <label htmlFor="makeBaseline" style={{ fontSize: '0.875rem' }}>Set this image as the new Baseline</label>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-primary" onClick={handleApprove} disabled={isApproving} style={{ backgroundColor: '#16a34a' }}>
              {isApproving ? 'Approving...' : 'Confirm Approval'}
            </button>
            <button className="btn-primary" onClick={() => setShowApproveDialog(false)} style={{ backgroundColor: 'var(--color-text-muted)' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
