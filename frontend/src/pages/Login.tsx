import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    MdFingerprint,
    MdOutlineMail,
    MdOutlineLock,
    MdLocationOn,
    MdStars,
    MdSchedule,
    MdVerifiedUser,
    MdDarkMode,
    MdLightMode
} from 'react-icons/md';

const Login: React.FC = () => {
    const [darkMode, setDarkMode] = useState(false);

    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const toggleTheme = () => {
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle('dark');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/auth/login', formData);
            localStorage.setItem('access_token', res.data.access_token);
            localStorage.setItem('user_data', JSON.stringify(res.data.user));

            // Redirect based on role
            if (res.data.user.role === 'owner' || res.data.user.role === 'super_admin') {
                navigate('/tenant/dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`font-display bg-gradient-to-br from-indigo-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen flex items-center justify-center relative overflow-hidden text-gray-800 dark:text-gray-100 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
            {/* Background Shapes */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] rounded-full bg-gradient-to-r from-primary to-secondary blur-[80px] opacity-40"></div>
                <div className="absolute bottom-[-150px] right-[-100px] w-[400px] h-[400px] rounded-full bg-gradient-to-r from-blue-500 to-blue-300 blur-[80px] opacity-40"></div>
            </div>

            <div className="relative w-full max-w-6xl p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center z-10">

                {/* Login Form Card */}
                <div className="bg-white dark:bg-gray-800 p-8 md:p-12 rounded-2xl shadow-xl w-full max-w-md mx-auto transform transition-all hover:shadow-2xl">
                    <div className="mb-10 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-primary mb-4">
                            <MdFingerprint className="text-3xl" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome Back</h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Please sign in to your employee dashboard</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                            <MdStars className="text-xl shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ml-1" htmlFor="email">Work Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MdOutlineMail className="text-gray-400 text-xl" />
                                </div>
                                <input
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-600 rounded-xl leading-5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ml-1" htmlFor="password">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MdOutlineLock className="text-gray-400 text-xl" />
                                </div>
                                <input
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-600 rounded-xl leading-5 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-600 dark:text-gray-400">Remember me</label>
                            </div>
                            <div className="text-sm">
                                <Link to="#" className="font-medium text-primary hover:text-secondary dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">Forgot password?</Link>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-primary to-secondary hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            New employee?
                            <Link to="/register" className="font-medium text-primary hover:text-secondary dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors ml-1">Register Account</Link>
                        </p>
                    </div>
                </div>

                {/* Hero Section */}
                <div className="hidden md:flex flex-col justify-center items-start text-left space-y-8 pl-8">
                    <div className="space-y-4">
                        <span className="px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-primary dark:text-blue-300 text-xs font-bold tracking-wider uppercase">Smart Attendance</span>
                        <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                            Seamless Tracking <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Limitless Rewards</span>
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-lg leading-relaxed">
                            Clock in from anywhere with our secure geofencing technology. Earn points for punctuality and redeem them for exciting perks.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6 w-full max-w-lg mt-8">
                        <FeatureCard icon={<MdLocationOn />} title="Geofencing" desc="Automatic location validation" color="blue" />
                        <FeatureCard icon={<MdStars />} title="Rewards" desc="Points based system" color="purple" />
                        <FeatureCard icon={<MdSchedule />} title="Shifts" desc="Easy shift management" color="indigo" />
                        <FeatureCard icon={<MdVerifiedUser />} title="Secure" desc="Biometric integration ready" color="pink" />
                    </div>
                </div>

            </div>

            {/* Theme Toggle */}
            <div className="absolute bottom-6 right-6 z-20">
                <button
                    onClick={toggleTheme}
                    className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary focus:outline-none transition-colors"
                >
                    {darkMode ? <MdLightMode /> : <MdDarkMode />}
                </button>
            </div>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) => {
    // Mapping simplified for Tailwind safe-listing or just standard classes
    // Utilizing style interpolation for color
    const colorClasses: { [key: string]: string } = {
        blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
        purple: "text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20",
        indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20",
        pink: "text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/20",
    };

    return (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md p-5 rounded-2xl border border-white/20 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[color]}`}>
                <span className="text-xl">{icon}</span>
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
        </div>
    );
}

export default Login;
