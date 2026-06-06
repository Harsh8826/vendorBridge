import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { WRITE_ROLES, formatCurrency, formatDate, formatDateTime } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'

export default function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const canWrite = WRITE_ROLES.includes(profile?.role)

  const [invoice, setInvoice] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [payModal, setPayModal] = useState(false)
  const [payment, setPayment] = useState({ method: 'bank_transfer', ref: '' })
  const [error, setError] = useState('')

  async function load() {
    const [{ data: inv }, { data: invItems }] = await Promise.all([
      supabase
        .from('invoices')
        .select('*, vendors(company_name, email), purchase_orders(po_number)')
        .eq('id', id)
        .single(),
      supabase.from('invoice_items').select('*').eq('invoice_id', id),
    ])
    setInvoice(inv)
    setItems(invItems || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function sendInvoice() {
    setActionLoading(true)
    setError('')
    try {
      await api.emailInvoice(id, invoice.vendors?.email)
      load()
    } catch (err) {
      const { error: fallbackErr } = await supabase
        .from('invoices')
        .update({ status: 'sent', sent_at: new Date().toISOString(), sent_to_email: invoice.vendors?.email })
        .eq('id', id)
      if (fallbackErr) setError(err.message)
      else load()
    }
    setActionLoading(false)
  }

  async function markPaid() {
    setActionLoading(true)
    const { error: err } = await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: payment.method,
        payment_ref: payment.ref,
      })
      .eq('id', id)
    setActionLoading(false)
    if (err) setError(err.message)
    else { setPayModal(false); load() }
  }

  if (loading) {
    return <div className="page-loading"><LoadingSpinner size="lg" /></div>
  }

  if (!invoice) return null

  return (
    <div className="invoice-print-area">
      <div className="page-header no-print">
        <div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/invoices')} style={{ marginBottom: '0.5rem' }}>
            ← Back
          </button>
          <h1 className="page-title">{invoice.invoice_number}</h1>
          <p className="page-subtitle">{invoice.vendors?.company_name} · {invoice.purchase_orders?.po_number}</p>
        </div>
        <div className="btn-group">
          <StatusBadge status={invoice.status} />
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            Print Invoice
          </button>
          {canWrite && invoice.status === 'draft' && (
            <button type="button" className="btn btn-primary" onClick={sendInvoice} disabled={actionLoading}>
              Send Invoice
            </button>
          )}
          {canWrite && ['sent', 'overdue'].includes(invoice.status) && (
            <button type="button" className="btn btn-success" onClick={() => setPayModal(true)}>
              Mark as Paid
            </button>
          )}
        </div>
      </div>

      {error && <div className="form-error no-print">{error}</div>}

      <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="detail-card">
          <h3>Invoice Details</h3>
          <div className="detail-row"><span className="label">Vendor</span><span className="value">{invoice.vendors?.company_name}</span></div>
          <div className="detail-row"><span className="label">PO</span><span className="value">{invoice.purchase_orders?.po_number}</span></div>
          <div className="detail-row"><span className="label">Due Date</span><span className="value">{formatDate(invoice.due_date)}</span></div>
          <div className="detail-row"><span className="label">Sent</span><span className="value">{formatDateTime(invoice.sent_at)}</span></div>
          <div className="detail-row"><span className="label">Paid</span><span className="value">{formatDateTime(invoice.paid_at)}</span></div>
        </div>
        <div className="detail-card">
          <h3>Amounts</h3>
          <div className="detail-row"><span className="label">Subtotal</span><span className="value">{formatCurrency(invoice.subtotal)}</span></div>
          <div className="detail-row"><span className="label">Tax ({invoice.tax_percent}%)</span><span className="value">{formatCurrency(invoice.tax_amount)}</span></div>
          <div className="detail-row"><span className="label">Total</span><span className="value" style={{ color: 'var(--accent)', fontWeight: 700 }}>{formatCurrency(invoice.total_amount)}</span></div>
        </div>
      </div>

      <div className="data-card">
        <table className="data-table">
          <thead><tr><th>Item</th><th>HSN/SAC</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>{item.item_name}</td>
                <td>{item.hsn_sac_code || '—'}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.unit_price)}</td>
                <td>{formatCurrency(item.total_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={payModal} onClose={() => setPayModal(false)} title="Mark Invoice as Paid">
        <div className="form-grid">
          <div className="form-field">
            <label>Payment Method</label>
            <select value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cheque">Cheque</option>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div className="form-field">
            <label>Payment Reference</label>
            <input value={payment.ref} onChange={(e) => setPayment({ ...payment, ref: e.target.value })} placeholder="Transaction ID" />
          </div>
        </div>
        <div className="btn-group" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-success" onClick={markPaid} disabled={actionLoading}>
            {actionLoading ? <LoadingSpinner /> : 'Confirm Payment'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
