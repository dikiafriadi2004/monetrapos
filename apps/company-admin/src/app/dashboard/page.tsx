"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('company_token');
    const userData = localStorage.getItem('company_user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch (err) {
      console.error('Error parsing user data:', err);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('company_token');
    localStorage.removeItem('company_user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f7fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTopColor: '#667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ color: '#718096' }}>Loading...</p>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc' }}>
      {/* Header */}
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              🏢
            </div>
            <div>
              <h1 style={{ 
                fontSize: '20px', 
                fontWeight: 'bold', 
                color: '#1a202c',
                margin: 0
              }}>
                MonetRAPOS
              </h1>
              <p style={{ 
                fontSize: '12px', 
                color: '#718096',
                margin: 0
              }}>
                Company Admin
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: '#e53e3e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#c53030'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#e53e3e'}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '24px'
      }}>
        {/* Welcome Card */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          padding: '32px',
          color: 'white',
          marginBottom: '24px'
        }}>
          <h2 style={{ 
            fontSize: '28px', 
            fontWeight: 'bold',
            margin: '0 0 8px 0'
          }}>
            Welcome back, {user?.name}! 👋
          </h2>
          <p style={{ 
            fontSize: '16px',
            opacity: 0.9,
            margin: 0
          }}>
            You're logged in as {user?.role}
          </p>
        </div>

        {/* User Info Card */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1a202c',
            margin: '0 0 16px 0'
          }}>
            Your Information
          </h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{
              display: 'flex',
              padding: '12px',
              background: '#f7fafc',
              borderRadius: '8px'
            }}>
              <span style={{
                fontWeight: '500',
                color: '#4a5568',
                width: '120px'
              }}>
                Name:
              </span>
              <span style={{ color: '#1a202c' }}>
                {user?.name}
              </span>
            </div>
            <div style={{
              display: 'flex',
              padding: '12px',
              background: '#f7fafc',
              borderRadius: '8px'
            }}>
              <span style={{
                fontWeight: '500',
                color: '#4a5568',
                width: '120px'
              }}>
                Email:
              </span>
              <span style={{ color: '#1a202c' }}>
                {user?.email}
              </span>
            </div>
            <div style={{
              display: 'flex',
              padding: '12px',
              background: '#f7fafc',
              borderRadius: '8px'
            }}>
              <span style={{
                fontWeight: '500',
                color: '#4a5568',
                width: '120px'
              }}>
                Role:
              </span>
              <span style={{
                color: 'white',
                background: '#667eea',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {user?.role}
              </span>
            </div>
            <div style={{
              display: 'flex',
              padding: '12px',
              background: '#f7fafc',
              borderRadius: '8px'
            }}>
              <span style={{
                fontWeight: '500',
                color: '#4a5568',
                width: '120px'
              }}>
                Company ID:
              </span>
              <span style={{ 
                color: '#718096',
                fontSize: '14px',
                fontFamily: 'monospace'
              }}>
                {user?.companyId}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1a202c',
            margin: '0 0 16px 0'
          }}>
            Quick Actions
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            {[
              { icon: '🏪', title: 'Stores', desc: 'Manage stores' },
              { icon: '📦', title: 'Products', desc: 'Manage products' },
              { icon: '👥', title: 'Users', desc: 'Manage users' },
              { icon: '💰', title: 'Billing', desc: 'View billing' },
              { icon: '📊', title: 'Reports', desc: 'View reports' },
              { icon: '⚙️', title: 'Settings', desc: 'Company settings' }
            ].map((action, index) => (
              <div
                key={index}
                style={{
                  padding: '20px',
                  background: '#f7fafc',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: '2px solid transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#edf2f7';
                  e.currentTarget.style.borderColor = '#667eea';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f7fafc';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                  {action.icon}
                </div>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1a202c',
                  margin: '0 0 4px 0'
                }}>
                  {action.title}
                </h4>
                <p style={{
                  fontSize: '14px',
                  color: '#718096',
                  margin: 0
                }}>
                  {action.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Success Message */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#c6f6d5',
          border: '1px solid #9ae6b4',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{
            color: '#22543d',
            fontSize: '14px',
            fontWeight: '500',
            margin: 0
          }}>
            ✅ Login berhasil! Aplikasi berfungsi dengan baik.
          </p>
        </div>
      </main>
    </div>
  );
}
