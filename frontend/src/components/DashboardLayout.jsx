import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS, ROLES } from '../lib/constants'
import NotificationBell from './NotificationBell'
import './DashboardLayout.css'

const NAV = {
  [ROLES.ADMIN]: [
    { to: '/dashboard', label: 'Dashboard', icon: '◈' },
    { to: '/vendors', label: 'Vendors', icon: '◇' },
    { to: '/rfqs', label: 'RFQs', icon: '◎' },
    { to: '/quotations', label: 'Quotations', icon: '◆' },
    { to: '/approvals', label: 'Approvals', icon: '✓' },
    { to: '/purchase-orders', label: 'Purchase Orders', icon: '▣' },
    { to: '/invoices', label: 'Invoices', icon: '▤' },
    { to: '/reports', label: 'Reports', icon: '▥' },
    { to: '/activity', label: 'Activity', icon: '☰' },
  ],
  [ROLES.PROCUREMENT]: [
    { to: '/dashboard', label: 'Dashboard', icon: '◈' },
    { to: '/vendors', label: 'Vendors', icon: '◇' },
    { to: '/rfqs', label: 'RFQs', icon: '◎' },
    { to: '/quotations', label: 'Quotations', icon: '◆' },
    { to: '/approvals', label: 'Approvals', icon: '✓' },
    { to: '/purchase-orders', label: 'Purchase Orders', icon: '▣' },
    { to: '/invoices', label: 'Invoices', icon: '▤' },
    { to: '/reports', label: 'Reports', icon: '▥' },
    { to: '/activity', label: 'Activity', icon: '☰' },
  ],
  [ROLES.MANAGER]: [
    { to: '/dashboard', label: 'Dashboard', icon: '◈' },
    { to: '/rfqs', label: 'RFQs', icon: '◎' },
    { to: '/quotations', label: 'Quotations', icon: '◆' },
    { to: '/approvals', label: 'Approvals', icon: '✓' },
    { to: '/purchase-orders', label: 'Purchase Orders', icon: '▣' },
    { to: '/invoices', label: 'Invoices', icon: '▤' },
    { to: '/reports', label: 'Reports', icon: '▥' },
    { to: '/activity', label: 'Activity', icon: '☰' },
  ],
  [ROLES.VENDOR]: [
    { to: '/dashboard', label: 'Dashboard', icon: '◈' },
    { to: '/rfqs', label: 'My RFQs', icon: '◎' },
    { to: '/quotations', label: 'My Quotations', icon: '◆' },
    { to: '/purchase-orders', label: 'Purchase Orders', icon: '▣' },
    { to: '/invoices', label: 'Invoices', icon: '▤' },
  ],
}

export default function DashboardLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const links = NAV[profile?.role] || NAV[ROLES.PROCUREMENT]

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="dash-root">
      <aside className="dash-sidebar">
        <div className="dash-brand">
          <span className="brand-icon">⬡</span>
          <span className="brand-name">VendorBridge</span>
        </div>

        <nav className="dash-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `dash-nav-link${isActive ? ' active' : ''}`}
              end={link.to === '/dashboard'}
            >
              <span className="nav-icon">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="dash-user">
          <div className="user-avatar">
            {(profile?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name">{profile?.full_name || 'User'}</span>
            <span className="user-role">{ROLE_LABELS[profile?.role] || profile?.role}</span>
          </div>
          <button type="button" className="sign-out-btn" onClick={handleSignOut} title="Sign out">
            ⏻
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="dash-header">
          <NotificationBell />
        </header>
        <main className="dash-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
