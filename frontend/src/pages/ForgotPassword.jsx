import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { supabase } from '../lib/supabase'
import './Auth.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter your email address.')
      return
    }
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })

    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }
    setSent(true)
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="We'll send you a link to reset your password"
    >
      {sent ? (
        <div className="auth-form">
          <p className="form-success" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            Check your inbox for a password reset link.
          </p>
          <Link to="/login" className="auth-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
            Back to login
          </Link>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field-group">
            <label className="field-label" htmlFor="email">Email address</label>
            <div className="field-wrap">
              <span className="field-icon">✉</span>
              <input
                id="email"
                name="email"
                type="email"
                className="field-input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                autoComplete="email"
              />
            </div>
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className={`auth-btn${loading ? ' loading' : ''}`} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Send reset link'}
          </button>

          <p className="auth-switch">
            Remember your password?{' '}
            <Link to="/login" className="auth-switch-link">Sign in</Link>
          </p>
        </form>
      )}
    </AuthLayout>
  )
}
