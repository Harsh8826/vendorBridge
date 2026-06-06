import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/constants'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Reports() {
  const [stats, setStats] = useState(null)
  const [vendorPerf, setVendorPerf] = useState([])
  const [monthlyTrends, setMonthlyTrends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { data: statsData },
        { data: vendors },
        { data: trends },
        { count: rfqCount },
      ] = await Promise.all([
        supabase.rpc('get_dashboard_stats'),
        supabase.from('v_vendor_performance').select('*').order('total_spend', { ascending: false }),
        supabase.from('v_monthly_trends').select('*').order('month'),
        supabase.from('rfqs').select('*', { count: 'exact', head: true }),
      ])
      setStats({ ...statsData, total_rfqs: rfqCount })
      setVendorPerf(vendors || [])
      setMonthlyTrends(trends || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="page-loading"><LoadingSpinner size="lg" /></div>
  }

  const maxMonthlySpend = Math.max(...monthlyTrends.map((m) => m.total_spend || 0), 1)
  const maxVendorSpend = Math.max(...vendorPerf.map((v) => v.total_spend || 0), 1)

  const statCards = [
    { label: 'Total Spend', value: formatCurrency(stats?.total_spend_30d), color: 'success' },
    { label: 'Active Vendors', value: stats?.total_vendors ?? 0 },
    { label: 'Total RFQs', value: stats?.total_rfqs ?? 0 },
    { label: 'Pending POs', value: stats?.recent_pos ?? 0, color: 'warning' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Procurement insights and trends</p>
        </div>
      </div>

      <div className="stat-grid">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value${s.color ? ` ${s.color}` : ''}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="data-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem' }}>
            Monthly Spend
          </h3>
          {monthlyTrends.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No spend data yet</p>
          ) : (
            <div className="bar-chart">
              {monthlyTrends.map((m) => (
                <div key={m.month} className="bar-chart-row">
                  <span className="bar-label">{m.month}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{ width: `${((m.total_spend || 0) / maxMonthlySpend) * 100}%` }}
                    />
                  </div>
                  <span className="bar-value">{formatCurrency(m.total_spend)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="data-card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem', marginBottom: '1rem' }}>
            Vendor Spend
          </h3>
          {vendorPerf.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No vendor data yet</p>
          ) : (
            <div className="bar-chart">
              {vendorPerf.slice(0, 6).map((v) => (
                <div key={v.vendor_id || v.company_name} className="bar-chart-row">
                  <span className="bar-label">{v.company_name || v.vendor_name}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill accent"
                      style={{ width: `${((v.total_spend || 0) / maxVendorSpend) * 100}%` }}
                    />
                  </div>
                  <span className="bar-value">{formatCurrency(v.total_spend)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="data-card">
        <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>
            Vendor Performance
          </h3>
        </div>
        {vendorPerf.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No data yet</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Total Spend</th>
                <th>POs</th>
                <th>Win Rate</th>
                <th>Avg Delivery (days)</th>
              </tr>
            </thead>
            <tbody>
              {vendorPerf.map((v) => (
                <tr key={v.vendor_id || v.company_name}>
                  <td><strong>{v.company_name || v.vendor_name}</strong></td>
                  <td>{formatCurrency(v.total_spend)}</td>
                  <td>{v.total_orders ?? v.po_count ?? '—'}</td>
                  <td>{v.win_rate != null ? `${Math.round(v.win_rate)}%` : '—'}</td>
                  <td>{v.avg_delivery_days ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
