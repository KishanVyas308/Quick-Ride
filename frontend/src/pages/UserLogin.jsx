import React, { useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import { UserDataContext } from '../context/UserContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const UserLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const { user, setUser } = useContext(UserDataContext)
  const navigate = useNavigate()

  // Email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Password validation
  const validatePassword = (password) => {
    return password.length >= 6
  }

  // Real-time validation
  const handleEmailChange = (e) => {
    const value = e.target.value
    setEmail(value)
    setError('')
    
    if (value && !validateEmail(value)) {
      setEmailError('Please enter a valid email address')
    } else {
      setEmailError('')
    }
  }

  const handlePasswordChange = (e) => {
    const value = e.target.value
    setPassword(value)
    setError('')
    
    if (value && !validatePassword(value)) {
      setPasswordError('Password must be at least 6 characters long')
    } else {
      setPasswordError('')
    }
  }

  const submitHandler = async (e) => {
    e.preventDefault()
    
    // Reset errors
    setError('')
    setEmailError('')
    setPasswordError('')

    // Validate inputs
    if (!email) {
      setEmailError('Email is required')
      return
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address')
      return
    }

    if (!password) {
      setPasswordError('Password is required')
      return
    }

    if (!validatePassword(password)) {
      setPasswordError('Password must be at least 6 characters long')
      return
    }

    setLoading(true)

    try {
      const userData = {
        email: email.trim().toLowerCase(),
        password: password
      }

      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/users/login`, userData, {
        timeout: 15000 // 15 seconds timeout
      })

      if (response.status === 200) {
        const data = response.data
        setUser(data.user)
        
        // Store token with expiration info
        localStorage.setItem('token', data.token)
        if (rememberMe) {
          localStorage.setItem('rememberUser', 'true')
          localStorage.setItem('userEmail', email)
        } else {
          localStorage.removeItem('rememberUser')
          localStorage.removeItem('userEmail')
        }

        // Success feedback
        setError('')
        
        // Navigate to home
        navigate('/home')
      }

    } catch (error) {
      console.error('Login error:', error)
      
      // Handle different types of errors
      if (error.code === 'ECONNABORTED') {
        setError('Connection timeout. Please check your internet connection and try again.')
      } else if (error.response) {
        switch (error.response.status) {
          case 400:
            setError('Invalid email or password format.')
            break
          case 401:
            setError('Invalid email or password. Please check your credentials and try again.')
            break
          case 404:
            setError('Account not found. Please check your email or sign up for a new account.')
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
    if (localStorage.getItem('rememberUser') === 'true') {
      const rememberedEmail = localStorage.getItem('userEmail')
      if (rememberedEmail) {
        setEmail(rememberedEmail)
        setRememberMe(true)
      }
    }
  }, [])

  return (
    <div className='p-7 h-screen flex flex-col justify-between bg-white'>
      <div>
        {/* Header */}
        <div className='flex items-center mb-10'>
          <img className='w-16 mr-3' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYQy-OIkA6In0fTvVwZADPmFFibjmszu2A0g&s" alt="Logo" />
          <div>
            <h1 className='text-2xl font-bold'>Welcome Back</h1>
            <p className='text-gray-600 text-sm'>Sign in to continue your journey</p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center'>
            <span className='mr-2'>⚠️</span>
            <span className='text-sm'>{error}</span>
          </div>
        )}

        <form onSubmit={submitHandler} className='space-y-6'>
          {/* Email Field */}
          <div>
            <label className='block text-lg font-medium mb-2 text-gray-700'>Email Address</label>
            <div className='relative'>
              <input
                value={email}
                onChange={handleEmailChange}
                className={`bg-gray-50 rounded-lg px-4 py-3 border w-full text-lg placeholder:text-base transition-all focus:outline-none focus:ring-2 ${
                  emailError 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500'
                }`}
                type="email"
                placeholder='Enter your email address'
                disabled={loading}
              />
              {email && (
                <span className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                  {validateEmail(email) ? '✅' : '❌'}
                </span>
              )}
            </div>
            {emailError && <p className='text-red-500 text-sm mt-1'>{emailError}</p>}
          </div>

          {/* Password Field */}
          <div>
            <label className='block text-lg font-medium mb-2 text-gray-700'>Password</label>
            <div className='relative'>
              <input
                className={`bg-gray-50 rounded-lg px-4 py-3 border w-full text-lg placeholder:text-base pr-12 transition-all focus:outline-none focus:ring-2 ${
                  passwordError 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-200 focus:ring-blue-500 focus:border-blue-500'
                }`}
                value={password}
                onChange={handlePasswordChange}
                type={showPassword ? "text" : "password"}
                placeholder='Enter your password'
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700'
                disabled={loading}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {passwordError && <p className='text-red-500 text-sm mt-1'>{passwordError}</p>}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className='flex items-center justify-between'>
            <label className='flex items-center'>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className='mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
                disabled={loading}
              />
              <span className='text-sm text-gray-600'>Remember me</span>
            </label>
            <Link to='/forgot-password' className='text-sm text-blue-600 hover:text-blue-800'>
              Forgot Password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || emailError || passwordError || !email || !password}
            className={`w-full py-3 rounded-lg font-semibold text-lg transition-all ${
              loading || emailError || passwordError || !email || !password
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800 active:bg-gray-900'
            }`}
          >
            {loading ? (
              <div className='flex items-center justify-center'>
                <div className='animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2'></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Sign Up Link */}
        <div className='text-center mt-6'>
          <p className='text-gray-600'>New to our platform? 
            <Link to='/signup' className='text-blue-600 hover:text-blue-800 font-medium ml-1'>
              Create new Account
            </Link>
          </p>
        </div>
      </div>

      {/* Captain Login */}
      <div className='space-y-4'>
        <div className='text-center'>
          <span className='text-gray-500 text-sm'>Or</span>
        </div>
        <Link
          to='/captain-login'
          className='bg-green-600 flex items-center justify-center text-white font-semibold rounded-lg px-4 py-3 w-full text-lg hover:bg-green-700 transition-colors'
        >
          <span className='mr-2'>🚗</span>
          Sign in as Captain
        </Link>
      </div>
    </div>
  )
}

export default UserLogin