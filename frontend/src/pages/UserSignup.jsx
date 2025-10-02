import React, { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { UserDataContext } from '../context/UserContext'

const UserSignup = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [step, setStep] = useState(1) // Multi-step form

  // Field errors
  const [fieldErrors, setFieldErrors] = useState({})

  const navigate = useNavigate()
  const { user, setUser } = useContext(UserDataContext)

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password) => {
    const minLength = password.length >= 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasNonalphas = /\W/.test(password)
    
    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers,
      checks: {
        minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasNonalphas
      }
    }
  }

  const validatePhone = (phone) => {
    const phoneRegex = /^[+]?[\d\s\-\(\)]{10,15}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  const validateName = (name) => {
    return name.length >= 2 && /^[a-zA-Z\s]+$/.test(name)
  }

  // Real-time field validation
  const handleFieldChange = (field, value) => {
    const newFieldErrors = { ...fieldErrors }

    switch (field) {
      case 'firstName':
        setFirstName(value)
        if (value && !validateName(value)) {
          newFieldErrors.firstName = 'First name must be at least 2 characters and contain only letters'
        } else {
          delete newFieldErrors.firstName
        }
        break

      case 'lastName':
        setLastName(value)
        if (value && !validateName(value)) {
          newFieldErrors.lastName = 'Last name must be at least 2 characters and contain only letters'
        } else {
          delete newFieldErrors.lastName
        }
        break

      case 'email':
        setEmail(value)
        if (value && !validateEmail(value)) {
          newFieldErrors.email = 'Please enter a valid email address'
        } else {
          delete newFieldErrors.email
        }
        break

      case 'phone':
        setPhone(value)
        if (value && !validatePhone(value)) {
          newFieldErrors.phone = 'Please enter a valid phone number'
        } else {
          delete newFieldErrors.phone
        }
        break

      case 'password':
        setPassword(value)
        const passwordValidation = validatePassword(value)
        if (value && !passwordValidation.isValid) {
          newFieldErrors.password = 'Password must meet security requirements'
        } else {
          delete newFieldErrors.password
        }
        
        // Check confirm password match if it exists
        if (confirmPassword && value !== confirmPassword) {
          newFieldErrors.confirmPassword = 'Passwords do not match'
        } else {
          delete newFieldErrors.confirmPassword
        }
        break

      case 'confirmPassword':
        setConfirmPassword(value)
        if (value && value !== password) {
          newFieldErrors.confirmPassword = 'Passwords do not match'
        } else {
          delete newFieldErrors.confirmPassword
        }
        break
    }

    setFieldErrors(newFieldErrors)
    setError('')
  }

  const validateStep = (stepNum) => {
    const errors = {}

    if (stepNum >= 1) {
      if (!firstName) errors.firstName = 'First name is required'
      else if (!validateName(firstName)) errors.firstName = 'Invalid first name'

      if (!lastName) errors.lastName = 'Last name is required'
      else if (!validateName(lastName)) errors.lastName = 'Invalid last name'

      if (!phone) errors.phone = 'Phone number is required'
      else if (!validatePhone(phone)) errors.phone = 'Invalid phone number'
    }

    if (stepNum >= 2) {
      if (!email) errors.email = 'Email is required'
      else if (!validateEmail(email)) errors.email = 'Invalid email address'

      if (!password) errors.password = 'Password is required'
      else if (!validatePassword(password).isValid) errors.password = 'Password does not meet requirements'

      if (!confirmPassword) errors.confirmPassword = 'Please confirm your password'
      else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match'

      if (!acceptTerms) errors.acceptTerms = 'You must accept the terms and conditions'
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  const submitHandler = async (e) => {
    e.preventDefault()
    
    if (!validateStep(2)) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const newUser = {
        fullname: {
          firstname: firstName.trim(),
          lastname: lastName.trim()
        },
        email: email.trim().toLowerCase(),
        password: password,
        phone: phone.replace(/\s/g, '')
      }

      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/users/register`, newUser, {
        timeout: 15000
      })

      if (response.status === 201) {
        const data = response.data
        setUser(data.user)
        localStorage.setItem('token', data.token)
        
        // Success message
        setError('')
        
        // Navigate to home
        navigate('/home')
      }

    } catch (error) {
      console.error('Signup error:', error)
      
      if (error.code === 'ECONNABORTED') {
        setError('Connection timeout. Please check your internet connection and try again.')
      } else if (error.response) {
        switch (error.response.status) {
          case 400:
            const validationErrors = error.response.data?.errors
            if (validationErrors && Array.isArray(validationErrors)) {
              setError(validationErrors.map(err => err.msg).join(', '))
            } else {
              setError('Invalid input data. Please check your information.')
            }
            break
          case 409:
            setError('An account with this email already exists. Please try logging in or use a different email.')
            break
          case 429:
            setError('Too many signup attempts. Please try again later.')
            break
          case 500:
            setError('Server error. Please try again later.')
            break
          default:
            setError(error.response.data?.message || 'Signup failed. Please try again.')
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
  return (
    <div className='p-7 h-screen flex flex-col justify-between overflow-y-auto'>
      <div>
        <img className='w-16 mb-6' src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYQy-OIkA6In0fTvVwZADPmFFibjmszu2A0g&s" alt="" />

        {/* Step Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 1 ? 'bg-black text-white' : 'bg-gray-200'
            }`}>
              1
            </div>
            <div className={`flex-1 h-1 mx-2 ${step >= 2 ? 'bg-black' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 2 ? 'bg-black text-white' : 'bg-gray-200'
            }`}>
              2
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-600">Personal Info</span>
            <span className="text-xs text-gray-600">Account Setup</span>
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

          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className='text-2xl font-bold mb-6'>Let's get you started</h2>
              
              {/* Name Fields */}
              <div>
                <h3 className='text-lg font-medium mb-3'>What's your name?</h3>
                <div className='flex gap-4 mb-4'>
                  <div className="flex-1">
                    <input
                      className={`bg-[#eeeeee] w-full rounded-lg px-4 py-3 border text-lg placeholder:text-base transition-colors ${
                        fieldErrors.firstName ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'
                      }`}
                      type="text"
                      placeholder='First name'
                      value={firstName}
                      onChange={(e) => handleFieldChange('firstName', e.target.value)}
                    />
                    {fieldErrors.firstName && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.firstName}</p>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      className={`bg-[#eeeeee] w-full rounded-lg px-4 py-3 border text-lg placeholder:text-base transition-colors ${
                        fieldErrors.lastName ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'
                      }`}
                      type="text"
                      placeholder='Last name'
                      value={lastName}
                      onChange={(e) => handleFieldChange('lastName', e.target.value)}
                    />
                    {fieldErrors.lastName && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.lastName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Phone Field */}
              <div>
                <h3 className='text-lg font-medium mb-3'>What's your phone number?</h3>
                <input
                  className={`bg-[#eeeeee] w-full rounded-lg px-4 py-3 border text-lg placeholder:text-base transition-colors ${
                    fieldErrors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'
                  }`}
                  type="tel"
                  placeholder='+1 (555) 123-4567'
                  value={phone}
                  onChange={(e) => handleFieldChange('phone', e.target.value)}
                />
                {fieldErrors.phone && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.phone}</p>
                )}
              </div>

              <button
                type="button"
                onClick={nextStep}
                className='bg-[#111] text-white font-semibold rounded-lg px-4 py-3 w-full text-lg hover:bg-gray-800 transition-colors'
              >
                Next Step →
              </button>
            </div>
          )}

          {/* Step 2: Account Setup */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center mb-6">
                <button
                  type="button"
                  onClick={prevStep}
                  className="mr-3 text-gray-600 hover:text-black"
                >
                  ← Back
                </button>
                <h2 className='text-2xl font-bold'>Create your account</h2>
              </div>

              {/* Email Field */}
              <div>
                <h3 className='text-lg font-medium mb-3'>What's your email?</h3>
                <input
                  value={email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className={`bg-[#eeeeee] w-full rounded-lg px-4 py-3 border text-lg placeholder:text-base transition-colors ${
                    fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'
                  }`}
                  type="email"
                  placeholder='email@example.com'
                />
                {fieldErrors.email && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <h3 className='text-lg font-medium mb-3'>Create a password</h3>
                <div className="relative">
                  <input
                    className={`bg-[#eeeeee] w-full rounded-lg px-4 py-3 pr-12 border text-lg placeholder:text-base transition-colors ${
                      fieldErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'
                    }`}
                    value={password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder='Create a strong password'
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                
                {/* Password Requirements */}
                {password && (
                  <div className="mt-2 space-y-1">
                    {(() => {
                      const validation = validatePassword(password)
                      return (
                        <div className="text-xs space-y-1">
                          <div className={validation.checks.minLength ? 'text-green-600' : 'text-red-500'}>
                            ✓ At least 8 characters
                          </div>
                          <div className={validation.checks.hasUpperCase ? 'text-green-600' : 'text-red-500'}>
                            ✓ One uppercase letter
                          </div>
                          <div className={validation.checks.hasLowerCase ? 'text-green-600' : 'text-red-500'}>
                            ✓ One lowercase letter
                          </div>
                          <div className={validation.checks.hasNumbers ? 'text-green-600' : 'text-red-500'}>
                            ✓ One number
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
                
                {fieldErrors.password && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
                )}
              </div>

              {/* Confirm Password Field */}
              <div>
                <h3 className='text-lg font-medium mb-3'>Confirm your password</h3>
                <div className="relative">
                  <input
                    className={`bg-[#eeeeee] w-full rounded-lg px-4 py-3 pr-12 border text-lg placeholder:text-base transition-colors ${
                      fieldErrors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'
                    }`}
                    value={confirmPassword}
                    onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder='Confirm your password'
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black"
                  >
                    {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="acceptTerms" className="text-sm text-gray-700">
                  I agree to the <span className="text-blue-600 underline cursor-pointer">Terms of Service</span> and{' '}
                  <span className="text-blue-600 underline cursor-pointer">Privacy Policy</span>
                </label>
              </div>
              {fieldErrors.acceptTerms && (
                <p className="text-red-500 text-sm">{fieldErrors.acceptTerms}</p>
              )}

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
                    Creating Account...
                  </div>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          )}

        </form>

        <p className='text-center mt-6'>
          Already have an account?{' '}
          <Link to='/login' className='text-blue-600 hover:underline'>
            Login here
          </Link>
        </p>
      </div>
      
      <div className="mt-8">
        <p className='text-[10px] leading-tight text-gray-500'>
          This site is protected by reCAPTCHA and the{' '}
          <span className='underline cursor-pointer'>Google Privacy Policy</span> and{' '}
          <span className='underline cursor-pointer'>Terms of Service</span> apply.
        </p>
      </div>
    </div>
  )
}

export default UserSignup