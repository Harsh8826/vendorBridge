import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../lib/constants'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setNotifications(data || [])
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [user])

  async function markAllRead() {
    await supabase.rpc('mark_all_notifications_read')
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
  }

  if (loading) {
    return <div className="page-loading"><LoadingSpinner size="lg" /></div>
  }

  const unread = notifications.filter((n) => !n.is_read).length

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">{unread} unread</p>
        </div>
        {unread > 0 && (
          <button type="button" className="btn btn-secondary" onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="data-card">
          <EmptyState icon="🔔" title="No notifications" message="You're all caught up!" />
        </div>
      ) : (
        <div className="data-card">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`notif-item${n.is_read ? '' : ' unread'}`}
              style={{ borderBottom: '0.5px solid var(--border)' }}
              onClick={() => markRead(n.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <strong>{n.title}</strong>
                <span className="notif-time">{formatDateTime(n.created_at)}</span>
              </div>
              <p>{n.message}</p>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {n.type?.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
