import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { WRITE_ROLES, formatCurrency, formatDate } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

export default function PODetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const canWrite = WRITE_ROLES.includes(profile?.role)

  const [po, setPo] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [{ data: poData }, { data: poItems }] = await Promise.all([
      supabase
        .from('purchase_orders')
        .select('*, vendors(company_name, email), rfqs(title, rfq_number)')
        .eq('id', id)
        .single(),
      supabase.from('po_items').select('*').eq('po_id', id),
    ])
    setPo(poData)
    setItems(poItems || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function issuePO() {
    setActionLoading(true)
    const { error: err } = await supabase
      .from('purchase_orders')
      .update({
        status: 'issued',
        issued_by: user.id,
        issued_at: new Date().toISOString(),
      })
      .eq('id', id)
    setActionLoading(false)
    if (err) setError(err.message)
    else load()
  }

  async function createInvoice() {
    if (po?.status !== 'issued') {
      setError('PO must be issued before creating an invoice.')
      return
    }
    setActionLoading(true)
    const { data, error: err } = await supabase.rpc('create_invoice_from_po', { p_po_id: id })
    setActionLoading(false)
    if (err) { setError(err.message); return }
    navigate(`/invoices/${data}`)
  }

  if (loading) {
    return <div className="page-loading"><LoadingSpinner size="lg" /></div>
  }

  if (!po) return null

  return (
    <div>
      <div className="page-header">
        <div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/purchase-orders')} style={{ marginBottom: '0.5rem' }}>
            ← Back
          </button>
          <h1 className="page-title">{po.po_number}</h1>
          <p className="page-subtitle">{po.vendors?.company_name} · {po.rfqs?.rfq_number}</p>
        </div>
        <div className="btn-group">
          <StatusBadge status={po.status} />
          {canWrite && po.status === 'draft' && (
            <button type="button" className="btn btn-primary" onClick={issuePO} disabled={actionLoading}>
              Issue PO
            </button>
          )}
          {canWrite && po.status === 'issued' && (
            <button type="button" className="btn btn-primary" onClick={createInvoice} disabled={actionLoading}>
              Create Invoice
            </button>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => navigate(`/purchase-orders/${id}/documents`)}>
            PO & Invoice
          </button>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="detail-card">
          <h3>Order Details</h3>
          <div className="detail-row"><span className="label">Vendor</span><span className="value">{po.vendors?.company_name}</span></div>
          <div className="detail-row"><span className="label">RFQ</span><span className="value">{po.rfqs?.title}</span></div>
          <div className="detail-row"><span className="label">Delivery Date</span><span className="value">{formatDate(po.delivery_date)}</span></div>
          <div className="detail-row"><span className="label">Issued</span><span className="value">{formatDate(po.issued_at)}</span></div>
        </div>
        <div className="detail-card">
          <h3>Amounts</h3>
          <div className="detail-row"><span className="label">Subtotal</span><span className="value">{formatCurrency(po.subtotal)}</span></div>
          <div className="detail-row"><span className="label">Tax ({po.tax_percent}%)</span><span className="value">{formatCurrency(po.tax_amount)}</span></div>
          <div className="detail-row"><span className="label">Total</span><span className="value" style={{ color: 'var(--accent)', fontWeight: 700 }}>{formatCurrency(po.total_amount)}</span></div>
        </div>
      </div>

      <div className="data-card">
        <table className="data-table">
          <thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.item_name}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.unit_price)}</td>
                <td>{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
