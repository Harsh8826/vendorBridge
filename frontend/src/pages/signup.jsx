import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import { supabase } from '../lib/supabase'
import './Auth.css'

const ROLES = [
  { value: '', label: 'Select role...' },
  { value: 'admin', label: 'Admin' },
  { value: 'procurement_officer', label: 'Procurement Officer' },
  { value: 'manager', label: 'Manager / Approver' },
  { value: 'vendor', label: 'Vendor' },
]

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    firstName: '', lastName: '',
    email: '', phone: '',
    role: '', country: '',
    password: '', confirmPassword: '',
    additionalInfo: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setErrors(er => ({ ...er, [e.target.name]: '' }))
  }

  function validate() {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim())  e.lastName  = 'Required'
    if (!form.email.trim())     e.email     = 'Required'
    if (!form.phone.trim())     e.phone     = 'Required'
    if (!form.role)             e.role      = 'Select a role'
    if (!form.country.trim())   e.country   = 'Required'
    if (!form.password)         e.password  = 'Required'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    const fullName = `${form.firstName.trim()} ${form.lastName.trim()}`

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: fullName,
          role: form.role,
        },
      },
    })

    if (authError) {
      setLoading(false)
      setErrors({ email: authError.message })
      return
    }

    if (data.user) {
      await supabase.from('profiles').update({
        phone: form.phone,
        full_name: fullName,
      }).eq('id', data.user.id)

      if (form.role === 'vendor') {
        await supabase.from('vendors').insert({
          company_name: form.additionalInfo || fullName,
          contact_person: fullName,
          email: form.email,
          phone: form.phone,
          country: form.country,
          user_id: data.user.id,
          status: 'pending',
        })
      }
    }

    setLoading(false)
    navigate('/login', { state: { message: 'Account created! Please sign in.' } })
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Register to join VendorBridge"
    >
      <form className="auth-form" onSubmit={handleSubmit} noValidate>

        {/* Photo placeholder (matches mockup) */}
        <div className="avatar-placeholder large">
          <span className="avatar-icon">📷</span>
          <span className="avatar-label">Photo</span>
        </div>

        {/* Row 1: First + Last name */}
        <div className="field-row">
          <div className="field-group">
            <label className="field-label" htmlFor="firstName">First Name</label>
            <input
              id="firstName" name="firstName" type="text"
              className={`field-input bare${errors.firstName ? ' err' : ''}`}
              placeholder="John"
              value={form.firstName} onChange={handleChange}
            />
            {errors.firstName && <span className="field-error">{errors.firstName}</span>}
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="lastName">Last Name</label>
            <input
              id="lastName" name="lastName" type="text"
              className={`field-input bare${errors.lastName ? ' err' : ''}`}
              placeholder="Doe"
              value={form.lastName} onChange={handleChange}
            />
            {errors.lastName && <span className="field-error">{errors.lastName}</span>}
          </div>
        </div>

        {/* Row 2: Email + Phone */}
        <div className="field-row">
          <div className="field-group">
            <label className="field-label" htmlFor="email">Email ID</label>
            <input
              id="email" name="email" type="email"
              className={`field-input bare${errors.email ? ' err' : ''}`}
              placeholder="you@company.com"
              value={form.email} onChange={handleChange}
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="phone">Phone Number</label>
            <input
              id="phone" name="phone" type="tel"
              className={`field-input bare${errors.phone ? ' err' : ''}`}
              placeholder="+91 98765 43210"
              value={form.phone} onChange={handleChange}
            />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </div>
        </div>

        {/* Row 3: Role + Country */}
        <div className="field-row">
          <div className="field-group">
            <label className="field-label" htmlFor="role">Role</label>
            <select
              id="role" name="role"
              className={`field-input bare select${errors.role ? ' err' : ''}`}
              value={form.role} onChange={handleChange}
            >
              {ROLES.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            {errors.role && <span className="field-error">{errors.role}</span>}
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="country">Country</label>
            <input
              id="country" name="country" type="text"
              className={`field-input bare${errors.country ? ' err' : ''}`}
              placeholder="India"
              value={form.country} onChange={handleChange}
            />
            {errors.country && <span className="field-error">{errors.country}</span>}
          </div>
        </div>

        {/* Row 4: Password + Confirm */}
        <div className="field-row">
          <div className="field-group">
            <label className="field-label" htmlFor="password">Password</label>
            <div className="field-wrap">
              <input
                id="password" name="password"
                type={showPass ? 'text' : 'password'}
                className={`field-input${errors.password ? ' err' : ''}`}
                placeholder="Min. 8 characters"
                value={form.password} onChange={handleChange}
              />
              <button type="button" className="field-toggle"
                onClick={() => setShowPass(s => !s)}
                aria-label="Toggle password"
              >{showPass ? '🙈' : '👁'}</button>
            </div>
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>
          <div className="field-group">
            <label className="field-label" htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword" name="confirmPassword"
              type={showPass ? 'text' : 'password'}
              className={`field-input bare${errors.confirmPassword ? ' err' : ''}`}
              placeholder="Repeat password"
              value={form.confirmPassword} onChange={handleChange}
            />
            {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
          </div>
        </div>

        {/* Additional info textarea */}
        <div className="field-group">
          <label className="field-label" htmlFor="additionalInfo">Additional Info <span className="field-optional">(optional)</span></label>
          <textarea
            id="additionalInfo" name="additionalInfo"
            className="field-input bare textarea"
            placeholder="Company name, department, or any other relevant details..."
            value={form.additionalInfo} onChange={handleChange}
            rows={3}
          />
        </div>

        {/* Submit */}
        <button type="submit" className={`auth-btn${loading ? ' loading' : ''}`} disabled={loading}>
          {loading ? <span className="spinner" /> : 'Register'}
        </button>

        {/* Switch to login */}
        <p className="auth-switch">
          Already have an account?{' '}
          <Link to="/login" className="auth-switch-link">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  )
}