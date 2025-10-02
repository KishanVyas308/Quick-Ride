import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { CaptainDataContext } from '../context/CapatainContext'

const Captainlogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)

  // Field errors
  const [fieldErrors, setFieldErrors] = useState({})

  const { captain, setCaptain } = React.useContext(CaptainDataContext)
  const navigate = useNavigate()

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password) => {
    return password.length >= 6
  }

  // Real-time field validation
  const handleFieldChange = (field, value) => {
    const newFieldErrors = { ...fieldErrors }

    switch (field) {
      case 'email':
        setEmail(value)
        if (value && !validateEmail(value)) {
          newFieldErrors.email = 'Please enter a valid email address'
        } else {
          delete newFieldErrors.email
        }
        break

      case 'password':
        setPassword(value)
        if (value && !validatePassword(value)) {
          newFieldErrors.password = 'Password must be at least 6 characters'
        } else {
          delete newFieldErrors.password
        }
        break
    }

    setFieldErrors(newFieldErrors)
    setError('')
  }

  const validateForm = () => {
    const errors = {}

    if (!email) {
      errors.email = 'Email is required'
    } else if (!validateEmail(email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (!password) {
      errors.password = 'Password is required'
    } else if (!validatePassword(password)) {
      errors.password = 'Password must be at least 6 characters'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const submitHandler = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const captainData = {
        email: email.trim().toLowerCase(),
        password: password
      }

      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/login`, captainData, {
        timeout: 15000
      })

      if (response.status === 200) {
        const data = response.data
        setCaptain(data.captain)
        
        // Handle remember me functionality
        if (rememberMe) {
          localStorage.setItem('captainEmail', email)
          localStorage.setItem('rememberCaptain', 'true')
        } else {
          localStorage.removeItem('captainEmail')
          localStorage.removeItem('rememberCaptain')
        }
        
        localStorage.setItem('token', data.token)
        navigate('/captain-home')
      }

    } catch (error) {
      console.error('Captain login error:', error)
      
      if (error.code === 'ECONNABORTED') {
        setError('Connection timeout. Please check your internet connection and try again.')
      } else if (error.response) {
        switch (error.response.status) {
          case 400:
            const validationErrors = error.response.data?.errors
            if (validationErrors && Array.isArray(validationErrors)) {
              setError(validationErrors.map(err => err.msg).join(', '))
            } else {
              setError('Invalid email or password format.')
            }
            break
          case 401:
            setError('Invalid email or password. Please check your credentials.')
            break
          case 403:
            setError('Your account has been suspended. Please contact support.')
            break
          case 404:
            setError('Captain account not found. Please check your email or register as a captain.')
            break
          case 429:
            setError('Too many login attempts. Please try again later.')
            break
          case 500:
            setError('Server error. Please try again later.')
            break
          default:
            setError(error.response.data?.message || 'Login failed. Please try again.')
        }
      } else if (error.request) {
        setError('Network error. Please check your internet connection.')
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Load remembered email on component mount
  React.useEffect(() => {
    const rememberedEmail = localStorage.getItem('captainEmail')
    const shouldRemember = localStorage.getItem('rememberCaptain') === 'true'
    
    if (shouldRemember && rememberedEmail) {
      setEmail(rememberedEmail)
      setRememberMe(true)
    }
  }, [])
  return (
    <div className='p-7 h-screen flex flex-col justify-between'>
      <div>
        <div className="flex items-center mb-6">
          <div className='w-20 h-20 mr-3 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg'>
            QR
          </div>
          <div>
            <h1 className="text-2xl font-bold">Captain Login</h1>
            <p className="text-gray-600 text-sm">Welcome back, Captain!</p>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            <div className="flex">
              <svg className="w-5 h-5 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={submitHandler}>
          {/* Email Field */}
          <div className="mb-6">
            <h3 className='text-lg font-medium mb-3'>Captain Email</h3>
            <input
              value={email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              className={`bg-[#eeeeee] w-full rounded-lg px-4 py-3 border text-lg placeholder:text-base transition-colors ${
                fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'
              }`}
              type="email"
              placeholder='captain@example.com'
              autoComplete="email"
            />
            {fieldErrors.email && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="mb-6">
            <h3 className='text-lg font-medium mb-3'>Password</h3>
            <div className="relative">
              <input
                className={`bg-[#eeeeee] w-full rounded-lg px-4 py-3 pr-12 border text-lg placeholder:text-base transition-colors ${
                  fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'
                }`}
                value={password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                type={showPassword ? "text" : "password"}
                placeholder='Enter your password'
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black transition-colors"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Remember me</span>
            </label>
            <Link to="/captain-forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-lg px-4 py-3 text-lg font-semibold transition-all ${
              loading 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                : 'bg-[#111] text-white hover:bg-gray-800'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing In...
              </div>
            ) : (
              'Login as Captain'
            )}
          </button>

        </form>

        <p className='text-center mt-6'>
          New to driving?{' '}
          <Link to='/captain-signup' className='text-blue-600 hover:underline'>
            Register as a Captain
          </Link>
        </p>
      </div>
      
      <div>
        <Link
          to='/login'
          className='bg-[#d5622d] flex items-center justify-center text-white font-semibold mb-5 rounded-lg px-4 py-3 w-full text-lg hover:bg-orange-600 transition-colors'
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
          Sign in as User
        </Link>
      </div>
    </div>
  )
}

export default Captainlogin