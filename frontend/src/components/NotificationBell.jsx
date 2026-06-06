import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../lib/constants'

export default function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const unread = notifications.filter((n) => !n.is_read).length

  useEffect(() => {
    if (!user) return

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)
      setNotifications(data || [])
    }

    load()

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  async function markAllRead() {
    await supabase.rpc('mark_all_notifications_read')
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  async function markRead(id) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
  }

  return (
    <div className="notif-bell-wrap">
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && <span className="notif-badge">{unread}</span>}
      </button>

      {open && (
        <>
          <div className="notif-backdrop" onClick={() => setOpen(false)} />
          <div className="notif-dropdown">
            <div className="notif-dropdown-header">
              <span>Notifications</span>
              {unread > 0 && (
                <button type="button" className="btn-link" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>
            <div className="notif-list">
              {notifications.length === 0 ? (
                <p className="notif-empty">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`notif-item${n.is_read ? '' : ' unread'}`}
                    onClick={() => markRead(n.id)}
                  >
                    <strong>{n.title}</strong>
                    <p>{n.message}</p>
                    <span className="notif-time">{formatDateTime(n.created_at)}</span>
                  </div>
                ))
              )}
            </div>
            <Link to="/notifications" className="notif-view-all" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
