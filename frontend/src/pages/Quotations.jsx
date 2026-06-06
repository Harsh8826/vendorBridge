import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ROLES, formatCurrency, formatDate } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

export default function Quotations() {
  const { profile } = useAuth()
  const isVendor = profile?.role === ROLES.VENDOR
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('quotations')
        .select('id, quotation_number, status, total_amount, submitted_at, rfq_id, vendor_id, vendors(company_name), rfqs(title, rfq_number)')
        .order('submitted_at', { ascending: false })
      setQuotations(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="page-loading"><LoadingSpinner size="lg" /></div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isVendor ? 'My Quotations' : 'Quotations'}</h1>
          <p className="page-subtitle">{quotations.length} total quotations</p>
        </div>
      </div>

      {quotations.length === 0 ? (
        <div className="data-card">
          <EmptyState icon="◆" title="No quotations yet" message="Quotations will appear here once vendors respond to RFQs." />
        </div>
      ) : (
        <div className="data-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quote #</th>
                {!isVendor && <th>Vendor</th>}
                <th>RFQ</th>
                <th>Total</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id}>
                  <td>
                    <Link to={`/quotations/${q.id}`} className="link">{q.quotation_number}</Link>
                  </td>
                  {!isVendor && <td>{q.vendors?.company_name}</td>}
                  <td>
                    <Link to={`/rfqs/${q.rfq_id}`} className="link">{q.rfqs?.rfq_number}</Link>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{q.rfqs?.title}</div>
                  </td>
                  <td>{formatCurrency(q.total_amount)}</td>
                  <td><StatusBadge status={q.status} /></td>
                  <td>{formatDate(q.submitted_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
