import React, { useState, useEffect } from 'react'
import { Check, Zap, Crown, Building2, Loader2 } from 'lucide-react'

interface SubscriptionPlan {
    id: string
    name: string
    slug: string
    price: number
    interval: 'monthly' | 'yearly' | 'lifetime'
    features: {
        maxUsers: number
        features: string[]
    }
    recommended?: boolean
}

interface CurrentSubscription {
    id: string
    plan_name: string
    plan_slug: string
    status: string
    current_period_end: string
    cancel_at_period_end: number // 0 or 1
}

const SubscriptionPage: React.FC = () => {
    const [plans, setPlans] = useState<SubscriptionPlan[]>([])
    const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null)
    const [loading, setLoading] = useState(true)
    const [upgrading, setUpgrading] = useState<string | null>(null)
    const [cancelling, setCancelling] = useState(false)

    useEffect(() => {
        fetchPlans()
        fetchCurrentSubscription()
    }, [])

    const fetchPlans = async () => {
        try {
            const token = localStorage.getItem('access_token')
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/subscriptions/plans`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            const data = await response.json()
            setPlans(data.plans || [])
        } catch (error) {
            console.error('Failed to fetch plans', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchCurrentSubscription = async () => {
        try {
            const token = localStorage.getItem('access_token')
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/subscriptions/current`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            if (response.ok) {
                const data = await response.json()
                setCurrentSubscription(data.subscription)
            }
        } catch (error) {
            console.error('Failed to fetch current subscription', error)
        }
    }

    const handleCancelSubscription = async () => {
        if (!confirm('Apakah Anda yakin ingin membatalkan langganan? Anda akan kehilangan akses ke fitur premium setelah periode saat ini berakhir.')) {
            return
        }

        setCancelling(true)
        try {
            const token = localStorage.getItem('access_token')
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/subscriptions/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            const data = await response.json()

            if (response.ok) {
                alert('Langganan berhasil dibatalkan. Akses Anda tetap aktif hingga akhir periode penagihan.')
                fetchCurrentSubscription()
            } else {
                throw new Error(data.error || 'Gagal membatalkan langganan')
            }
        } catch (error: any) {
            alert(error.message || 'Terjadi kesalahan saat membatalkan langganan')
        } finally {
            setCancelling(false)
        }
    }



    const handleUpgrade = async (planSlug: string) => {
        // Warning for downgrade
        if (currentSubscription && plans.find(p => p.slug === currentSubscription.plan_slug)?.price! > plans.find(p => p.slug === planSlug)?.price!) {
            if (!confirm('Perhatian: Anda akan beralih ke paket yang lebih murah. Beberapa fitur mungkin akan dinonaktifkan pada siklus penagihan berikutnya. Lanjutkan?')) {
                return;
            }
        }



        setUpgrading(planSlug)

        try {
            const token = localStorage.getItem('access_token')
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/subscriptions/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ planSlug })
            })

            const data = await response.json()

            if (response.ok && data.token) {
                // Open Midtrans Snap
                // @ts-ignore
                window.snap.pay(data.token, {
                    onSuccess: function (_result: any) {
                        alert('Pembayaran berhasil!')
                        fetchCurrentSubscription()
                    },
                    onPending: function (_result: any) {
                        alert('Menunggu pembayaran...')
                    },
                    onError: function (_result: any) {
                        alert('Pembayaran gagal')
                    },
                    onClose: function () {
                        console.log('Payment popup closed')
                    }
                })
            } else {
                throw new Error(data.error || 'Failed to create checkout')
            }
        } catch (error: any) {
            alert(error.message || 'Terjadi kesalahan')
        } finally {
            setUpgrading(null)
        }
    }

    const getPlanIcon = (slug: string) => {
        switch (slug) {
            case 'free':
                return <Zap className="h-8 w-8" />
            case 'basic':
                return <Building2 className="h-8 w-8" />
            case 'premium':
                return <Crown className="h-8 w-8" />
            case 'enterprise':
                return <Building2 className="h-8 w-8" />
            default:
                return <Zap className="h-8 w-8" />
        }
    }

    const getPlanColor = (slug: string) => {
        switch (slug) {
            case 'free':
                return 'from-gray-50 to-gray-100 border-gray-300'
            case 'basic':
                return 'from-blue-50 to-blue-100 border-blue-300'
            case 'premium':
                return 'from-purple-50 to-purple-100 border-purple-300'
            case 'enterprise':
                return 'from-indigo-50 to-indigo-100 border-indigo-300'
            default:
                return 'from-gray-50 to-gray-100 border-gray-300'
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Pilih Plan yang Tepat
                </h1>
                <p className="text-xl text-gray-600">
                    Upgrade kapan saja sesuai kebutuhan bisnis Anda
                </p>

                {currentSubscription && (
                    <div className="mt-6 inline-block bg-blue-100 text-blue-800 px-6 py-3 rounded-full">
                        <p className="font-semibold">
                            Plan Saat Ini: {currentSubscription.plan_name}
                        </p>
                    </div>
                )}

                {currentSubscription?.cancel_at_period_end === 1 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-2xl mx-auto">
                        <div className="flex items-center justify-center gap-2 text-yellow-800">
                            <Loader2 className="h-5 w-5" />
                            <p className="font-medium">
                                Langganan Anda akan berakhir pada {new Date(currentSubscription.current_period_end).toLocaleDateString()}.
                            </p>
                        </div>
                    </div>
                )}

                {currentSubscription?.cancel_at_period_end === 1 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-2xl mx-auto">
                        <div className="flex items-center justify-center gap-2 text-yellow-800">
                            <Loader2 className="h-5 w-5" />
                            <p className="font-medium">
                                Langganan Anda akan berakhir pada {new Date(currentSubscription.current_period_end).toLocaleDateString()}.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                {plans.map((plan) => (
                    <div
                        key={plan.id}
                        className={`relative bg-gradient-to-br ${getPlanColor(plan.slug)} border-2 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow ${plan.recommended ? 'ring-4 ring-purple-400 ring-opacity-50' : ''
                            }`}
                    >
                        {plan.recommended && (
                            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                <span className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                                    RECOMMENDED
                                </span>
                            </div>
                        )}

                        <div className="text-center mb-6">
                            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${plan.slug === 'premium' ? 'bg-purple-200 text-purple-600' :
                                plan.slug === 'basic' ? 'bg-blue-200 text-blue-600' :
                                    plan.slug === 'enterprise' ? 'bg-indigo-200 text-indigo-600' :
                                        'bg-gray-200 text-gray-600'
                                }`}>
                                {getPlanIcon(plan.slug)}
                            </div>

                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                {plan.name}
                            </h3>

                            <div className="mb-4">
                                <span className="text-4xl font-bold text-gray-900">
                                    {plan.price === 0 ? 'Gratis' : `Rp ${plan.price.toLocaleString()}`}
                                </span>
                                {plan.price > 0 && (
                                    <span className="text-gray-600">
                                        /{plan.interval === 'monthly' ? 'bulan' : plan.interval === 'yearly' ? 'tahun' : 'selamanya'}
                                    </span>
                                )}
                            </div>

                            <p className="text-gray-600 text-sm">
                                {plan.features.maxUsers === -1
                                    ? 'Unlimited users'
                                    : `Maksimal ${plan.features.maxUsers} users`}
                            </p>
                        </div>

                        <div className="space-y-3 mb-8">
                            {plan.features.features.slice(0, 5).map((feature, idx) => (
                                <div key={idx} className="flex items-start">
                                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                                    <span className="text-gray-700 text-sm">{feature}</span>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => handleUpgrade(plan.slug)}
                            disabled={
                                upgrading === plan.slug ||
                                (currentSubscription?.plan_slug === plan.slug)
                            }
                            className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${currentSubscription?.plan_slug === plan.slug
                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                : plan.slug === 'premium'
                                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                    : plan.slug === 'enterprise'
                                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                } disabled:opacity-50`}
                        >
                            {upgrading === plan.slug ? (
                                <div className="flex items-center justify-center">
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Loading...
                                </div>
                            ) : currentSubscription?.plan_slug === plan.slug ? (
                                'Plan Aktif'
                            ) : plan.price === 0 ? (
                                'Mulai Gratis'
                            ) : (
                                'Upgrade Sekarang'
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* FAQ or Additional Info */}
            <div className="mt-16 bg-gray-50 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                    Pertanyaan Umum
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                            Apakah saya bisa upgrade kapan saja?
                        </h3>
                        <p className="text-gray-600 text-sm">
                            Ya, Anda dapat upgrade atau downgrade plan kapan saja sesuai kebutuhan.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                            Bagaimana dengan data saya?
                        </h3>
                        <p className="text-gray-600 text-sm">
                            Semua data Anda tetap aman dan tersimpan meskipun berganti plan.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                            Metode pembayaran apa yang diterima?
                        </h3>
                        <p className="text-gray-600 text-sm">
                            Kami menerima pembayaran via transfer bank, e-wallet, dan kartu kredit melalui Midtrans.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                            Ada diskon untuk pembayaran tahunan?
                        </h3>
                        <p className="text-gray-600 text-sm">
                            Ya, dapatkan diskon hingga 20% dengan berlangganan paket tahunan.
                        </p>
                    </div>
                </div>
            </div>

            {/* Cancel Subscription Section */}
            {currentSubscription && currentSubscription.plan_slug !== 'free' && !currentSubscription.cancel_at_period_end && (
                <div className="mt-12 text-center border-t border-gray-200 pt-12">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Kelola Langganan</h3>
                    <p className="text-gray-600 mb-6">
                        Jika Anda ingin berhenti berlangganan, Anda dapat membatalkannya kapan saja.
                        Akses fitur premium akan tetap aktif hingga akhir periode penagihan.
                    </p>
                    <button
                        onClick={handleCancelSubscription}
                        disabled={cancelling}
                        className="text-red-600 font-medium hover:text-red-800 border border-red-200 hover:bg-red-50 px-6 py-2 rounded-lg transition-colors"
                    >
                        {cancelling ? 'Memproses...' : 'Batalkan Langganan'}
                    </button>
                </div>
            )}
        </div>
    )
}

export default SubscriptionPage
