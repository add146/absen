import React from 'react';
import {
    MdCheckCircle,
    MdLocalHospital,
    MdCake,
    MdExpandMore,
    MdCloudUpload,
    MdCalendarToday,
    MdChevronRight,
    MdSend
} from 'react-icons/md';
import DashboardLayout from '../components/DashboardLayout';

const Leaves: React.FC = () => {
    return (
        <DashboardLayout>
            <div className="max-w-[1000px] mx-auto flex flex-col gap-8">

                {/* Page Heading */}
                <header className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-2 opacity-80">
                        <span>My Leave</span>
                        <MdChevronRight className="text-base" />
                        <span className="text-gray-900 dark:text-white font-medium">New Request</span>
                    </div>
                    <h1 className="text-gray-900 dark:text-white text-3xl md:text-4xl font-black leading-tight">Submit Leave Request</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-base max-w-2xl">
                        Fill out the form below to request time off. Your request will be sent to your manager for approval.
                    </p>
                </header>

                {/* Stats */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <LeaveStatCard
                        title="Annual Leave"
                        value="14"
                        total="Days"
                        icon={<MdCheckCircle className="text-green-500 text-2xl" />}
                        progress={65}
                        color="primary"
                    />
                    <LeaveStatCard
                        title="Sick Leave"
                        value="5"
                        total="Days"
                        icon={<MdLocalHospital className="text-amber-500 text-2xl" />}
                        progress={40}
                        color="amber"
                    />
                    <LeaveStatCard
                        title="Floating Holidays"
                        value="2"
                        total="Days"
                        icon={<MdCake className="text-purple-500 text-2xl" />}
                        progress={80}
                        color="purple"
                    />
                </section>

                {/* Form Area */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-6 md:p-8 flex flex-col gap-8">

                        {/* Top Row */}
                        <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1 min-w-[300px]">
                                <label className="flex flex-col gap-2 w-full">
                                    <span className="text-gray-900 dark:text-white text-base font-medium">Leave Type</span>
                                    <div className="relative">
                                        <select className="appearance-none w-full rounded-lg text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 h-12 px-4 pr-10 text-base focus:border-primary focus:ring-primary focus:ring-1 outline-none transition-colors">
                                            <option disabled defaultValue="">Select leave type</option>
                                            <option value="annual">Annual Leave</option>
                                            <option value="sick">Sick Leave</option>
                                            <option value="floating">Floating Holiday</option>
                                            <option value="unpaid">Unpaid Leave</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                                            <MdExpandMore className="text-2xl" />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500">Select the category for your time off request.</p>
                                </label>
                            </div>

                            <div className="flex-1">
                                <label className="flex flex-col gap-2 w-full">
                                    <span className="text-gray-900 dark:text-white text-base font-medium">Attachment (Optional)</span>
                                    <div className="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-600 px-6 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer group h-12">
                                        <div className="flex items-center gap-2 text-gray-500 group-hover:text-primary transition-colors">
                                            <MdCloudUpload className="text-xl" />
                                            <span className="text-sm font-medium">Click to upload</span>
                                        </div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Date Selection */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-gray-900 dark:text-white text-base font-medium">Select Dates</span>
                                <div className="flex items-center gap-2 text-sm bg-indigo-50 dark:bg-indigo-900/10 px-3 py-1.5 rounded-full text-primary border border-primary/10">
                                    <MdCalendarToday className="text-base" />
                                    <span className="font-medium">Nov 7 - Nov 10</span>
                                    <span className="text-gray-300 dark:text-gray-600 mx-1">|</span>
                                    <span className="text-gray-600 dark:text-gray-300 font-normal">4 Days Total</span>
                                </div>
                            </div>

                            {/* Calendar UI Mockup - Simplified for Code */}
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50/50 dark:bg-gray-800/30 overflow-x-auto">
                                <div className="flex min-w-[600px] justify-between gap-8">
                                    {/* Month 1 */}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between px-2 mb-2">
                                            <div className="w-8"></div>
                                            <p className="font-bold text-gray-900 dark:text-white">November 2023</p>
                                            <div className="w-8"></div>
                                        </div>
                                        <div className="grid grid-cols-7 mb-2 text-center">
                                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i} className="text-xs font-semibold text-gray-400 py-1">{d}</span>)}
                                        </div>
                                        <div className="grid grid-cols-7 gap-1">
                                            {[...Array(30)].map((_, i) => {
                                                const day = i + 1;
                                                const isSelected = day >= 7 && day <= 10;
                                                return (
                                                    <button
                                                        key={day}
                                                        className={`h-9 w-full rounded-full flex items-center justify-center text-sm transition-colors ${isSelected
                                                            ? 'bg-primary/20 text-primary font-bold'
                                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                                            } ${day === 7 ? 'rounded-l-full rounded-r-none' : ''} ${day === 10 ? 'rounded-r-full rounded-l-none' : ''} ${day > 7 && day < 10 ? 'rounded-none' : ''}`}
                                                    >
                                                        {isSelected && (day === 7 || day === 10) ? (
                                                            <span className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center">{day}</span>
                                                        ) : day}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reason */}
                        <div className="flex-1">
                            <label className="flex flex-col gap-2 w-full">
                                <span className="text-gray-900 dark:text-white text-base font-medium">Reason</span>
                                <textarea
                                    className="w-full rounded-lg text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 p-4 text-base focus:border-primary focus:ring-primary focus:ring-1 min-h-[120px] outline-none transition-colors"
                                    placeholder="Please describe the reason for your leave request..."
                                ></textarea>
                            </label>
                        </div>

                        <div className="h-px bg-gray-200 dark:bg-gray-700 w-full"></div>

                        {/* Actions */}
                        <div className="flex flex-col-reverse md:flex-row justify-end gap-4">
                            <button className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                            <button className="px-8 py-3 rounded-lg bg-primary text-white font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2">
                                <MdSend className="text-xl" />
                                Submit Request
                            </button>
                        </div>

                    </div>
                </div>

                <footer className="text-center text-gray-400 dark:text-gray-500 text-sm py-4">
                    © 2023 WorkPulse. All rights reserved.
                </footer>
            </div>
        </DashboardLayout>
    );
};

const LeaveStatCard = ({ title, value, total, icon, progress, color }: { title: string, value: string, total: string, icon: React.ReactNode, progress: number, color: string }) => {
    let barColor = 'bg-primary';
    if (color === 'amber') barColor = 'bg-amber-500';
    if (color === 'purple') barColor = 'bg-purple-500';

    return (
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-gray-600 dark:text-gray-300 text-base font-medium">{title}</p>
                {icon}
            </div>
            <p className="text-gray-900 dark:text-white tracking-tight text-3xl font-bold leading-tight">
                {value} <span className="text-lg font-medium text-gray-400">{total}</span>
            </p>
            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full mt-2">
                <div className={`${barColor} h-1.5 rounded-full`} style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
};

export default Leaves;
