import { Router } from 'express'
import { authenticate, requireRole } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabase.js'

const router = Router()
const WRITE_ROLES = ['admin', 'procurement_officer']

router.post('/:id/email', authenticate, requireRole(...WRITE_ROLES), async (req, res) => {
  const { id } = req.params
  const { email } = req.body

  const { data: invoice, error } = await req.supabase
    .from('invoices')
    .select('*, vendors(company_name, email)')
    .eq('id', id)
    .single()

  if (error || !invoice) return res.status(404).json({ error: 'Invoice not found' })

  const toEmail = email || invoice.vendors?.email
  if (!toEmail) return res.status(400).json({ error: 'No recipient email' })

  const { error: updateErr } = await req.supabase
    .from('invoices')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_to_email: toEmail,
    })
    .eq('id', id)

  if (updateErr) return res.status(400).json({ error: updateErr.message })

  if (supabaseAdmin) {
    await supabaseAdmin.from('activity_logs').insert({
      user_id: req.user.id,
      entity_type: 'invoice',
      entity_id: id,
      action: 'email_sent',
      description: `Invoice ${invoice.invoice_number} emailed to ${toEmail}`,
      metadata: { to: toEmail },
    })
  }

  res.json({ success: true, sent_to: toEmail })
})

router.get('/:id/pdf-data', authenticate, async (req, res) => {
  const { id } = req.params

  const [{ data: invoice }, { data: items }] = await Promise.all([
    req.supabase
      .from('invoices')
      .select('*, vendors(company_name, email, address, city, gst_number), purchase_orders(po_number)')
      .eq('id', id)
      .single(),
    req.supabase.from('invoice_items').select('*').eq('invoice_id', id),
  ])

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' })

  res.json({ invoice, items: items || [] })
})

export default router
