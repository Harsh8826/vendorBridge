import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { WRITE_ROLES, ROLES, formatDate } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

export default function RFQs() {
  const { profile } = useAuth()
  const canWrite = WRITE_ROLES.includes(profile?.role)
  const isVendor = profile?.role === ROLES.VENDOR
  const [rfqs, setRfqs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('rfqs')
        .select('id, rfq_number, title, status, deadline, department, created_at')
        .order('created_at', { ascending: false })
      setRfqs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="page-loading"><LoadingSpinner size="lg" /></div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isVendor ? 'My RFQs' : 'Request for Quotations'}</h1>
          <p className="page-subtitle">
            {isVendor ? 'RFQs you have been invited to' : 'Manage procurement requests'}
          </p>
        </div>
        {canWrite && (
          <Link to="/rfqs/new" className="btn btn-primary">+ New RFQ</Link>
        )}
      </div>

      {rfqs.length === 0 ? (
        <div className="data-card">
          <EmptyState
            icon="◎"
            title="No RFQs yet"
            message={canWrite ? 'Create your first RFQ to start procurement.' : 'You have not been invited to any RFQs yet.'}
            action={canWrite && (
              <Link to="/rfqs/new" className="btn btn-primary">+ New RFQ</Link>
            )}
          />
        </div>
      ) : (
        <div className="data-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>RFQ #</th>
                <th>Title</th>
                <th>Department</th>
                <th>Status</th>
                <th>Deadline</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rfqs.map((rfq) => (
                <tr key={rfq.id}>
                  <td>
                    <Link to={`/rfqs/${rfq.id}`} className="link">{rfq.rfq_number || 'Draft'}</Link>
                  </td>
                  <td>{rfq.title}</td>
                  <td>{rfq.department || '—'}</td>
                  <td><StatusBadge status={rfq.status} /></td>
                  <td>{formatDate(rfq.deadline)}</td>
                  <td>{formatDate(rfq.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
