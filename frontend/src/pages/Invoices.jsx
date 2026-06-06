import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ROLES, formatCurrency, formatDate } from '../lib/constants'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'

export default function Invoices() {
  const { profile } = useAuth()
  const isVendor = profile?.role === ROLES.VENDOR
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, status, total_amount, due_date, sent_at, paid_at, vendor_id, vendors(company_name), purchase_orders(po_number)')
        .order('created_at', { ascending: false })
      setInvoices(data || [])
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
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">{invoices.length} total invoices</p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="data-card">
          <EmptyState icon="▤" title="No invoices yet" message="Invoices are created from issued purchase orders." />
        </div>
      ) : (
        <div className="data-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                {!isVendor && <th>Vendor</th>}
                <th>PO #</th>
                <th>Total</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link to={`/invoices/${inv.id}`} className="link">{inv.invoice_number}</Link>
                  </td>
                  {!isVendor && <td>{inv.vendors?.company_name}</td>}
                  <td>{inv.purchase_orders?.po_number}</td>
                  <td>{formatCurrency(inv.total_amount)}</td>
                  <td><StatusBadge status={inv.status} /></td>
                  <td>{formatDate(inv.due_date)}</td>
                  <td>{formatDate(inv.paid_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
