import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { WRITE_ROLES, formatCurrency, formatDate } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

export default function QuotationCompare() {
  const { id: rfqId } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canWrite = WRITE_ROLES.includes(profile?.role)

  const [comparisons, setComparisons] = useState([])
  const [rfq, setRfq] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(null)

  useEffect(() => {
    async function load() {
      const [{ data: rfqData }, { data: comp }] = await Promise.all([
        supabase.from('rfqs').select('title, rfq_number, deadline').eq('id', rfqId).single(),
        supabase.from('v_quotation_comparison').select('*').eq('rfq_id', rfqId).order('total_amount'),
      ])
      setRfq(rfqData)
      setComparisons(comp || [])
      setLoading(false)
    }
    load()
  }, [rfqId])

  async function selectVendor(quotationId) {
    setSelecting(quotationId)
    await supabase.from('quotations').update({ status: 'accepted' }).eq('id', quotationId)
    setSelecting(null)
    navigate(`/quotations/${quotationId}`)
  }

  if (loading) return <div className="page-loading"><LoadingSpinner size="lg" /></div>

  const lowestTotal = comparisons.length ? Math.min(...comparisons.map((c) => c.total_amount || Infinity)) : null
  const bestId = comparisons.find((c) => c.total_amount === lowestTotal)?.quotation_id

  const rows = [
    { label: 'Total Price', key: 'total_amount', fmt: formatCurrency },
    { label: 'Subtotal', key: 'subtotal', fmt: formatCurrency },
    { label: 'Tax', key: 'tax_amount', fmt: formatCurrency },
    { label: 'Delivery Days', key: 'delivery_days', fmt: (v) => v || '—' },
    { label: 'Status', key: 'status', fmt: (v) => v },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/rfqs/${rfqId}`)} style={{ marginBottom: '0.5rem' }}>← Back to RFQ</button>
          <h1 className="page-title">Quotation Comparison</h1>
          <p className="page-subtitle">
            {rfq?.rfq_number} — {rfq?.title} · {comparisons.length} quotation{comparisons.length !== 1 ? 's' : ''} received
          </p>
        </div>
      </div>

      {comparisons.length === 0 ? (
        <div className="data-card"><p className="empty-inline">No quotations to compare yet</p></div>
      ) : (
        <>
          <div className="data-card compare-matrix-wrap">
            <table className="compare-matrix">
              <thead>
                <tr>
                  <th></th>
                  {comparisons.map((c) => (
                    <th key={c.quotation_id} className={c.quotation_id === bestId ? 'col-best' : ''}>
                      <strong>{c.vendor_name || c.company_name}</strong>
                      <div className="matrix-sub">{c.quotation_number}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td className="row-label">{row.label}</td>
                    {comparisons.map((c) => (
                      <td key={c.quotation_id} className={c.quotation_id === bestId ? 'col-best' : ''}>
                        {row.key === 'status' ? <StatusBadge status={c.status} /> : row.fmt(c[row.key])}
                        {row.key === 'total_amount' && c.total_amount === lowestTotal && (
                          <span className="lowest-badge">Lowest</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canWrite && (
            <div className="compare-actions">
              {comparisons.map((c) => (
                <div key={c.quotation_id} className={`compare-vendor-card${c.quotation_id === bestId ? ' best' : ''}`}>
                  <strong>{c.vendor_name || c.company_name}</strong>
                  <span>{formatCurrency(c.total_amount)}</span>
                  <div className="btn-group">
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      disabled={selecting === c.quotation_id}
                      onClick={() => selectVendor(c.quotation_id)}
                    >
                      {selecting === c.quotation_id ? <LoadingSpinner /> : 'Select Vendor'}
                    </button>
                    <Link to={`/quotations/${c.quotation_id}`} className="btn btn-secondary btn-sm">View</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
