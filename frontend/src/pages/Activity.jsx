import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateTime } from '../lib/constants'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'rfq', label: 'RFQs' },
  { id: 'approval', label: 'Approvals' },
  { id: 'finance', label: 'Finance' },
]

const FINANCE_TYPES = ['purchase_order', 'invoice']

export default function Activity() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('all')

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from('activity_logs')
        .select('*, profiles:user_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(100)

      if (tab === 'rfq') query = query.eq('entity_type', 'rfq')
      else if (tab === 'approval') query = query.eq('entity_type', 'approval')
      else if (tab === 'finance') query = query.in('entity_type', FINANCE_TYPES)

      const { data } = await query
      setLogs(data || [])
      setLoading(false)
    }
    load()
  }, [tab])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity</h1>
          <p className="page-subtitle">Audit trail of procurement actions</p>
        </div>
      </div>

      <div className="tab-bar" style={{ marginBottom: '1.5rem' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab-btn${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="page-loading"><LoadingSpinner size="lg" /></div>
      ) : logs.length === 0 ? (
        <div className="data-card">
          <EmptyState icon="📋" title="No activity yet" message="Actions across the platform will appear here." />
        </div>
      ) : (
        <div className="data-card">
          {logs.map((log) => (
            <div key={log.id} className="activity-item">
              <div className="activity-dot" />
              <div className="activity-content">
                <div className="activity-header">
                  <strong>{log.profiles?.full_name || 'System'}</strong>
                  <span className="activity-time">{formatDateTime(log.created_at)}</span>
                </div>
                <p>{log.description || log.action}</p>
                <span className="activity-meta">
                  {log.entity_type?.replace(/_/g, ' ')} · {log.action}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
