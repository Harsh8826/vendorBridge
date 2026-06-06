import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/dashboard', authenticate, async (req, res) => {
  const [
    { data: stats },
    { data: vendorPerf },
    { data: monthly },
    { data: categories },
  ] = await Promise.all([
    req.supabase.rpc('get_dashboard_stats'),
    req.supabase.from('v_vendor_performance').select('*').order('total_spend', { ascending: false }).limit(10),
    req.supabase.from('v_monthly_trends').select('*').order('month'),
    req.supabase
      .from('purchase_orders')
      .select('total_amount, vendors(vendor_categories(name))')
      .in('status', ['issued', 'acknowledged', 'completed']),
  ])

  const spendByCategory = {}
  for (const row of categories || []) {
    const cat = row.vendors?.vendor_categories?.name || 'Uncategorized'
    spendByCategory[cat] = (spendByCategory[cat] || 0) + (row.total_amount || 0)
  }

  res.json({
    stats: stats || {},
    vendorPerformance: vendorPerf || [],
    monthlyTrends: monthly || [],
    spendByCategory: Object.entries(spendByCategory).map(([category, amount]) => ({ category, amount })),
  })
})

export default router
