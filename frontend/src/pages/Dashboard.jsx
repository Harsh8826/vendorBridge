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
  const [vendorPerf, setVendorPerf] = useState([])
  const [spendByCategory, setSpendByCategory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { data: statsData },
        { data: rfqs },
        { data: vendors },
        { data: pos },
      ] = await Promise.all([
        supabase.rpc('get_dashboard_stats'),
        supabase.from('rfqs').select('id, rfq_number, title, status, deadline, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('v_vendor_performance').select('*').order('total_spend', { ascending: false }).limit(5),
        supabase.from('purchase_orders').select('total_amount, vendors(vendor_categories(name))').in('status', ['issued', 'acknowledged', 'completed']),
      ])

      setStats(statsData)
      setRecentRfqs(rfqs || [])
      setVendorPerf(vendors || [])

      const catMap = {}
      for (const po of pos || []) {
        const cat = po.vendors?.vendor_categories?.name || 'Other'
        catMap[cat] = (catMap[cat] || 0) + (po.total_amount || 0)
      }
      setSpendByCategory(Object.entries(catMap).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="page-loading"><LoadingSpinner size="lg" /></div>

  const isVendor = profile?.role === ROLES.VENDOR
  const maxCatSpend = Math.max(...spendByCategory.map((c) => c.amount), 1)

  const statCards = isVendor
    ? [
        { label: 'Invited RFQs', value: stats?.active_rfqs ?? 0, color: 'accent' },
        { label: 'My Quotations', value: stats?.recent_pos ?? 0 },
        { label: 'Active POs', value: stats?.recent_invoices ?? 0, color: 'success' },
        { label: 'Pending Invoices', value: stats?.pending_invoices ?? 0, color: 'warning' },
      ]
    : [
        { label: 'Total Vendors', value: stats?.total_vendors ?? 0 },
        { label: 'Pending Approvals', value: stats?.pending_approvals ?? 0, color: 'warning' },
        { label: 'Total Spend', value: formatCurrency(stats?.total_spend_30d), color: 'success' },
        { label: 'Active RFQs', value: stats?.active_rfqs ?? 0, color: 'accent' },
      ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {isVendor ? "Today's overview" : `Procurement overview — ${profile?.full_name?.split(' ')[0] || 'Officer'}`}
          </p>
        </div>
        {!isVendor && <Link to="/rfqs/new" className="btn btn-primary">+ New RFQ</Link>}
      </div>

      <div className="stat-grid stat-grid-4">
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

      <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
        {!isVendor && vendorPerf.length > 0 && (
          <div className="data-card">
            <div className="card-header"><h3>Recent Vendor Performance</h3></div>
            <table className="data-table">
              <thead><tr><th>Vendor</th><th>Rating</th><th>Spend</th><th>POs</th></tr></thead>
              <tbody>
                {vendorPerf.map((v) => (
                  <tr key={v.vendor_id || v.company_name}>
                    <td><strong>{v.company_name || v.vendor_name}</strong></td>
                    <td>{v.rating != null ? `${v.rating}/5` : '—'}</td>
                    <td>{formatCurrency(v.total_spend)}</td>
                    <td>{v.total_orders ?? v.po_count ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isVendor && (
          <div className="data-card" style={{ padding: '1.25rem' }}>
            <h3 className="card-title">Spend by Category</h3>
            {spendByCategory.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No spend data yet</p>
            ) : (
              <div className="bar-chart">
                {spendByCategory.map((c) => (
                  <div key={c.category} className="bar-chart-row">
                    <span className="bar-label">{c.category}</span>
                    <div className="bar-track">
                      <div className="bar-fill accent" style={{ width: `${(c.amount / maxCatSpend) * 100}%` }} />
                    </div>
                    <span className="bar-value">{formatCurrency(c.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="data-card">
        <div className="card-header"><h3>Recent RFQs</h3></div>
        {recentRfqs.length === 0 ? (
          <p className="empty-inline">No RFQs yet</p>
        ) : (
          <table className="data-table">
            <thead><tr><th>RFQ #</th><th>Title</th><th>Status</th><th>Deadline</th></tr></thead>
            <tbody>
              {recentRfqs.map((rfq) => (
                <tr key={rfq.id}>
                  <td><Link to={`/rfqs/${rfq.id}`} className="link">{rfq.rfq_number}</Link></td>
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
