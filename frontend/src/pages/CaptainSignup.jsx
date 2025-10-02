import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { CaptainDataContext } from '../context/CapatainContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const CaptainSignup = () => {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')

  const [vehicleColor, setVehicleColor] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [vehicleCapacity, setVehicleCapacity] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [city, setCity] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [step, setStep] = useState(1) // Multi-step form

  // Field errors
  const [fieldErrors, setFieldErrors] = useState({})

  // Popular cities (same as in Home.jsx)
  const cities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
    'Pune', 'Ahmedabad', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur'
  ]

  const { captain, setCaptain } = React.useContext(CaptainDataContext)

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
    
    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers,
      checks: {
        minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers
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

  const validateVehiclePlate = (plate) => {
    return plate.length >= 5 && /^[A-Z0-9\s\-]+$/i.test(plate)
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

      case 'vehiclePlate':
        setVehiclePlate(value.toUpperCase())
        if (value && !validateVehiclePlate(value)) {
          newFieldErrors.vehiclePlate = 'Please enter a valid vehicle plate number'
        } else {
          delete newFieldErrors.vehiclePlate
        }
        break

      case 'vehicleColor':
        setVehicleColor(value)
        if (value && value.length < 2) {
          newFieldErrors.vehicleColor = 'Vehicle color must be at least 2 characters'
        } else {
          delete newFieldErrors.vehicleColor
        }
        break

      case 'vehicleCapacity':
        setVehicleCapacity(value)
        const capacity = parseInt(value)
        if (value && (isNaN(capacity) || capacity < 1 || capacity > 8)) {
          newFieldErrors.vehicleCapacity = 'Vehicle capacity must be between 1 and 8'
        } else {
          delete newFieldErrors.vehicleCapacity
        }
        break

      case 'vehicleType':
        setVehicleType(value)
        break

      case 'city':
        setCity(value)
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

      if (!email) errors.email = 'Email is required'
      else if (!validateEmail(email)) errors.email = 'Invalid email address'
    }

    if (stepNum >= 2) {
      if (!password) errors.password = 'Password is required'
      else if (!validatePassword(password).isValid) errors.password = 'Password does not meet requirements'

      if (!confirmPassword) errors.confirmPassword = 'Please confirm your password'
      else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match'

      if (!city) errors.city = 'Please select your city'
    }

    if (stepNum >= 3) {
      if (!vehicleType) errors.vehicleType = 'Please select vehicle type'

      if (!vehicleColor) errors.vehicleColor = 'Vehicle color is required'
      else if (vehicleColor.length < 2) errors.vehicleColor = 'Invalid vehicle color'

      if (!vehiclePlate) errors.vehiclePlate = 'Vehicle plate is required'
      else if (!validateVehiclePlate(vehiclePlate)) errors.vehiclePlate = 'Invalid vehicle plate'

      if (!vehicleCapacity) errors.vehicleCapacity = 'Vehicle capacity is required'
      else if (parseInt(vehicleCapacity) < 1 || parseInt(vehicleCapacity) > 8) {
        errors.vehicleCapacity = 'Invalid capacity'
      }

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
    
    if (!validateStep(3)) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const captainData = {
        fullname: {
          firstname: firstName.trim(),
          lastname: lastName.trim()
        },
        email: email.trim().toLowerCase(),
        password: password,
        phone: phone.replace(/\s/g, ''),
        city: city,
        vehicle: {
          color: vehicleColor.trim(),
          plate: vehiclePlate.trim().toUpperCase(),
          capacity: parseInt(vehicleCapacity),
          vehicleType: vehicleType
        }
      }

      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/register`, captainData, {
        timeout: 15000
      })

      if (response.status === 201) {
        const data = response.data
        setCaptain(data.captain)
        localStorage.setItem('token', data.token)
        navigate('/captain-home')
      }

    } catch (error) {
      console.error('Captain signup error:', error)
      
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
            setError('A captain account with this email already exists. Please try logging in or use a different email.')
            break
          case 429:
            setError('Too many signup attempts. Please try again later.')
            break
          case 500:
            setError('Server error. Please try again later.')
            break
          default:
            setError(error.response.data?.message || 'Captain registration failed. Please try again.')
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
    <div className='py-5 px-5 h-screen flex flex-col justify-between overflow-y-auto'>
      <div>
        <div className="flex items-center mb-6">
          <div className='w-20 h-20 mr-3 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg'>
            QR
          </div>
          <div>
            <h1 className="text-2xl font-bold">Become a Captain</h1>
            <p className="text-gray-600 text-sm">Start earning with us today!</p>
          </div>
        </div>

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
            <div className={`flex-1 h-1 mx-2 ${step >= 3 ? 'bg-black' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= 3 ? 'bg-black text-white' : 'bg-gray-200'
            }`}>
              3
            </div>
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-gray-600">Personal</span>
            <span className="text-xs text-gray-600">Account</span>
            <span className="text-xs text-gray-600">Vehicle</span>
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
              <h2 className='text-2xl font-bold mb-6'>Personal Information</h2>
              
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

              {/* Contact Information */}
              <div>
                <h3 className='text-lg font-medium mb-3'>Contact Information</h3>
                <div className="space-y-4">
                  <div>
                    <input
                      className={`bg-[#eeeeee] w-full rounded-lg px-4 py-3 border text-lg placeholder:text-base transition-colors ${
                        fieldErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'
                      }`}
                      type="email"
                      placeholder='captain@example.com'
                      value={email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                    />
                    {fieldErrors.email && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
                    )}
                  </div>
                  
                  <div>
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
                </div>
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

          {/* Step 2: Account & Location */}
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
                <h2 className='text-2xl font-bold'>Account & Location</h2>
              </div>

              {/* Password Fields */}
              <div>
                <h3 className='text-lg font-medium mb-3'>Create a password</h3>
                <div className="relative mb-4">
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
                  <div className="mb-4">
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
                {fieldErrors.password && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
                )}
                {fieldErrors.confirmPassword && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.confirmPassword}</p>
                )}
              </div>

              {/* City Selection */}
              <div>
                <h3 className='text-lg font-medium mb-3'>Select your city</h3>
                <select
                  className={`bg-[#eeeeee] w-full rounded-lg px-4 py-3 border text-lg transition-colors ${
                    fieldErrors.city ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'
                  }`}
                  value={city}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                >
                  <option value="" disabled>Choose your operating city</option>
                  {cities.map((cityName) => (
                    <option key={cityName} value={cityName}>{cityName}</option>
                  ))}
                </select>
                {fieldErrors.city && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.city}</p>
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

          {/* Step 3: Vehicle Information */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="flex items-center mb-6">
                <button
                  type="button"
                  onClick={prevStep}
                  className="mr-3 text-gray-600 hover:text-black"
                >
                  ← Back
                </button>
                <h2 className='text-2xl font-bold'>Vehicle Information</h2>
              </div>

              {/* Vehicle Type */}
              <div>
                <h3 className='text-lg font-medium mb-3'>Vehicle Type</h3>
                <select
                  className={`bg-[#eeeeee] w-full rounded-lg px-4 py-3 border text-lg transition-colors ${
                    fieldErrors.vehicleType ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'
                  }`}
                  value={vehicleType}
                  onChange={(e) => handleFieldChange('vehicleType', e.target.value)}
                >
                  <option value="" disabled>Select your vehicle type</option>
                  <option value="car">🚗 Car</option>
                  <option value="auto">🛺 Auto Rickshaw</option>
                  <option value="moto">🏍️ Motorcycle</option>
                </select>
                {fieldErrors.vehicleType && (
                  <p className="text-red-500 text-sm mt-1">{fieldErrors.vehicleType}</p>
                )}
              </div>

              {/* Vehicle Details */}
              <div>
                <h3 className='text-lg font-medium mb-3'>Vehicle Details</h3>
                <div className='flex gap-4 mb-4'>
                  <div className="flex-1">
                    <input
                      className={`bg-[#eeeeee] w-full rounded-lg px-4 py-3 border text-lg placeholder:text-base transition-colors ${
                        fieldErrors.vehicleColor ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'
                      }`}
                      type="text"
                      placeholder='Vehicle Color'
                      value={vehicleColor}
                      onChange={(e) => handleFieldChange('vehicleColor', e.target.value)}
                    />
                    {fieldErrors.vehicleColor && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.vehicleColor}</p>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <input
                      className={`bg-[#eeeeee] w-full rounded-lg px-4 py-3 border text-lg placeholder:text-base transition-colors ${
                        fieldErrors.vehiclePlate ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'
                      }`}
                      type="text"
                      placeholder='Plate Number'
                      value={vehiclePlate}
                      onChange={(e) => handleFieldChange('vehiclePlate', e.target.value)}
                    />
                    {fieldErrors.vehiclePlate && (
                      <p className="text-red-500 text-sm mt-1">{fieldErrors.vehiclePlate}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <input
                    className={`bg-[#eeeeee] w-full rounded-lg px-4 py-3 border text-lg placeholder:text-base transition-colors ${
                      fieldErrors.vehicleCapacity ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-black'
                    }`}
                    type="number"
                    placeholder='Passenger Capacity (1-8)'
                    value={vehicleCapacity}
                    min="1"
                    max="8"
                    onChange={(e) => handleFieldChange('vehicleCapacity', e.target.value)}
                  />
                  {fieldErrors.vehicleCapacity && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.vehicleCapacity}</p>
                  )}
                </div>
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
                  I agree to the <span className="text-blue-600 underline cursor-pointer">Captain Terms of Service</span>,{' '}
                  <span className="text-blue-600 underline cursor-pointer">Privacy Policy</span>, and understand the{' '}
                  <span className="text-blue-600 underline cursor-pointer">Commission Structure</span>
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
                  'Create Captain Account'
                )}
              </button>
            </div>
          )}

        </form>

        <p className='text-center mt-6'>
          Already have an account?{' '}
          <Link to='/captain-login' className='text-blue-600 hover:underline'>
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

export default CaptainSignup