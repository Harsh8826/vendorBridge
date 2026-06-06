import { supabaseForUser } from '../lib/supabase.js'

export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'No token provided' })

  const supabase = supabaseForUser(token)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return res.status(401).json({ error: 'Invalid token' })

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  req.user = user
  req.profile = profile
  req.supabase = supabase
  next()
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.profile?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}
