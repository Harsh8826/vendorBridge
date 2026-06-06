import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ROLES, formatCurrency, formatDate } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

export default function PurchaseOrders() {
  const { profile } = useAuth()
  const isVendor = profile?.role === ROLES.VENDOR
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('purchase_orders')
        .select('id, po_number, status, total_amount, delivery_date, issued_at, vendor_id, vendors(company_name), rfqs(rfq_number, title)')
        .order('created_at', { ascending: false })
      setOrders(data || [])
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
          <h1 className="page-title">{isVendor ? 'My Purchase Orders' : 'Purchase Orders'}</h1>
          <p className="page-subtitle">{orders.length} total orders</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="data-card">
          <EmptyState icon="▣" title="No purchase orders yet" message="POs are created from approved quotations." />
        </div>
      ) : (
        <div className="data-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO #</th>
                {!isVendor && <th>Vendor</th>}
                <th>RFQ</th>
                <th>Total</th>
                <th>Status</th>
                <th>Delivery</th>
                <th>Issued</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id}>
                  <td>
                    <Link to={`/purchase-orders/${po.id}`} className="link">{po.po_number}</Link>
                  </td>
                  {!isVendor && <td>{po.vendors?.company_name}</td>}
                  <td>{po.rfqs?.rfq_number}</td>
                  <td>{formatCurrency(po.total_amount)}</td>
                  <td><StatusBadge status={po.status} /></td>
                  <td>{formatDate(po.delivery_date)}</td>
                  <td>{formatDate(po.issued_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
