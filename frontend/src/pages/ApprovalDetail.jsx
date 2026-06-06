import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, formatDateTime } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import Stepper from '../components/Stepper'
import Modal from '../components/Modal'

const WORKFLOW_STEPS = ['Submitted', 'Manager Review', 'Finance Approval', 'Completed']

export default function ApprovalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [approval, setApproval] = useState(null)
  const [loading, setLoading] = useState(true)
  const [remarks, setRemarks] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [modal, setModal] = useState(null)

  async function load() {
    const { data } = await supabase
      .from('approvals')
      .select(`
        *,
        requester:requested_by(full_name),
        approver:approver_id(full_name),
        quotations(id, quotation_number, total_amount, vendor_id, vendors(company_name), rfq_id, rfqs(title, rfq_number, department))
      `)
      .eq('id', id)
      .single()
    setApproval(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const currentStep = approval?.status === 'approved' ? 4
    : approval?.status === 'rejected' ? 2
    : 2

  async function handleAction(status) {
    setActionLoading(true)
    await supabase.from('approvals').update({ status, remarks }).eq('id', id)
    setActionLoading(false)
    setModal(null)
    load()
  }

  if (loading) return <div className="page-loading"><LoadingSpinner size="lg" /></div>
  if (!approval) return null

  const q = approval.quotations
  const canAct = approval.status === 'pending' && approval.approver_id === user.id

  return (
    <div>
      <div className="page-header">
        <div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/approvals')} style={{ marginBottom: '0.5rem' }}>← Back</button>
          <h1 className="page-title">Approval Workflow</h1>
          <p className="page-subtitle">
            {q?.rfqs?.rfq_number} — {q?.vendors?.company_name} — {formatCurrency(q?.total_amount)}
          </p>
        </div>
        <StatusBadge status={approval.status} />
      </div>

      <Stepper steps={WORKFLOW_STEPS} current={currentStep} />

      <div className="detail-grid" style={{ margin: '1.5rem 0' }}>
        <div className="detail-card">
          <h3>Summary</h3>
          <div className="detail-row"><span className="label">Vendor</span><span className="value">{q?.vendors?.company_name}</span></div>
          <div className="detail-row"><span className="label">Amount</span><span className="value">{formatCurrency(q?.total_amount)}</span></div>
          <div className="detail-row"><span className="label">Category</span><span className="value">{q?.rfqs?.department || '—'}</span></div>
          <div className="detail-row"><span className="label">Requested</span><span className="value">{formatDateTime(approval.requested_at)}</span></div>
        </div>
        <div className="detail-card">
          <h3>Timeline</h3>
          <div className="timeline">
            <div className="timeline-item done">
              <strong>Submitted</strong>
              <span>{approval.requester?.full_name} · {formatDateTime(approval.requested_at)}</span>
            </div>
            <div className={`timeline-item${approval.status !== 'pending' ? ' done' : ' active'}`}>
              <strong>Manager Review</strong>
              <span>{approval.approver?.full_name}</span>
            </div>
            {approval.status === 'approved' && (
              <div className="timeline-item done">
                <strong>Approved</strong>
                <span>{formatDateTime(approval.actioned_at)}</span>
              </div>
            )}
            {approval.status === 'rejected' && (
              <div className="timeline-item rejected">
                <strong>Rejected</strong>
                <span>{formatDateTime(approval.actioned_at)}</span>
              </div>
            )}
          </div>
          {approval.remarks && <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Remarks: {approval.remarks}</p>}
        </div>
      </div>

      {canAct && (
        <div className="btn-group">
          <button type="button" className="btn btn-success" onClick={() => setModal('approved')}>Approve</button>
          <button type="button" className="btn btn-danger" onClick={() => setModal('rejected')}>Reject</button>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'approved' ? 'Approve' : 'Reject'}>
        <div className="form-field">
          <label>Remarks</label>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional comments..." />
        </div>
        <div className="btn-group" style={{ marginTop: '1rem' }}>
          <button
            type="button"
            className={modal === 'approved' ? 'btn btn-success' : 'btn btn-danger'}
            onClick={() => handleAction(modal)}
            disabled={actionLoading}
          >
            {actionLoading ? <LoadingSpinner /> : 'Confirm'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
