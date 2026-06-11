'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [appSettings, setAppSettings] = useState({
    smtpHost: '',
    smtpPort: '',
    smtpUser: '',
    smtpPass: '',
    jwtSecret: ''
  });

  const [userSettings, setUserSettings] = useState({
    emailNotifications: false,
    teamsNotifications: false,
    teamsWebhookUrl: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [appRes, userRes] = await Promise.all([
          fetch('/api/settings/app'),
          fetch('/api/settings/user')
        ]);
        
        if (appRes.ok) {
          const appData = await appRes.json();
          setAppSettings({
            smtpHost: appData.smtpHost || '',
            smtpPort: appData.smtpPort?.toString() || '',
            smtpUser: appData.smtpUser || '',
            smtpPass: '', // don't load password to client for security, only update
            jwtSecret: appData.jwtSecret || ''
          });
        }
        
        if (userRes.ok) {
          const userData = await userRes.json();
          setUserSettings({
            emailNotifications: userData.emailNotifications || false,
            teamsNotifications: userData.teamsNotifications || false,
            teamsWebhookUrl: userData.teamsWebhookUrl || ''
          });
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const appPayload = { ...appSettings };
      // Don't send empty password if they didn't change it
      if (!appPayload.smtpPass) delete (appPayload as any).smtpPass;

      await Promise.all([
        fetch('/api/settings/app', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appPayload)
        }),
        fetch('/api/settings/user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userSettings)
        })
      ]);
      
      setMessage('Settings saved successfully!');
    } catch (err) {
      setMessage('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '2rem', color: 'var(--color-primary-light)' }}>Settings</h2>
      
      {message && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: message.includes('success') ? '#dcfce7' : '#fee2e2', color: message.includes('success') ? '#166534' : '#b91c1c', borderRadius: 'var(--radius-md)' }}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Global App Settings */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Global Application Settings</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>SMTP Host</label>
              <input type="text" value={appSettings.smtpHost} onChange={e => setAppSettings({...appSettings, smtpHost: e.target.value})} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>SMTP Port</label>
              <input type="number" value={appSettings.smtpPort} onChange={e => setAppSettings({...appSettings, smtpPort: e.target.value})} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>SMTP User</label>
              <input type="text" value={appSettings.smtpUser} onChange={e => setAppSettings({...appSettings, smtpUser: e.target.value})} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label>SMTP Password</label>
              <input type="password" placeholder="Leave blank to keep current" value={appSettings.smtpPass} onChange={e => setAppSettings({...appSettings, smtpPass: e.target.value})} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
            </div>
          </div>
        </div>

        {/* User Settings */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Your Notifications</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={userSettings.emailNotifications} onChange={e => setUserSettings({...userSettings, emailNotifications: e.target.checked})} />
              Enable Email Notifications
            </label>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={userSettings.teamsNotifications} onChange={e => setUserSettings({...userSettings, teamsNotifications: e.target.checked})} />
              Enable MS Teams Notifications
            </label>
            
            {userSettings.teamsNotifications && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <label>Teams Webhook URL</label>
                <input type="url" placeholder="https://..." value={userSettings.teamsWebhookUrl} onChange={e => setUserSettings({...userSettings, teamsWebhookUrl: e.target.value})} style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', width: '100%' }} />
              </div>
            )}
          </div>
        </div>

        <div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>

      </form>
    </div>
  );
}
