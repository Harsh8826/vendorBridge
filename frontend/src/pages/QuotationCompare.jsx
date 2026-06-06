import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDate } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

export default function QuotationCompare() {
  const { id: rfqId } = useParams()
  const navigate = useNavigate()
  const [comparisons, setComparisons] = useState([])
  const [rfq, setRfq] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: rfqData }, { data: comp }] = await Promise.all([
        supabase.from('rfqs').select('title, rfq_number').eq('id', rfqId).single(),
        supabase.from('v_quotation_comparison').select('*').eq('rfq_id', rfqId).order('total_amount'),
      ])
      setRfq(rfqData)
      setComparisons(comp || [])
      setLoading(false)
    }
    load()
  }, [rfqId])

  if (loading) {
    return <div className="page-loading"><LoadingSpinner size="lg" /></div>
  }

  const lowestTotal = comparisons.length
    ? Math.min(...comparisons.map((c) => c.total_amount || Infinity))
    : null

  return (
    <div>
      <div className="page-header">
        <div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/rfqs/${rfqId}`)} style={{ marginBottom: '0.5rem' }}>
            ← Back to RFQ
          </button>
          <h1 className="page-title">Quotation Comparison</h1>
          <p className="page-subtitle">{rfq?.rfq_number} — {rfq?.title}</p>
        </div>
      </div>

      {comparisons.length === 0 ? (
        <div className="data-card">
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No quotations to compare yet
          </p>
        </div>
      ) : (
        <div className="data-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Quote #</th>
                <th>Subtotal</th>
                <th>Tax</th>
                <th>Total</th>
                <th>Delivery Days</th>
                <th>Status</th>
                <th>Submitted</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c) => (
                <tr key={c.quotation_id || c.id} className={c.total_amount === lowestTotal ? 'row-best' : ''}>
                  <td><strong>{c.vendor_name || c.company_name}</strong></td>
                  <td>{c.quotation_number}</td>
                  <td>{formatCurrency(c.subtotal)}</td>
                  <td>{formatCurrency(c.tax_amount)}</td>
                  <td><strong>{formatCurrency(c.total_amount)}</strong></td>
                  <td>{c.delivery_days || '—'}</td>
                  <td><StatusBadge status={c.status} /></td>
                  <td>{formatDate(c.submitted_at)}</td>
                  <td>
                    <Link to={`/quotations/${c.quotation_id}`} className="link">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
