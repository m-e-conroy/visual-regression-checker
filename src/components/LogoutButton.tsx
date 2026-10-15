'use client';

export default function LogoutButton() {

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (res.ok) {
        // Redirect to login page and ensure client router clears cache
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <button 
      onClick={handleLogout}
      style={{
        background: 'none',
        border: 'none',
        color: '#dc2626',
        fontWeight: 500,
        cursor: 'pointer',
        fontSize: '1rem',
        padding: 0
      }}
    >
      Logout
    </button>
  );
}
