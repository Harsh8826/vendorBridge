import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { supabase } from '../lib/supabase'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const successMessage = location.state?.message

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })
    setLoading(false)
    if (authError) {
      setError(authError.message)
      return
    }
    navigate('/dashboard')
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your VendorBridge account"
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>

        {/* Avatar placeholder (matches mockup) */}
        <div className="avatar-placeholder">
          <span className="avatar-icon">👤</span>
        </div>

        {/* Email */}
        <div className="field-group">
          <label className="field-label" htmlFor="email">Email / Username</label>
          <div className="field-wrap">
            <span className="field-icon">✉</span>
            <input
              id="email"
              name="email"
              type="email"
              className="field-input"
              placeholder="you@company.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password */}
        <div className="field-group">
          <div className="field-label-row">
            <label className="field-label" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="field-link">Forgot password?</Link>
          </div>
          <div className="field-wrap">
            <span className="field-icon">🔒</span>
            <input
              id="password"
              name="password"
              type={showPass ? 'text' : 'password'}
              className="field-input"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="field-toggle"
              onClick={() => setShowPass(s => !s)}
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        {successMessage && (
          <p className="form-success" style={{ margin: 0 }}>{successMessage}</p>
        )}

        {/* Error */}
        {error && <p className="auth-error">{error}</p>}

        {/* Submit */}
        <button type="submit" className={`auth-btn${loading ? ' loading' : ''}`} disabled={loading}>
          {loading ? <span className="spinner" /> : 'Login'}
        </button>

        {/* Divider */}
        <div className="auth-divider"><span>or</span></div>

        {/* Switch to signup */}
        <p className="auth-switch">
          Don't have an account?{' '}
          <Link to="/signup" className="auth-switch-link">Create one</Link>
        </p>
      </form>
    </AuthLayout>
  )
}