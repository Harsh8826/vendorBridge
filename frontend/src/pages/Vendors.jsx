import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { WRITE_ROLES } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import Modal from '../components/Modal'

const EMPTY_VENDOR = {
  company_name: '', contact_person: '', email: '', phone: '',
  address: '', city: '', state: '', country: 'India', pincode: '',
  gst_number: '', pan_number: '', category_id: '', notes: '',
}

export default function Vendors() {
  const { profile, user } = useAuth()
  const canWrite = WRITE_ROLES.includes(profile?.role)
  const [vendors, setVendors] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_VENDOR)
  const [editId, setEditId] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: v }, { data: c }] = await Promise.all([
      supabase.from('vendors').select('*, vendor_categories(name)').order('company_name'),
      supabase.from('vendor_categories').select('*').order('name'),
    ])
    setVendors(v || [])
    setCategories(c || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setForm(EMPTY_VENDOR)
    setEditId(null)
    setError('')
    setModalOpen(true)
  }

  function openEdit(vendor) {
    setForm({
      company_name: vendor.company_name,
      contact_person: vendor.contact_person,
      email: vendor.email,
      phone: vendor.phone || '',
      address: vendor.address || '',
      city: vendor.city || '',
      state: vendor.state || '',
      country: vendor.country || 'India',
      pincode: vendor.pincode || '',
      gst_number: vendor.gst_number || '',
      pan_number: vendor.pan_number || '',
      category_id: vendor.category_id || '',
      notes: vendor.notes || '',
    })
    setEditId(vendor.id)
    setError('')
    setModalOpen(true)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.company_name || !form.email || !form.contact_person) {
      setError('Company name, contact person, and email are required.')
      return
    }
    setSaving(true)
    setError('')

    const payload = { ...form, created_by: user.id }
    if (!payload.category_id) delete payload.category_id

    const { error: err } = editId
      ? await supabase.from('vendors').update(payload).eq('id', editId)
      : await supabase.from('vendors').insert(payload)

    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    load()
  }

  async function updateStatus(id, status) {
    await supabase.from('vendors').update({ status }).eq('id', id)
    load()
  }

  if (loading) {
    return <div className="page-loading"><LoadingSpinner size="lg" /></div>
  }

  const filtered = vendors.filter((v) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      v.company_name?.toLowerCase().includes(q) ||
      v.vendor_categories?.name?.toLowerCase().includes(q) ||
      v.email?.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Vendors</h1>
          <p className="page-subtitle">{vendors.length} registered vendors</p>
        </div>
        {canWrite && (
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Add Vendor
          </button>
        )}
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <input
          type="search"
          placeholder="Search vendors by name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%', maxWidth: 400 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="data-card">
          <EmptyState
            icon="◇"
            title="No vendors yet"
            message="Add your first vendor to start inviting them to RFQs."
            action={canWrite && (
              <button type="button" className="btn btn-primary" onClick={openCreate}>
                + Add Vendor
              </button>
            )}
          />
        </div>
      ) : (
        <div className="data-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Category</th>
                <th>Status</th>
                <th>Rating</th>
                {canWrite && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id}>
                  <td>
                    <strong>{v.company_name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.email}</div>
                  </td>
                  <td>{v.contact_person}</td>
                  <td>{v.vendor_categories?.name || '—'}</td>
                  <td><StatusBadge status={v.status} /></td>
                  <td>{v.rating ? `${v.rating}/5` : '—'}</td>
                  {canWrite && (
                    <td className="actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(v)}>
                        Edit
                      </button>
                      {v.status === 'pending' && (
                        <button type="button" className="btn btn-success btn-sm" onClick={() => updateStatus(v.id, 'active')}>
                          Activate
                        </button>
                      )}
                      {v.status === 'active' && (
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => updateStatus(v.id, 'inactive')}>
                          Deactivate
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Edit Vendor' : 'Add Vendor'} wide>
        <form onSubmit={handleSave}>
          {error && <div className="form-error">{error}</div>}
          <div className="form-grid">
            <div className="form-field">
              <label>Company Name *</label>
              <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Contact Person *</label>
              <input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Category</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>GST Number</label>
              <input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} />
            </div>
            <div className="form-field">
              <label>City</label>
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="form-field">
              <label>State</label>
              <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div className="form-field full">
              <label>Address</label>
              <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>
          <div className="btn-group" style={{ marginTop: '1.5rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <LoadingSpinner /> : editId ? 'Save Changes' : 'Add Vendor'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
