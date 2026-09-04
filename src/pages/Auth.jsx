import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useToast } from '../components/Toast'
import Loader from '../components/Loader'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { isConvexConfigured } from '../convexClient'

function isValidEmail(value) {
  const [localPart, domainPart, ...extraParts] = value.trim().split('@')
  return Boolean(localPart && domainPart?.includes('.') && !domainPart.startsWith('.') && !domainPart.endsWith('.') && !extraParts.length)
}

function validateAuthForm(form, isSignIn) {
  const nextErrors = {}

  if (!isValidEmail(form.email)) nextErrors.email = 'Enter a valid email address.'
  if (!form.password) nextErrors.password = 'Password is required.'
  if (!isSignIn && form.password.length < 8) nextErrors.password = 'Password must be at least 8 characters.'
  if (!isSignIn && !form.confirmPassword) nextErrors.confirmPassword = 'Please confirm your password.'
  if (!isSignIn && form.confirmPassword && form.password !== form.confirmPassword) {
    nextErrors.confirmPassword = 'Passwords do not match.'
  }

  return nextErrors
}

export default function Auth({ mode = 'signin' }) {
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', role: 'requester' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [profilePending, setProfilePending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const navigate = useNavigate()
  const { addToast } = useToast()

  const isSignIn = mode === 'signin'
  const { signIn, signOut } = useAuthActions()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const ensureUserProfile = useMutation(api.myFunctions.ensureUserProfile)
  const submitText = isSignIn ? 'Sign in' : 'Sign up'
  const authSwitchText = isSignIn ? 'Do not have an account?' : 'Already have an account?'
  const authSwitchLink = isSignIn ? '/signup' : '/signin'
  const authSwitchLinkText = isSignIn ? 'Create one' : 'Sign in'

  useEffect(() => {
    setErrors({})
    setShowPassword(false)
    setShowConfirmPassword(false)
  }, [mode])

  const validate = useMemo(() => {
    return validateAuthForm(form, isSignIn)
  }, [form, isSignIn])

  useEffect(() => {
    setErrors(validate)
  }, [validate])

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setLoading(true)

    if (!isConvexConfigured) {
      addToast('Configure VITE_CONVEX_URL before using account access.', 'error')
      setLoading(false)
      return
    }

    if (Object.keys(errors).length) {
      addToast('Please fix the form errors first.', 'error')
      setLoading(false)
      return
    }

    try {
      const authParams = {
        flow: isSignIn ? 'signIn' : 'signUp',
        email: form.email,
        password: form.password,
        ...(isSignIn ? {} : { role: form.role }),
      }
      await signOut().catch(() => {})
      const result = await signIn('password', authParams)
      if (result.redirect) {
        window.location.href = result.redirect.toString()
        return
      }
      setProfilePending(true)
      addToast(isSignIn ? 'Signed in successfully.' : 'Account created and signed in.', 'success')
    } catch (error) {
      console.error(error)
      const message = error.message || 'Could not complete local sign-in.'
      addToast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (authLoading || !isAuthenticated) return

    if (!profilePending) {
      navigate('/')
      return
    }

    let cancelled = false
    ensureUserProfile({ role: form.role })
      .catch((error) => {
        console.error(error)
        if (!cancelled) addToast(error.message || 'Could not finish account profile setup.', 'error')
        signOut().catch(() => {})
      })
      .finally(() => {
        if (!cancelled) {
          setProfilePending(false)
          navigate('/')
        }
      })

    return () => {
      cancelled = true
    }
  }, [addToast, authLoading, ensureUserProfile, form.role, isAuthenticated, navigate, profilePending])

  return (
    <div className="page-stack">
      <section className="section auth-section">
        <div className="auth-layout">
          <div className="auth-panel auth-panel-highlight">
            <p className="eyebrow">Account access</p>
            <h2>{isSignIn ? 'Return to your marketplace workspace.' : 'Create your DataHub account.'}</h2>
              <p>
                DataHub bridges the gap between dataset publishers and requesters with a secure, transparent, and professional marketplace. Sign in or create an account to publish datasets, request access, and manage your data marketplace activities.
              </p>
            <div className="metric-pill metric-pill-strong">
              <span>Access to</span>
              <strong>Datasets, uploads, requests, payouts</strong>
            </div>
            <p className="auth-demo-note">
             All accounts are secured and managed 24/7.
            </p>
          </div>

          <div className="auth-panel">
            <h3>{isSignIn ? 'Sign in' : 'Create account'}</h3>

            <form className="glass-form auth-form" onSubmit={handleSubmit} noValidate>
              <label className="field-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="input"
                name="email"
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={handleChange}
                aria-invalid={Boolean(errors.email)}
              />
              {errors.email ? <p className="field-error">{errors.email}</p> : null}

              <label className="field-label" htmlFor="password">
                Password
              </label>
              <div className="password-input-wrap">
                <input
                  id="password"
                  className="input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  aria-invalid={Boolean(errors.password)}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password ? <p className="field-error">{errors.password}</p> : null}

              {!isSignIn ? (
                <>
                  <label className="field-label" htmlFor="confirmPassword">
                    Confirm password
                  </label>
                  <div className="password-input-wrap">
                    <input
                      id="confirmPassword"
                      className="input"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      aria-invalid={Boolean(errors.confirmPassword)}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword((visible) => !visible)}
                      aria-label={showConfirmPassword ? 'Hide confirmed password' : 'Show confirmed password'}
                      aria-pressed={showConfirmPassword}
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {errors.confirmPassword ? <p className="field-error">{errors.confirmPassword}</p> : null}
                </>
              ) : null}

              {!isSignIn ? (
                <>
                  <label className="field-label" htmlFor="role">
                    Account role
                  </label>
                  <select id="role" className="input" name="role" value={form.role} onChange={handleChange}>
                    <option value="requester">Requester</option>
                    <option value="uploader">Uploader</option>
                    <option value="developer">Developer</option>
                    <option value="admin">Admin</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.role ? <p className="field-error">{errors.role}</p> : null}
                </>
              ) : null}

              <button className="button button-primary" type="submit" disabled={loading}>
                {loading ? (
                  <span className="button-loading">
                    <Loader size={14} />
                    Processing
                  </span>
                ) : (
                  submitText
                )}
              </button>
            </form>

            <p className="auth-switch">
              {authSwitchText} <Link to={authSwitchLink}>{authSwitchLinkText}</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
