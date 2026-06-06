import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './components/DashboardLayout'
import Login from './pages/Login'
import Signup from './pages/signup'
import Dashboard from './pages/Dashboard'
import Vendors from './pages/Vendors'
import RFQs from './pages/RFQs'
import RFQForm from './pages/RFQForm'
import RFQDetail from './pages/RFQDetail'
import QuotationForm from './pages/QuotationForm'
import QuotationCompare from './pages/QuotationCompare'
import Quotations from './pages/Quotations'
import QuotationDetail from './pages/QuotationDetail'
import Approvals from './pages/Approvals'
import ApprovalDetail from './pages/ApprovalDetail'
import POInvoice from './pages/POInvoice'
import PurchaseOrders from './pages/PurchaseOrders'
import PODetail from './pages/PODetail'
import Invoices from './pages/Invoices'
import InvoiceDetail from './pages/InvoiceDetail'
import Notifications from './pages/Notifications'
import Reports from './pages/Reports'
import Activity from './pages/Activity'
import ForgotPassword from './pages/ForgotPassword'
import { ROLES } from './lib/constants'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/notifications" element={<Notifications />} />

            <Route path="/vendors" element={<Vendors />} />

            <Route path="/rfqs" element={<RFQs />} />
            <Route path="/rfqs/new" element={
              <ProtectedRoute roles={[ROLES.ADMIN, ROLES.PROCUREMENT]}>
                <RFQForm />
              </ProtectedRoute>
            } />
            <Route path="/rfqs/:id" element={<RFQDetail />} />
            <Route path="/rfqs/:id/compare" element={
              <ProtectedRoute roles={[ROLES.ADMIN, ROLES.PROCUREMENT, ROLES.MANAGER]}>
                <QuotationCompare />
              </ProtectedRoute>
            } />
            <Route path="/rfqs/:id/quote" element={
              <ProtectedRoute roles={[ROLES.VENDOR]}>
                <QuotationForm />
              </ProtectedRoute>
            } />

            <Route path="/quotations" element={<Quotations />} />
            <Route path="/quotations/:id" element={<QuotationDetail />} />

            <Route path="/approvals" element={<Approvals />} />
            <Route path="/approvals/:id" element={<ApprovalDetail />} />

            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/purchase-orders/:id" element={<PODetail />} />
            <Route path="/purchase-orders/:id/documents" element={<POInvoice />} />

            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:id" element={<InvoiceDetail />} />

            <Route path="/reports" element={
              <ProtectedRoute roles={[ROLES.ADMIN, ROLES.PROCUREMENT, ROLES.MANAGER]}>
                <Reports />
              </ProtectedRoute>
            } />
            <Route path="/activity" element={
              <ProtectedRoute roles={[ROLES.ADMIN, ROLES.PROCUREMENT, ROLES.MANAGER]}>
                <Activity />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
