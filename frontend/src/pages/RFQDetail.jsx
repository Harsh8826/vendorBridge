import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { WRITE_ROLES, ROLES, formatCurrency, formatDate, formatDateTime } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import Modal from '../components/Modal'

export default function RFQDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, user, vendor } = useAuth()
  const canWrite = WRITE_ROLES.includes(profile?.role)
  const isVendor = profile?.role === ROLES.VENDOR

  const [rfq, setRfq] = useState(null)
  const [items, setItems] = useState([])
  const [invitedVendors, setInvitedVendors] = useState([])
  const [allVendors, setAllVendors] = useState([])
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteModal, setInviteModal] = useState(false)
  const [selectedVendors, setSelectedVendors] = useState([])
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const [
      { data: rfqData },
      { data: itemsData },
      { data: invited },
      { data: quotes },
    ] = await Promise.all([
      supabase.from('rfqs').select('*, profiles:created_by(full_name)').eq('id', id).single(),
      supabase.from('rfq_items').select('*').eq('rfq_id', id).order('sort_order'),
      supabase.from('rfq_vendors').select('*, vendors(id, company_name, email, status)').eq('rfq_id', id),
      supabase.from('quotations').select('id, quotation_number, status, total_amount, vendor_id, vendors(company_name)').eq('rfq_id', id),
    ])

    setRfq(rfqData)
    setItems(itemsData || [])
    setInvitedVendors(invited || [])
    setQuotations(quotes || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function openInviteModal() {
    const { data } = await supabase
      .from('vendors')
      .select('id, company_name, email')
      .eq('status', 'active')
      .order('company_name')
    const alreadyInvited = new Set(invitedVendors.map((iv) => iv.vendor_id))
    setAllVendors((data || []).filter((v) => !alreadyInvited.has(v.id)))
    setSelectedVendors([])
    setInviteModal(true)
  }

  async function inviteVendors() {
    if (!selectedVendors.length) return
    setActionLoading(true)
    const { error: err } = await supabase.from('rfq_vendors').insert(
      selectedVendors.map((vendorId) => ({ rfq_id: id, vendor_id: vendorId }))
    )
    setActionLoading(false)
    if (err) { setError(err.message); return }
    setInviteModal(false)
    load()
  }

  async function publishRfq() {
    setActionLoading(true)
    const { error: err } = await supabase.from('rfqs').update({ status: 'published' }).eq('id', id)
    setActionLoading(false)
    if (err) setError(err.message)
    else load()
  }

  async function closeRfq() {
    setActionLoading(true)
    await supabase.from('rfqs').update({ status: 'closed' }).eq('id', id)
    setActionLoading(false)
    load()
  }

  if (loading) {
    return <div className="page-loading"><LoadingSpinner size="lg" /></div>
  }

  if (!rfq) {
    return <EmptyMessage message="RFQ not found" />
  }

  const myQuotation = isVendor && vendor
    ? quotations.find((q) => q.vendor_id === vendor.id)
    : null

  const canSubmitQuote = isVendor && rfq.status === 'published' && !myQuotation
    && new Date(rfq.deadline) > new Date()

  return (
    <div>
      <div className="page-header">
        <div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/rfqs')} style={{ marginBottom: '0.5rem' }}>
            ← Back
          </button>
          <h1 className="page-title">{rfq.title}</h1>
          <p className="page-subtitle">{rfq.rfq_number} · {rfq.department || 'No department'}</p>
        </div>
        <div className="btn-group">
          <StatusBadge status={rfq.status} />
          {canWrite && rfq.status === 'draft' && (
            <button type="button" className="btn btn-primary" onClick={publishRfq} disabled={actionLoading}>
              Publish RFQ
            </button>
          )}
          {canWrite && rfq.status === 'published' && (
            <>
              <button type="button" className="btn btn-secondary" onClick={openInviteModal}>Invite Vendors</button>
              <button type="button" className="btn btn-danger" onClick={closeRfq} disabled={actionLoading}>Close RFQ</button>
            </>
          )}
          {canSubmitQuote && (
            <Link to={`/rfqs/${id}/quote`} className="btn btn-primary">Submit Quotation</Link>
          )}
          {myQuotation && (
            <Link to={`/quotations/${myQuotation.id}`} className="btn btn-secondary">View My Quotation</Link>
          )}
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="detail-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="detail-card">
          <h3>Details</h3>
          <div className="detail-row"><span className="label">Status</span><StatusBadge status={rfq.status} /></div>
          <div className="detail-row"><span className="label">Deadline</span><span className="value">{formatDateTime(rfq.deadline)}</span></div>
          <div className="detail-row"><span className="label">Created by</span><span className="value">{rfq.profiles?.full_name || '—'}</span></div>
          <div className="detail-row"><span className="label">Created</span><span className="value">{formatDate(rfq.created_at)}</span></div>
          {rfq.description && (
            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {rfq.description}
            </p>
          )}
        </div>

        <div className="detail-card">
          <h3>Line Items ({items.length})</h3>
          {items.map((item) => (
            <div key={item.id} className="detail-row">
              <span className="label">{item.item_name} × {item.quantity} {item.unit}</span>
              <span className="value">{item.estimated_price ? formatCurrency(item.estimated_price) : '—'}</span>
            </div>
          ))}
        </div>
      </div>

      {!isVendor && (
        <>
          <div className="data-card" style={{ marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>Invited Vendors</h3>
              {canWrite && rfq.status !== 'closed' && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={openInviteModal}>+ Invite</button>
              )}
            </div>
            {invitedVendors.length === 0 ? (
              <p style={{ padding: '1.5rem', color: 'var(--text-muted)', textAlign: 'center' }}>No vendors invited yet</p>
            ) : (
              <table className="data-table">
                <thead><tr><th>Vendor</th><th>Email</th><th>Responded</th></tr></thead>
                <tbody>
                  {invitedVendors.map((iv) => (
                    <tr key={iv.id}>
                      <td>{iv.vendors?.company_name}</td>
                      <td>{iv.vendors?.email}</td>
                      <td>{iv.responded ? '✓ Yes' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {quotations.length > 0 && (
            <div className="data-card">
              <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--border)' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.95rem' }}>
                  Quotations ({quotations.length})
                </h3>
              </div>
              <table className="data-table">
                <thead><tr><th>Quote #</th><th>Vendor</th><th>Total</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {quotations.map((q) => (
                    <tr key={q.id}>
                      <td>{q.quotation_number}</td>
                      <td>{q.vendors?.company_name}</td>
                      <td>{formatCurrency(q.total_amount)}</td>
                      <td><StatusBadge status={q.status} /></td>
                      <td><Link to={`/quotations/${q.id}`} className="link">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {canWrite && quotations.length > 1 && (
                <div style={{ padding: '1rem 1.25rem' }}>
                  <Link to={`/rfqs/${id}/compare`} className="btn btn-secondary btn-sm">Compare Quotations</Link>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Invite Vendors" wide>
        {allVendors.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No active vendors available to invite.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {allVendors.map((v) => (
              <label key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '8px', borderRadius: '8px', background: selectedVendors.includes(v.id) ? 'var(--accent-glow)' : 'transparent' }}>
                <input
                  type="checkbox"
                  checked={selectedVendors.includes(v.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedVendors((s) => [...s, v.id])
                    else setSelectedVendors((s) => s.filter((id) => id !== v.id))
                  }}
                />
                <span><strong>{v.company_name}</strong> — {v.email}</span>
              </label>
            ))}
          </div>
        )}
        <div className="btn-group" style={{ marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-primary" onClick={inviteVendors} disabled={actionLoading || !selectedVendors.length}>
            {actionLoading ? <LoadingSpinner /> : `Invite ${selectedVendors.length} vendor(s)`}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setInviteModal(false)}>Cancel</button>
        </div>
      </Modal>
    </div>
  )
}

function EmptyMessage({ message }) {
  return (
    <div className="data-card">
      <p style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>{message}</p>
    </div>
  )
}
