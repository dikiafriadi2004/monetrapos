"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('member_token');
    const userData = localStorage.getItem('member_user');

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
    localStorage.removeItem('member_token');
    localStorage.removeItem('member_user');
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
            borderTopColor: '#3b82f6',
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

  const isEmployee = user?.type === 'employee';

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
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>
              👥
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
                Member Admin
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
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
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
            Welcome, {user?.name}! 👋
          </h2>
          <p style={{ 
            fontSize: '16px',
            opacity: 0.9,
            margin: 0
          }}>
            {isEmployee ? `Employee at Store` : `Logged in as ${user?.role || 'member'}`}
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
                Type:
              </span>
              <span style={{
                color: 'white',
                background: isEmployee ? '#f59e0b' : '#3b82f6',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase'
              }}>
                {isEmployee ? 'Employee' : user?.role || 'Member'}
              </span>
            </div>
            {isEmployee && user?.storeId && (
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
                  Store ID:
                </span>
                <span style={{ 
                  color: '#718096',
                  fontSize: '14px',
                  fontFamily: 'monospace'
                }}>
                  {user.storeId}
                </span>
              </div>
            )}
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
              { icon: '🛒', title: 'POS', desc: 'Point of Sale' },
              { icon: '📦', title: 'Inventory', desc: 'Check stock' },
              { icon: '👥', title: 'Customers', desc: 'Manage customers' },
              { icon: '⏰', title: 'Shifts', desc: 'Clock in/out' },
              { icon: '📊', title: 'Reports', desc: 'Daily reports' },
              { icon: '⚙️', title: 'Settings', desc: 'Store settings' }
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
                  e.currentTarget.style.borderColor = '#3b82f6';
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
