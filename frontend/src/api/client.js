import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

async function apiFetch(path, options = {}) {
  const token = await getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || res.statusText)
  return data
}

export const api = {
  getDashboardAnalytics: () => apiFetch('/api/analytics/dashboard'),
  emailInvoice: (id, email) => apiFetch(`/api/invoices/${id}/email`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  }),
  getInvoicePdfData: (id) => apiFetch(`/api/invoices/${id}/pdf-data`),
}
