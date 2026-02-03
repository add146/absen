import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    MdPersonAdd,
    MdBadge,
    MdMail,
    MdFingerprint,
    MdBusiness,
    MdLock,
    MdCheckCircle,
    MdDarkMode,
    MdLightMode
} from 'react-icons/md';

const Register: React.FC = () => {
    const [darkMode, setDarkMode] = useState(false);

    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        fullname: '',
        email: '',
        employee_id: '',
        company_name: '',
        password: '',
        terms: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const toggleTheme = () => {
        setDarkMode(!darkMode);
        document.documentElement.classList.toggle('dark');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.terms) {
            setError('You must agree to the Terms of Service');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await api.post('/auth/register', {
                email: formData.email,
                password: formData.password,
                name: formData.fullname,
                tenant_name: formData.company_name
                // employee_id is ignored by backend for now
            });
            // Auto login or redirect to login? Let's redirect to login for now.
            navigate('/login');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || 'Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`font-display bg-gray-100 dark:bg-gray-900 min-h-screen flex items-center justify-center relative overflow-hidden transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
            {/* Background Animations */}
            <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 opacity-20 blur-xl animate-float pointer-events-none"></div>
            <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full bg-gradient-to-tr from-purple-400 to-pink-500 opacity-20 blur-2xl animate-float-delayed pointer-events-none"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-50 dark:bg-indigo-900/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

            <div className="w-full max-w-6xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">

                {/* Left Side Content - Hidden on mobile */}
                <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-8 pr-8">
                    <div className="bg-white dark:bg-gray-800 p-1 rounded-2xl shadow-xl transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500 border border-gray-200 dark:border-gray-700 w-3/4 mx-auto overflow-hidden">
                        {/* Placeholder image using gradient if actual image is missing */}
                        <div className="w-full h-64 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-opacity-80">
                            <span className="text-lg">Team Dashboard Preview</span>
                        </div>
                    </div>
                    <div className="text-center lg:text-left space-y-4 max-w-lg mx-auto lg:mx-0 pl-8">
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                            Smart HR Management <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">Simplified for Everyone.</span>
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                            Join the team to track attendance, manage leaves, and earn rewards effortlessly with our geofencing technology.
                        </p>
                        <div className="flex items-center space-x-4 pt-4">
                            <div className="flex -space-x-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 bg-gray-300 dark:bg-gray-600"></div>
                                ))}
                                <div className="w-10 h-10 rounded-full border-2 border-white dark:border-gray-800 bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-500 dark:text-gray-300">+2k</div>
                            </div>
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Employees onboarded</span>
                        </div>
                    </div>
                </div>

                {/* Right Side Form */}
                <div className="col-span-1 lg:col-span-5 w-full">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-10 border border-gray-200 dark:border-gray-700 backdrop-blur-sm bg-opacity-95 dark:bg-opacity-95 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

                        <div className="mb-8 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 mb-4 text-primary">
                                <MdPersonAdd className="text-3xl" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Account</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Get started with your employee portal</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
                                <MdCheckCircle className="text-xl shrink-0 text-red-600" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}

                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div>
                                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1" htmlFor="fullname">Full Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MdBadge className="text-gray-400 text-xl" />
                                    </div>
                                    <input className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-11 transition-colors" id="fullname" name="fullname" placeholder="John Doe" required type="text" value={formData.fullname} onChange={handleChange} disabled={loading} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1" htmlFor="email">Work Email</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MdMail className="text-gray-400 text-xl" />
                                    </div>
                                    <input className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-11 transition-colors" id="email" name="email" placeholder="john@company.com" required type="email" value={formData.email} onChange={handleChange} disabled={loading} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1" htmlFor="employee_id">Employee ID</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MdFingerprint className="text-gray-400 text-xl" />
                                    </div>
                                    <input className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-11 transition-colors" id="employee_id" name="employee_id" placeholder="EMP-0000" type="text" value={formData.employee_id} onChange={handleChange} disabled={loading} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1" htmlFor="company_name">Company Name</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MdBusiness className="text-gray-400 text-xl" />
                                    </div>
                                    <input className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-11 transition-colors" id="company_name" name="company_name" placeholder="Acme Inc." required type="text" value={formData.company_name} onChange={handleChange} disabled={loading} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1" htmlFor="password">Password</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MdLock className="text-gray-400 text-xl" />
                                    </div>
                                    <input className="pl-10 block w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm focus:border-primary focus:ring-primary sm:text-sm h-11 transition-colors" id="password" name="password" placeholder="••••••••" required type="password" value={formData.password} onChange={handleChange} disabled={loading} />
                                </div>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                    <MdCheckCircle className="text-[14px] mr-1 text-green-500" />
                                    Must be at least 8 characters
                                </p>
                            </div>

                            <div className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input className="focus:ring-primary h-4 w-4 text-primary border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700" id="terms" name="terms" type="checkbox" checked={formData.terms} onChange={handleChange} disabled={loading} />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label className="font-medium text-gray-900 dark:text-gray-300" htmlFor="terms">
                                        I agree to the <Link className="text-primary hover:text-indigo-700 underline decoration-dotted" to="#">Terms of Service</Link> and <Link className="text-primary hover:text-indigo-700 underline decoration-dotted" to="#">Privacy Policy</Link>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <button className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={loading}>
                                    {loading ? 'Creating Account...' : 'Register Account'}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                        Already have an account?
                                    </span>
                                </div>
                            </div>
                            <div className="mt-6 text-center">
                                <Link className="font-medium text-primary hover:text-indigo-700" to="/login">Sign in here</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Theme Toggle */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={toggleTheme}
                    className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
                >
                    {darkMode ? <MdLightMode /> : <MdDarkMode />}
                </button>
            </div>
        </div>
    );
};

export default Register;
