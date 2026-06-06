import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

const EMPTY_ITEM = { item_name: '', description: '', quantity: 1, unit: 'unit', estimated_price: '' }

export default function RFQForm() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '', description: '', deadline: '', department: '',
  })
  const [items, setItems] = useState([{ ...EMPTY_ITEM }])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function updateItem(i, field, value) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }])
  }

  function removeItem(i) {
    if (items.length > 1) setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title || !form.deadline) {
      setError('Title and deadline are required.')
      return
    }
    const validItems = items.filter((i) => i.item_name.trim())
    if (!validItems.length) {
      setError('Add at least one line item.')
      return
    }

    setSaving(true)
    setError('')

    const { data: rfq, error: rfqErr } = await supabase
      .from('rfqs')
      .insert({
        title: form.title,
        description: form.description,
        deadline: new Date(form.deadline).toISOString(),
        department: form.department,
        created_by: user.id,
        status: 'draft',
      })
      .select()
      .single()

    if (rfqErr) { setError(rfqErr.message); setSaving(false); return }

    const { error: itemsErr } = await supabase.from('rfq_items').insert(
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

    setSaving(false)
    if (itemsErr) { setError(itemsErr.message); return }
    navigate(`/rfqs/${rfq.id}`)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Create RFQ</h1>
          <p className="page-subtitle">Define requirements and line items</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="form-grid">
          <div className="form-field full">
            <label>Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Office supplies procurement Q2" />
          </div>
          <div className="form-field">
            <label>Department</label>
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Procurement" />
          </div>
          <div className="form-field">
            <label>Deadline *</label>
            <input type="datetime-local" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </div>
          <div className="form-field full">
            <label>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detailed requirements..." rows={4} />
          </div>
        </div>

        <div className="line-items">
          <div className="line-items-header">
            <h3>Line Items</h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ Add Item</button>
          </div>
          {items.map((item, i) => (
            <div key={i} className="line-item-row">
              <input placeholder="Item name *" value={item.item_name} onChange={(e) => updateItem(i, 'item_name', e.target.value)} />
              <input placeholder="Description" value={item.description} onChange={(e) => updateItem(i, 'description', e.target.value)} />
              <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} />
              <input placeholder="Unit" value={item.unit} onChange={(e) => updateItem(i, 'unit', e.target.value)} />
              <input type="number" placeholder="Est. price" value={item.estimated_price} onChange={(e) => updateItem(i, 'estimated_price', e.target.value)} />
              <button type="button" className="remove-item-btn" onClick={() => removeItem(i)}>×</button>
            </div>
          ))}
        </div>

        <div className="btn-group" style={{ marginTop: '1.5rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <LoadingSpinner /> : 'Create RFQ'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/rfqs')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
