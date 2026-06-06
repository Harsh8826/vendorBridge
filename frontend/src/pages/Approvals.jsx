import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ROLES, formatCurrency, formatDateTime } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'

export default function Approvals() {
  const { profile, user } = useAuth()
  const isManager = [ROLES.MANAGER, ROLES.ADMIN].includes(profile?.role)

  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionModal, setActionModal] = useState(null)
  const [remarks, setRemarks] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  async function load() {
    const { data } = await supabase
      .from('approvals')
      .select(`
        *,
        requester:requested_by(full_name),
        approver:approver_id(full_name),
        quotations(id, quotation_number, total_amount, vendor_id, vendors(company_name), rfq_id, rfqs(title, rfq_number))
      `)
      .order('requested_at', { ascending: false })
    setApprovals(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    const channel = supabase
      .channel('approvals-page')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'approvals' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleAction(status) {
    if (!actionModal) return
    setActionLoading(true)
    await supabase
      .from('approvals')
      .update({ status, remarks })
      .eq('id', actionModal.id)
    setActionLoading(false)
    setActionModal(null)
    setRemarks('')
    load()
  }

  if (loading) {
    return <div className="page-loading"><LoadingSpinner size="lg" /></div>
  }

  const pending = approvals.filter((a) => a.status === 'pending')
  const myPending = pending.filter((a) => a.approver_id === user.id)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Approvals</h1>
          <p className="page-subtitle">
            {isManager ? `${myPending.length} pending your review` : `${pending.length} pending total`}
          </p>
        </div>
      </div>

      {approvals.length === 0 ? (
        <div className="data-card">
          <EmptyState icon="✓" title="No approvals yet" message="Approval requests will appear here when quotations are submitted for review." />
        </div>
      ) : (
        <div className="data-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quotation</th>
                <th>Vendor</th>
                <th>Amount</th>
                <th>Requested by</th>
                <th>Approver</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map((a) => (
                <tr key={a.id}>
                  <td>
                    <Link to={`/quotations/${a.quotation_id}`} className="link">
                      {a.quotations?.quotation_number}
                    </Link>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {a.quotations?.rfqs?.rfq_number}
                    </div>
                  </td>
                  <td>{a.quotations?.vendors?.company_name}</td>
                  <td>{formatCurrency(a.quotations?.total_amount)}</td>
                  <td>{a.requester?.full_name}</td>
                  <td>{a.approver?.full_name}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>{formatDateTime(a.requested_at)}</td>
                  <td className="actions">
                    {a.status === 'pending' && a.approver_id === user.id && (
                      <>
                        <button type="button" className="btn btn-success btn-sm" onClick={() => setActionModal({ ...a, action: 'approved' })}>
                          Approve
                        </button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => setActionModal({ ...a, action: 'rejected' })}>
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!actionModal}
        onClose={() => { setActionModal(null); setRemarks('') }}
        title={actionModal?.action === 'approved' ? 'Approve Quotation' : 'Reject Quotation'}
      >
        <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          {actionModal?.quotations?.quotation_number} — {formatCurrency(actionModal?.quotations?.total_amount)}
        </p>
        <div className="form-field">
          <label>Remarks</label>
          <textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional comments..." />
        </div>
        <div className="btn-group" style={{ marginTop: '1.5rem' }}>
          <button
            type="button"
            className={actionModal?.action === 'approved' ? 'btn btn-success' : 'btn btn-danger'}
            onClick={() => handleAction(actionModal.action)}
            disabled={actionLoading}
          >
            {actionLoading ? <LoadingSpinner /> : actionModal?.action === 'approved' ? 'Confirm Approval' : 'Confirm Rejection'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
