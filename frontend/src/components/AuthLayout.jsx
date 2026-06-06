import './AuthLayout.css'

export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="auth-root">
      {/* Background grid */}
      <div className="auth-grid" aria-hidden="true" />

      {/* Glow blobs */}
      <div className="blob blob-1" aria-hidden="true" />
      <div className="blob blob-2" aria-hidden="true" />

      {/* Branding top-left */}
      <div className="auth-brand">
        <span className="brand-icon">⬡</span>
        <span className="brand-name">VendorBridge</span>
      </div>

      {/* Card */}
      <div className="auth-card-wrap">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1 className="auth-title">{title}</h1>
            {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>

      {/* Footer */}
      <p className="auth-footer">
        Procurement & Vendor Management ERP
      </p>
    </div>
  )
}