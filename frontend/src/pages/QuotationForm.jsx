import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

export default function QuotationForm() {
  const { id: rfqId } = useParams()
  const { vendor } = useAuth()
  const navigate = useNavigate()

  const [rfq, setRfq] = useState(null)
  const [rfqItems, setRfqItems] = useState([])
  const [form, setForm] = useState({ delivery_days: '', notes: '', terms_conditions: '' })
  const [lineItems, setLineItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: rfqData }, { data: items }] = await Promise.all([
        supabase.from('rfqs').select('*').eq('id', rfqId).single(),
        supabase.from('rfq_items').select('*').eq('rfq_id', rfqId).order('sort_order'),
      ])
      setRfq(rfqData)
      setRfqItems(items || [])
      setLineItems((items || []).map((item) => ({
        rfq_item_id: item.id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: '',
      })))
      setLoading(false)
    }
    load()
  }, [rfqId])

  function updateLine(i, field, value) {
    setLineItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!vendor) { setError('No vendor profile linked to your account.'); return }
    if (rfq?.status !== 'published') { setError('This RFQ is not open for quotations.'); return }
    if (new Date(rfq.deadline) <= new Date()) { setError('The quotation deadline has passed.'); return }

    const validItems = lineItems.filter((i) => i.unit_price)
    if (!validItems.length) { setError('Enter unit prices for at least one item.'); return }

    setSaving(true)
    setError('')

    const { data: quotation, error: qErr } = await supabase
      .from('quotations')
      .insert({
        rfq_id: rfqId,
        vendor_id: vendor.id,
        delivery_days: form.delivery_days ? Number(form.delivery_days) : null,
        notes: form.notes,
        terms_conditions: form.terms_conditions,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (qErr) { setError(qErr.message); setSaving(false); return }

    const { error: itemsErr } = await supabase.from('quotation_items').insert(
      validItems.map((item) => ({
        quotation_id: quotation.id,
        rfq_item_id: item.rfq_item_id,
        item_name: item.item_name,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      }))
    )

    setSaving(false)
    if (itemsErr) { setError(itemsErr.message); return }
    navigate(`/quotations/${quotation.id}`)
  }

  if (loading) {
    return <div className="page-loading"><LoadingSpinner size="lg" /></div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate(`/rfqs/${rfqId}`)} style={{ marginBottom: '0.5rem' }}>
            ← Back
          </button>
          <h1 className="page-title">Submit Quotation</h1>
          <p className="page-subtitle">{rfq?.title}</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="form-error">{error}</div>}

        <div className="form-grid">
          <div className="form-field">
            <label>Delivery Days</label>
            <input type="number" value={form.delivery_days} onChange={(e) => setForm({ ...form, delivery_days: e.target.value })} placeholder="e.g. 14" />
          </div>
          <div className="form-field full">
            <label>Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="form-field full">
            <label>Terms & Conditions</label>
            <textarea value={form.terms_conditions} onChange={(e) => setForm({ ...form, terms_conditions: e.target.value })} />
          </div>
        </div>

        <div className="line-items">
          <div className="line-items-header"><h3>Pricing</h3></div>
          {lineItems.map((item, i) => (
            <div key={i} className="line-item-row" style={{ gridTemplateColumns: '2fr 80px 120px' }}>
              <input value={item.item_name} readOnly style={{ opacity: 0.7 }} />
              <input value={item.quantity} readOnly style={{ opacity: 0.7 }} />
              <input type="number" placeholder="Unit price *" value={item.unit_price} onChange={(e) => updateLine(i, 'unit_price', e.target.value)} />
            </div>
          ))}
        </div>

        <div className="btn-group" style={{ marginTop: '1.5rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <LoadingSpinner /> : 'Submit Quotation'}
          </button>
        </div>
      </form>
    </div>
  )
}
