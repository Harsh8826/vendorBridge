import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import Stepper from '../components/Stepper'

const STEPS = ['Details', 'Items', 'Vendors']
const EMPTY_ITEM = { item_name: '', description: '', quantity: 1, unit: 'unit', estimated_price: '' }

export default function RFQForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [categories, setCategories] = useState([])
  const [vendors, setVendors] = useState([])
  const [selectedVendors, setSelectedVendors] = useState([])
  const [form, setForm] = useState({
    title: '', description: '', deadline: '', delivery_date: '', location: '', department: '',
  })
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: cats }, { data: vends }] = await Promise.all([
        supabase.from('vendor_categories').select('*').order('name'),
        supabase.from('vendors').select('id, company_name, email').eq('status', 'active').order('company_name'),
      ])
      setCategories(cats || [])
      setVendors(vends || [])
    }
    load()
  }, [])

  function updateItem(i, field, value) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function validateStep() {
    if (step === 1) {
      if (!form.title || !form.deadline) { setError('Title and deadline are required.'); return false }
    }
    if (step === 2) {
      if (!items.some((i) => i.item_name.trim())) { setError('Add at least one line item.'); return false }
    }
    setError('')
    return true
  }

  async function saveRfq(publish = false) {
    if (!validateStep() && step < 3) return
    if (step === 1 && (!form.title || !form.deadline)) {
      setError('Title and deadline are required.')
      return
    }

    setSaving(true)
    setError('')

    const fullDescription = [form.location && `Location: ${form.location}`, form.description].filter(Boolean).join('\n\n')

    const { data: rfq, error: rfqErr } = await supabase
      .from('rfqs')
      .insert({
        title: form.title,
        description: fullDescription,
        deadline: new Date(form.deadline).toISOString(),
        department: form.department,
        created_by: user.id,
        status: publish ? 'published' : 'draft',
      })
      .select()
      .single()

    if (rfqErr) { setError(rfqErr.message); setSaving(false); return }

    const validItems = items.filter((i) => i.item_name.trim())
    if (validItems.length) {
      await supabase.from('rfq_items').insert(
        validItems.map((item, idx) => ({
          rfq_id: rfq.id,
          item_name: item.item_name,
          description: item.description,
          quantity: Number(item.quantity) || 1,
          unit: item.unit || 'unit',
          estimated_price: item.estimated_price ? Number(item.estimated_price) : null,
          sort_order: idx,
        }))
      )
    }

    if (selectedVendors.length) {
      await supabase.from('rfq_vendors').insert(
        selectedVendors.map((vendorId) => ({ rfq_id: rfq.id, vendor_id: vendorId }))
      )
    }

    setSaving(false)
    navigate(`/rfqs/${rfq.id}`)
  }

  function nextStep() {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, 3))
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Create RFQ</h1>
          <p className="page-subtitle">Open request for quotation</p>
        </div>
      </div>

      <Stepper steps={STEPS} current={step} />

      <div className="form-card" style={{ marginTop: '1.5rem' }}>
        {error && <div className="form-error">{error}</div>}

        {step === 1 && (
          <div className="form-grid">
            <div className="form-field full">
              <label>RFQ Title *</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Office furniture procurement" />
            </div>
            <div className="form-field">
              <label>Category</label>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>Deadline *</label>
              <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Delivery Date</label>
              <input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Location</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Mumbai HQ" />
            </div>
            <div className="form-field full">
              <label>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Detailed requirements..." />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="line-items">
            <div className="line-items-header">
              <h3>Line Items</h3>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setItems((p) => [...p, { ...EMPTY_ITEM }])}>+ Add Item</button>
            </div>
            {items.map((item, i) => (
              <div key={i} className="line-item-row">
                <input placeholder="Item *" value={item.item_name} onChange={(e) => updateItem(i, 'item_name', e.target.value)} />
                <input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
                <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} />
                <input placeholder="Unit" value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} />
                <input type="number" placeholder="Est. price" value={item.estimated_price} onChange={(e) => updateItem(i, 'estimated_price', e.target.value)} />
                <button type="button" className="remove-item-btn" onClick={() => items.length > 1 && setItems((p) => p.filter((_, idx) => idx !== i))}>×</button>
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 style={{ marginBottom: '1rem', fontFamily: 'var(--font-display)' }}>Assign Vendors</h3>
            {vendors.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No active vendors. Add vendors first.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {vendors.map((v) => (
                  <label key={v.id} className="vendor-check-row">
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
          </div>
        )}

        <div className="btn-group" style={{ marginTop: '1.5rem' }}>
          {step > 1 && (
            <button type="button" className="btn btn-secondary" onClick={() => setStep((s) => s - 1)}>Back</button>
          )}
          {step < 3 ? (
            <button type="button" className="btn btn-primary" onClick={nextStep}>Next Step</button>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => saveRfq(false)} disabled={saving}>
                {saving ? <LoadingSpinner /> : 'Save Draft'}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => saveRfq(true)} disabled={saving}>
                {saving ? <LoadingSpinner /> : 'Publish RFQ'}
              </button>
            </>
          )}
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/rfqs')}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
