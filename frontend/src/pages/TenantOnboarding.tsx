import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, User, Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react'

interface OnboardingForm {
    tenantName: string
    adminName: string
    adminEmail: string
    adminPassword: string
    confirmPassword: string
}

const TenantOnboarding: React.FC = () => {
    const navigate = useNavigate()

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const [formData, setFormData] = useState<OnboardingForm>({
        tenantName: '',
        adminName: '',
        adminEmail: '',
        adminPassword: '',
        confirmPassword: ''
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
        setError('')
    }

    const validateStep = (currentStep: number): boolean => {
        switch (currentStep) {
            case 1:
                if (!formData.tenantName.trim()) {
                    setError('Nama perusahaan tidak boleh kosong')
                    return false
                }
                break
            case 2:
                if (!formData.adminName.trim()) {
                    setError('Nama admin tidak boleh kosong')
                    return false
                }
                if (!formData.adminEmail.trim() || !formData.adminEmail.includes('@')) {
                    setError('Email tidak valid')
                    return false
                }
                break
            case 3:
                if (formData.adminPassword.length < 8) {
                    setError('Password minimal 8 karakter')
                    return false
                }
                if (formData.adminPassword !== formData.confirmPassword) {
                    setError('Password tidak cocok')
                    return false
                }
                break
        }
        return true
    }

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(step + 1)
        }
    }

    const handlePrevious = () => {
        setStep(step - 1)
        setError('')
    }

    const handleSubmit = async () => {
        if (!validateStep(3)) return

        setLoading(true)
        setError('')

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/tenants/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tenantName: formData.tenantName,
                    adminName: formData.adminName,
                    adminEmail: formData.adminEmail,
                    adminPassword: formData.adminPassword
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Gagal membuat akun')
            }

            setSuccess(true)

            // Redirect to login after 2 seconds
            setTimeout(() => {
                navigate('/login', {
                    state: {
                        email: formData.adminEmail,
                        message: 'Akun berhasil dibuat! Silakan login.'
                    }
                })
            }, 2000)

        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-md w-full space-y-8 text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-xl">
                        <div className="flex justify-center mb-6">
                            <CheckCircle2 className="h-20 w-20 text-green-500" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">
                            Akun Berhasil Dibuat! 🎉
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Selamat! Akun Anda telah berhasil dibuat.
                        </p>
                        <div className="bg-blue-50 p-4 rounded-lg text-left">
                            <p className="text-sm text-gray-700 mb-2">
                                <strong>Perusahaan:</strong> {formData.tenantName}
                            </p>
                            <p className="text-sm text-gray-700 mb-2">
                                <strong>Email:</strong> {formData.adminEmail}
                            </p>
                            <p className="text-sm text-blue-600">
                                <strong>Plan:</strong> Free Trial (14 hari)
                            </p>
                        </div>
                        <p className="text-sm text-gray-500 mt-6">
                            Mengarahkan ke halaman login...
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="text-4xl font-bold text-gray-900 mb-2">
                        Daftar Sekarang
                    </h2>
                    <p className="text-gray-600">
                        Buat akun perusahaan Anda dan mulai kelola kehadiran karyawan
                    </p>
                </div>

                {/* Progress Steps */}
                <div className="flex justify-between items-center">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center flex-1">
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${step >= s
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'bg-white border-gray-300 text-gray-400'
                                    } font-semibold`}
                            >
                                {s}
                            </div>
                            {s < 3 && (
                                <div
                                    className={`flex-1 h-1 mx-2 ${step > s ? 'bg-blue-600' : 'bg-gray-300'
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Form Card */}
                <div className="bg-white p-8 rounded-2xl shadow-xl">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-start">
                            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Step 1: Company Info */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                                    <Building2 className="h-8 w-8 text-blue-600" />
                                </div>
                                <h3 className="text-2xl font-semibold text-gray-900">
                                    Informasi Perusahaan
                                </h3>
                                <p className="text-gray-600 mt-2">
                                    Mulai dengan nama perusahaan Anda
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nama Perusahaan <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="tenantName"
                                    value={formData.tenantName}
                                    onChange={handleChange}
                                    placeholder="PT. Contoh Perusahaan"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    autoFocus
                                />
                            </div>

                            <button
                                onClick={handleNext}
                                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                            >
                                Lanjutkan
                            </button>
                        </div>
                    )}

                    {/* Step 2: Admin Info */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                                    <User className="h-8 w-8 text-blue-600" />
                                </div>
                                <h3 className="text-2xl font-semibold text-gray-900">
                                    Data Admin
                                </h3>
                                <p className="text-gray-600 mt-2">
                                    Anda akan menjadi admin utama
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Nama Lengkap <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="adminName"
                                    value={formData.adminName}
                                    onChange={handleChange}
                                    placeholder="John Doe"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                                    <input
                                        type="email"
                                        name="adminEmail"
                                        value={formData.adminEmail}
                                        onChange={handleChange}
                                        placeholder="email@perusahaan.com"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handlePrevious}
                                    className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
                                >
                                    Kembali
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                                >
                                    Lanjutkan
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Password */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                                    <Lock className="h-8 w-8 text-blue-600" />
                                </div>
                                <h3 className="text-2xl font-semibold text-gray-900">
                                    Keamanan Akun
                                </h3>
                                <p className="text-gray-600 mt-2">
                                    Buat password yang kuat
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    name="adminPassword"
                                    value={formData.adminPassword}
                                    onChange={handleChange}
                                    placeholder="Minimal 8 karakter"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    autoFocus
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Gunakan kombinasi huruf, angka, dan simbol
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Konfirmasi Password <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Ketik ulang password"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-semibold text-gray-900 mb-2">
                                    Yang Anda dapatkan:
                                </h4>
                                <ul className="space-y-1 text-sm text-gray-700">
                                    <li className="flex items-center">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                        Free trial 14 hari
                                    </li>
                                    <li className="flex items-center">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                        Maksimal 5 karyawan
                                    </li>
                                    <li className="flex items-center">
                                        <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                                        Fitur dasar absensi
                                    </li>
                                </ul>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={handlePrevious}
                                    className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
                                >
                                    Kembali
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Membuat Akun...' : 'Selesai'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-center text-sm text-gray-600">
                    Sudah punya akun?{' '}
                    <a href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                        Login di sini
                    </a>
                </p>
            </div>
        </div>
    )
}

export default TenantOnboarding
