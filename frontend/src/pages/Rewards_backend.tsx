import React from 'react';
import {
    MdAccountBalanceWallet,
    MdRedeem,
    MdTrendingUp,
    MdShoppingBag,
    MdCardGiftcard,
    MdFlightTakeoff,
    MdFitnessCenter,
    MdExpandMore,
    MdCheckCircle,
    MdCheck,
    MdStar,
    MdShoppingCart,
    MdMap,
    MdChevronRight
} from 'react-icons/md';
import DashboardLayout from '../components/DashboardLayout';

const Rewards: React.FC = () => {
    return (
        <DashboardLayout>
            <div className="flex flex-col gap-8">
                {/* Header */}
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Points & Rewards</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your earned points and redeem rewards.</p>
                    </div>
                    {/* Header actions could go here */}
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left Column */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* Balance Card */}
                        <div className="bg-gradient-to-br from-indigo-600 to-indigo-400 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white opacity-10 blur-xl"></div>
                            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-white opacity-10 blur-xl"></div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-indigo-100 font-medium">Current Balance</span>
                                    <MdAccountBalanceWallet className="text-indigo-100 opacity-80 text-xl" />
                                </div>
                                <h2 className="text-4xl font-bold mb-1">2,450 <span className="text-xl font-normal opacity-80">pts</span></h2>
                                <p className="text-indigo-100 text-sm mb-6">+120 points earned this week</p>
                                <div className="flex gap-3">
                                    <button className="flex-1 bg-white text-primary font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                                        <MdRedeem className="text-sm" />
                                        Redeem
                                    </button>
                                    <button className="flex-1 bg-indigo-600 bg-opacity-40 text-white font-semibold py-2 px-4 rounded-lg hover:bg-opacity-50 transition-colors border border-indigo-400 border-opacity-30">
                                        History
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-3">
                                    <MdTrendingUp className="text-green-600 dark:text-green-400 text-xl" />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Total Earned</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">5,890</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-3">
                                    <MdShoppingBag className="text-orange-600 dark:text-orange-400 text-xl" />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Redeemed</p>
                                <p className="text-xl font-bold text-gray-900 dark:text-white">3,440</p>
                            </div>
                        </div>

                        {/* Browse Rewards */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Browse Rewards</h3>
                            <div className="space-y-3">
                                <RewardCategory icon={<MdCardGiftcard />} title="Gift Cards" subtitle="Amazon, Apple, etc." color="blue" />
                                <RewardCategory icon={<MdFlightTakeoff />} title="Time Off" subtitle="Extra leave hours" color="purple" />
                                <RewardCategory icon={<MdFitnessCenter />} title="Wellness" subtitle="Gym memberships" color="pink" />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Activity History */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 justify-between items-center">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Activity History</h3>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <select className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                                            <option>All Types</option>
                                            <option>Earned</option>
                                            <option>Spent</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                            <MdExpandMore className="text-sm" />
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <select className="appearance-none bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
                                            <option>This Month</option>
                                            <option>Last Month</option>
                                            <option>This Year</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                            <MdExpandMore className="text-sm" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Transaction</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date & Time</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Points</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        <HistoryRow
                                            icon={<MdCheckCircle />} title="On-time Clock In" subtitle="Streak: 5 days"
                                            category="Attendance" catColor="blue" date="Oct 24, 09:00 AM" points="+50"
                                            pointsColor="green" status="completed" iconBg="green" iconColor="green"
                                        />
                                        <HistoryRow
                                            icon={<MdStar />} title="Employee of the Month" subtitle="Nominated by Team Lead"
                                            category="Award" catColor="purple" date="Oct 20, 10:30 AM" points="+500"
                                            pointsColor="green" status="completed" iconBg="purple" iconColor="purple"
                                        />
                                        <HistoryRow
                                            icon={<MdShoppingCart />} title="Amazon Gift Card ($50)" subtitle="Reward Redemption"
                                            category="Redemption" catColor="gray" date="Oct 15, 02:15 PM" points="-1,200"
                                            pointsColor="red" status="completed" iconBg="gray" iconColor="gray"
                                        />
                                        <HistoryRow
                                            icon={<MdMap />} title="Office Visit" subtitle="Checked in at Central HQ"
                                            category="Location" catColor="yellow" date="Oct 12, 08:55 AM" points="+20"
                                            pointsColor="green" status="completed" iconBg="blue" iconColor="blue"
                                        />
                                        <HistoryRow
                                            icon={<MdCheckCircle />} title="On-time Clock In" subtitle="Streak: 4 days"
                                            category="Attendance" catColor="blue" date="Oct 11, 08:58 AM" points="+50"
                                            pointsColor="green" status="completed" iconBg="green" iconColor="green"
                                        />
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <span className="text-xs text-gray-500">Showing 5 of 45 transactions</span>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50" disabled>Previous</button>
                                    <button className="px-3 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Next</button>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};

const RewardCategory = ({ icon, title, subtitle, color }: { icon: React.ReactNode, title: string, subtitle: string, color: 'blue' | 'purple' | 'pink' }) => {
    const colors = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
        pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
    };

    return (
        <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer group transition-colors">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${colors[color]}`}>
                    {icon}
                </div>
                <div>
                    <p className="font-medium text-sm text-gray-900 dark:text-white group-hover:text-primary transition-colors">{title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
                </div>
            </div>
            <MdChevronRight className="text-gray-400 text-sm" />
        </div>
    );
};

const HistoryRow = ({ icon, title, subtitle, category, catColor, date, points, pointsColor, iconBg }: any) => {
    const catColors: any = {
        blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
        purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
        gray: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    };

    const iconBgs: any = {
        green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
        gray: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    };

    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${iconBgs[iconBg]}`}>
                        <span className="text-sm">{icon}</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${catColors[catColor]}`}>
                    {category}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {date}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right">
                <span className={`${pointsColor === 'green' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'} font-bold`}>{points}</span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-center">
                <MdCheck className="text-green-500 text-sm inline-block" title="Completed" />
            </td>
        </tr>
    );
};

export default Rewards;
