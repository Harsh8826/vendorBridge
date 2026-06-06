import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, ROLES } from '../lib/constants'
import LoadingSpinner from '../components/LoadingSpinner'
import StatusBadge from '../components/StatusBadge'

export default function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [recentRfqs, setRecentRfqs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: statsData }, { data: rfqs }] = await Promise.all([
        supabase.rpc('get_dashboard_stats'),
        supabase
          .from('rfqs')
          .select('id, rfq_number, title, status, deadline, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ])
      setStats(statsData)
      setRecentRfqs(rfqs || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="page-loading">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const isVendor = profile?.role === ROLES.VENDOR

  const statCards = isVendor
    ? [
        { label: 'Invited RFQs', value: stats?.active_rfqs ?? 0, color: 'accent' },
        { label: 'My Quotations', value: stats?.recent_pos ?? 0 },
        { label: 'Active POs', value: stats?.recent_invoices ?? 0, color: 'success' },
        { label: 'Pending Invoices', value: stats?.pending_invoices ?? 0, color: 'warning' },
      ]
    : [
        { label: 'Active RFQs', value: stats?.active_rfqs ?? 0, color: 'accent' },
        { label: 'Pending Approvals', value: stats?.pending_approvals ?? 0, color: 'warning' },
        { label: 'Total Vendors', value: stats?.total_vendors ?? 0 },
        { label: 'Spend (30d)', value: formatCurrency(stats?.total_spend_30d), color: 'success' },
        { label: 'Recent POs', value: stats?.recent_pos ?? 0 },
        { label: 'Overdue Invoices', value: stats?.overdue_invoices ?? 0, color: 'danger' },
      ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
          </p>
        </div>
        {!isVendor && (
          <Link to="/rfqs/new" className="btn btn-primary">+ New RFQ</Link>
        )}
      </div>

      <div className="stat-grid">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value${s.color ? ` ${s.color}` : ''}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {!isVendor && (
        <div className="btn-group" style={{ marginBottom: '1.5rem' }}>
          <Link to="/rfqs/new" className="btn btn-primary">+ New RFQ</Link>
          <Link to="/vendors" className="btn btn-secondary">Add Vendor</Link>
          <Link to="/reports" className="btn btn-secondary">View Reports</Link>
        </div>
      )}

      <div className="data-card">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>
            Recent RFQs
          </h3>
        </div>
        {recentRfqs.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No RFQs yet
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>RFQ #</th>
                <th>Title</th>
                <th>Status</th>
                <th>Deadline</th>
              </tr>
            </thead>
            <tbody>
              {recentRfqs.map((rfq) => (
                <tr key={rfq.id}>
                  <td>
                    <Link to={`/rfqs/${rfq.id}`} className="link">{rfq.rfq_number}</Link>
                  </td>
                  <td>{rfq.title}</td>
                  <td><StatusBadge status={rfq.status} /></td>
                  <td>{new Date(rfq.deadline).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
