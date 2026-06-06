import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { WRITE_ROLES, formatCurrency, formatDate } from '../lib/constants'
import { api } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'

export default function POInvoice() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canWrite = WRITE_ROLES.includes(profile?.role)

  const [po, setPo] = useState(null)
  const [poItems, setPoItems] = useState([])
  const [invoice, setInvoice] = useState(null)
  const [invItems, setInvItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const [{ data: poData }, { data: items }] = await Promise.all([
      supabase.from('purchase_orders').select('*, vendors(company_name, email, address, city, gst_number), rfqs(title, rfq_number)').eq('id', id).single(),
      supabase.from('po_items').select('*').eq('po_id', id),
    ])
    setPo(poData)
    setPoItems(items || [])

    const { data: inv } = await supabase
      .from('invoices')
      .select('*')
      .eq('po_id', id)
      .maybeSingle()

    if (inv) {
      const { data: invIt } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id)
      setInvoice(inv)
      setInvItems(invIt || [])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function emailInvoice() {
    if (!invoice) return
    setActionLoading(true)
    setError('')
    try {
      const result = await api.emailInvoice(invoice.id)
      setMessage(`Invoice sent to ${result.sent_to}`)
      load()
    } catch (err) {
      setError(err.message)
    }
    setActionLoading(false)
  }

  function downloadInvoice() {
    window.print()
  }

  if (loading) return <div className="page-loading"><LoadingSpinner size="lg" /></div>
  if (!po) return null

  const doc = invoice || po
  const items = invoice ? invItems : poItems
  const docNumber = invoice?.invoice_number || po.po_number
  const docLabel = invoice ? 'Invoice' : 'Purchase Order'

  return (
    <div className="invoice-print-area">
      <div className="page-header no-print">
        <div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/purchase-orders/${id}`)} style={{ marginBottom: '0.5rem' }}>← Back</button>
          <h1 className="page-title">Purchase Order & Invoice</h1>
          <p className="page-subtitle">{po.po_number} {invoice ? `· ${invoice.invoice_number}` : '— invoice pending'}</p>
        </div>
        <div className="btn-group">
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>Print</button>
          <button type="button" className="btn btn-secondary" onClick={downloadInvoice}>Download</button>
          {canWrite && invoice && (
            <button type="button" className="btn btn-primary" onClick={emailInvoice} disabled={actionLoading}>
              {actionLoading ? <LoadingSpinner /> : 'Email'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="form-error no-print">{error}</div>}
      {message && <div className="form-success no-print">{message}</div>}

      <div className="document-card">
        <div className="doc-header">
          <div>
            <h2>{docLabel}</h2>
            <p className="doc-number">{docNumber}</p>
          </div>
          <StatusBadge status={doc.status} />
        </div>

        <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="detail-card">
            <h3>Vendor</h3>
            <div className="detail-row"><span className="label">Company</span><span className="value">{po.vendors?.company_name}</span></div>
            <div className="detail-row"><span className="label">Email</span><span className="value">{po.vendors?.email}</span></div>
            <div className="detail-row"><span className="label">GST</span><span className="value">{po.vendors?.gst_number || '—'}</span></div>
          </div>
          <div className="detail-card">
            <h3>Order Info</h3>
            <div className="detail-row"><span className="label">RFQ</span><span className="value">{po.rfqs?.rfq_number}</span></div>
            <div className="detail-row"><span className="label">Date</span><span className="value">{formatDate(po.issued_at || po.created_at)}</span></div>
            <div className="detail-row"><span className="label">Delivery</span><span className="value">{formatDate(po.delivery_date)}</span></div>
          </div>
        </div>

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

        <div className="doc-totals">
          <div className="detail-row"><span className="label">Subtotal</span><span className="value">{formatCurrency(doc.subtotal)}</span></div>
          <div className="detail-row"><span className="label">Tax ({doc.tax_percent}%)</span><span className="value">{formatCurrency(doc.tax_amount)}</span></div>
          <div className="detail-row total"><span className="label">Total</span><span className="value">{formatCurrency(doc.total_amount)}</span></div>
        </div>
      </div>
    </div>
  )
}
