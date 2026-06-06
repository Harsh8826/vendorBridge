import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { WRITE_ROLES, ROLES, formatCurrency, formatDate } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'

export default function QuotationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, user } = useAuth()
  const canWrite = WRITE_ROLES.includes(profile?.role)
  const isManager = profile?.role === ROLES.MANAGER || profile?.role === ROLES.ADMIN

  const [quotation, setQuotation] = useState(null)
  const [items, setItems] = useState([])
  const [managers, setManagers] = useState([])
  const [approval, setApproval] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [approveModal, setApproveModal] = useState(false)
  const [selectedManager, setSelectedManager] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const [
      { data: quote },
      { data: quoteItems },
      { data: appr },
    ] = await Promise.all([
      supabase
        .from('quotations')
        .select('*, vendors(company_name, email), rfqs(title, rfq_number)')
        .eq('id', id)
        .single(),
      supabase.from('quotation_items').select('*').eq('quotation_id', id),
      supabase.from('approvals').select('*, approver:approver_id(full_name), requester:requested_by(full_name)').eq('quotation_id', id).maybeSingle(),
    ])
    setQuotation(quote)
    setItems(quoteItems || [])
    setApproval(appr)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function openApprovalModal() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['manager', 'admin'])
      .eq('is_active', true)
    setManagers(data || [])
    setApproveModal(true)
  }

  async function requestApproval() {
    if (!selectedManager) return
    setActionLoading(true)
    const { error: err } = await supabase.from('approvals').insert({
      quotation_id: id,
      requested_by: user.id,
      approver_id: selectedManager,
    })
    setActionLoading(false)
    if (err) { setError(err.message); return }
    setApproveModal(false)
    load()
  }

  async function acceptQuotation() {
    setActionLoading(true)
    const { error: err } = await supabase
      .from('quotations')
      .update({ status: 'accepted' })
      .eq('id', id)
    setActionLoading(false)
    if (err) setError(err.message)
    else load()
  }

  async function createPO() {
    if (approval?.status !== 'approved') {
      setError('Quotation must be approved before creating a PO.')
      return
    }
    setActionLoading(true)
    const { data, error: err } = await supabase.rpc('create_po_from_quotation', { p_quotation_id: id })
    setActionLoading(false)
    if (err) { setError(err.message); return }
    navigate(`/purchase-orders/${data}`)
  }

  if (loading) {
    return <div className="page-loading"><LoadingSpinner size="lg" /></div>
  }

  if (!quotation) return null

  return (
    <div>
      <div className="page-header">
        <div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/quotations')} style={{ marginBottom: '0.5rem' }}>
            ← Back
          </button>
          <h1 className="page-title">{quotation.quotation_number}</h1>
          <p className="page-subtitle">{quotation.vendors?.company_name} · {quotation.rfqs?.rfq_number}</p>
        </div>
        <div className="btn-group">
          <StatusBadge status={quotation.status} />
          {canWrite && quotation.status === 'submitted' && !approval && (
            <button type="button" className="btn btn-secondary" onClick={openApprovalModal}>Request Approval</button>
          )}
          {canWrite && quotation.status === 'submitted' && (
            <button type="button" className="btn btn-success" onClick={acceptQuotation} disabled={actionLoading}>
              Accept Quotation
            </button>
          )}
          {canWrite && quotation.status === 'accepted' && approval?.status === 'approved' && (
            <button type="button" className="btn btn-primary" onClick={createPO} disabled={actionLoading}>
              Create Purchase Order
            </button>
          )}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="detail-card">
          <h3>Summary</h3>
          <div className="detail-row"><span className="label">Vendor</span><span className="value">{quotation.vendors?.company_name}</span></div>
          <div className="detail-row"><span className="label">RFQ</span><span className="value">{quotation.rfqs?.title}</span></div>
          <div className="detail-row"><span className="label">Delivery Days</span><span className="value">{quotation.delivery_days || '—'}</span></div>
          <div className="detail-row"><span className="label">Submitted</span><span className="value">{formatDate(quotation.submitted_at)}</span></div>
          <div className="detail-row"><span className="label">Subtotal</span><span className="value">{formatCurrency(quotation.subtotal)}</span></div>
          <div className="detail-row"><span className="label">Tax ({quotation.tax_percent}%)</span><span className="value">{formatCurrency(quotation.tax_amount)}</span></div>
          <div className="detail-row"><span className="label">Total</span><span className="value" style={{ color: 'var(--accent)', fontWeight: 700 }}>{formatCurrency(quotation.total_amount)}</span></div>
        </div>

        {approval && (
          <div className="detail-card">
            <h3>Approval</h3>
            <div className="detail-row"><span className="label">Status</span><StatusBadge status={approval.status} /></div>
            <div className="detail-row"><span className="label">Approver</span><span className="value">{approval.approver?.full_name}</span></div>
            <div className="detail-row"><span className="label">Requested by</span><span className="value">{approval.requester?.full_name}</span></div>
            {approval.remarks && (
              <div className="detail-row"><span className="label">Remarks</span><span className="value">{approval.remarks}</span></div>
            )}
          </div>
        )}
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

      <Modal open={approveModal} onClose={() => setApproveModal(false)} title="Request Approval">
        <div className="form-field">
          <label>Select Approver</label>
          <select value={selectedManager} onChange={(e) => setSelectedManager(e.target.value)}>
            <option value="">Choose manager...</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>{m.full_name}</option>
            ))}
          </select>
        </div>
        <div className="btn-group" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-primary" onClick={requestApproval} disabled={actionLoading || !selectedManager}>
            {actionLoading ? <LoadingSpinner /> : 'Send for Approval'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
