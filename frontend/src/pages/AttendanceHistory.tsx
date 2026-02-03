import React, { useState, useEffect } from 'react';
import {
    MdCheckCircle,
    MdCancel,
    MdTimer,
    MdHourglassBottom,
    MdCalendarToday,
    MdChevronLeft,
    MdChevronRight,
    MdLocationOn,
    MdHome,
    MdVerified,
    MdEdit,
    MdFileDownload
} from 'react-icons/md';
import DashboardLayout from '../components/DashboardLayout';
import api from '../services/api';

const AttendanceHistory: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        present: 0,
        absent: 0,
        late: 0,
        avgHours: '0h 0m'
    });

    useEffect(() => {
        fetchMonthlyData();
    }, [currentDate]);

    const fetchMonthlyData = async () => {
        setLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0);

            const res = await api.get(`/attendance/history?start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}`);
            const data = res.data.data;
            setAttendanceData(data);
            calculateStats(data);
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data: any[]) => {
        let present = 0;
        let late = 0;
        let totalHoursMs = 0;

        const uniqueDays = new Set();
        let presentCountForAvg = 0;

        data.forEach(record => {
            const dateStr = new Date(record.check_in_time).toDateString();
            if (!uniqueDays.has(dateStr)) {
                uniqueDays.add(dateStr);
                present++;
            }

            const checkIn = new Date(record.check_in_time);
            if (checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 0)) {
                late++;
            }

            if (record.check_out_time) {
                totalHoursMs += new Date(record.check_out_time).getTime() - checkIn.getTime();
                presentCountForAvg++;
            }
        });

        const avgMs = presentCountForAvg > 0 ? totalHoursMs / presentCountForAvg : 0;
        const avgH = Math.floor(avgMs / 3600000);
        const avgM = Math.floor((avgMs % 3600000) / 60000);

        setStats({
            present,
            absent: 0,
            late,
            avgHours: `${avgH}h ${avgM}m`
        });
    };

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    const blanks = Array(firstDay).fill(null);
    const daysArray = Array.from({ length: days }, (_, i) => i + 1);

    const changeMonth = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setCurrentDate(newDate);
    };

    const getDayData = (day: number) => {
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return attendanceData.find(d => new Date(d.check_in_time).toDateString() === targetDate.toDateString());
    };

    const selectedDayData = attendanceData.filter(d => new Date(d.check_in_time).toDateString() === selectedDate.toDateString());

    return (
        <DashboardLayout>
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard icon={<MdCheckCircle />} title="Present" value={`${stats.present} Days`} color="green" />
                    <StatCard icon={<MdCancel />} title="Absent" value={`${stats.absent} Days`} color="red" />
                    <StatCard icon={<MdTimer />} title="Late Arrival" value={`${stats.late} Days`} color="orange" />
                    <StatCard icon={<MdHourglassBottom />} title="Avg Hours" value={stats.avgHours} color="blue" />
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* Calendar Section */}
                    <div className="xl:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <MdCalendarToday className="text-primary" />
                                    {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                                        <MdChevronLeft className="text-xl" />
                                    </button>
                                    <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                                        <MdChevronRight className="text-xl" />
                                    </button>
                                    <button className="bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm hover:bg-opacity-90 transition flex items-center gap-2">
                                        <MdFileDownload /> Export
                                    </button>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="grid grid-cols-7 mb-4 text-center">
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                        <div key={day} className="text-xs font-semibold text-gray-400 uppercase">{day}</div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-7 gap-2 lg:gap-4">
                                    {/* Blanks for prev month */}
                                    {blanks.map((_, i) => (
                                        <div key={`blank-${i}`} className="h-24 lg:h-32 rounded-xl bg-gray-50/50 dark:bg-gray-800/30"></div>
                                    ))}

                                    {/* Days */}
                                    {daysArray.map((day) => {
                                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                        const record = getDayData(day);

                                        let type: 'present' | 'late' | 'weekend' | 'wfh' | 'regular' | 'absent' = 'regular';
                                        let timeStr = '';
                                        let durationStr = '';

                                        if (isWeekend) {
                                            type = 'weekend';
                                        } else if (record) {
                                            const checkIn = new Date(record.check_in_time);
                                            const isLate = checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 0);
                                            type = isLate ? 'late' : 'present';
                                            timeStr = isLate
                                                ? `Late: ${checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                                : `${checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}`;

                                        } else if (date < new Date() && !isWeekend) {
                                            // type = 'absent'; 
                                        }

                                        const isSelected = selectedDate.getDate() === day && (selectedDate.getMonth() === currentDate.getMonth()) && (selectedDate.getFullYear() === currentDate.getFullYear());

                                        return (
                                            <div onClick={() => setSelectedDate(date)} key={day}>
                                                <CalendarDay
                                                    day={day}
                                                    time={timeStr}
                                                    duration={durationStr}
                                                    type={type}
                                                    isSelected={isSelected}
                                                />
                                            </div>

                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Daily Log Section */}
                    <div className="xl:col-span-1">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                                <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-1">
                                    {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                </h3>
                                <p className="text-sm text-gray-500">Daily Activity Log</p>

                                {selectedDayData.length > 0 ? (
                                    <div className="mt-6 flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-primary/20">
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Duration</p>
                                            <p className="text-lg font-bold text-primary">
                                                {selectedDayData[0].check_out_time ? (
                                                    (() => {
                                                        const diff = new Date(selectedDayData[0].check_out_time).getTime() - new Date(selectedDayData[0].check_in_time).getTime();
                                                        const h = Math.floor(diff / 3600000);
                                                        const m = Math.floor((diff % 3600000) / 60000);
                                                        return `${h}h ${m}m`;
                                                    })()
                                                ) : 'Ongoing'}
                                            </p>
                                        </div>
                                        <div className="h-8 w-[1px] bg-gray-300 dark:bg-gray-600"></div>
                                        <div className="text-center">
                                            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Status</p>
                                            <p className="text-sm font-bold text-green-600 dark:text-green-400">On Time</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-6 p-4 text-center text-gray-500 text-sm">No activity recorded</div>
                                )}
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {selectedDayData.map((record, i) => (
                                    <div key={i}>
                                        <TimelineItem
                                            title="Clock In"
                                            time={new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            desc="Shift Start"
                                            location="Office"
                                            color="blue"
                                            verified
                                        />
                                        {record.check_out_time && (
                                            <TimelineItem
                                                title="Clock Out"
                                                time={new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                desc="Shift End"
                                                location="Office"
                                                color="purple"
                                                last
                                            />
                                        )}
                                    </div>
                                ))}
                                {selectedDayData.length === 0 && <p className="text-center text-gray-400 text-sm italic">Select a day with data to view details</p>}
                            </div>

                            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 rounded-b-2xl">
                                <button onClick={() => alert('Request correction feature coming soon')} className="w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm transition-all text-sm flex items-center justify-center gap-2">
                                    <MdEdit className="text-base" />
                                    Request Correction
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
};

const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string, color: 'green' | 'red' | 'orange' | 'blue' }) => {
    const colors = {
        green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
        red: 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400',
        orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-500 dark:text-orange-400',
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    };
    return (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colors[color]}`}>
                <span className="text-xl">{icon}</span>
            </div>
            <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{title}</p>
                <p className="text-xl font-bold text-gray-800 dark:text-white">{value}</p>
            </div>
        </div>
    );
};

const CalendarDay = ({ day, time, duration, type = 'regular', isSelected }: { day: number, time?: string, duration?: string, type?: 'present' | 'late' | 'weekend' | 'wfh' | 'regular' | 'absent', isSelected?: boolean }) => {
    if (type === 'weekend') {
        return (
            <div className={`h-24 lg:h-32 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-2 flex flex-col ${isSelected ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900' : ''}`}>
                <span className="text-sm font-medium text-red-400">{day}</span>
                <div className="mt-auto flex justify-center">
                    <span className="text-[10px] text-gray-400">Weekend</span>
                </div>
            </div>
        );
    }

    const isLate = type === 'late';
    const isWfh = type === 'wfh';

    let borderColor = 'border-gray-100 dark:border-gray-700';
    if (isLate) borderColor = 'border-l-4 border-l-orange-400 border-y border-r border-gray-100 dark:border-gray-700';
    if (isSelected) borderColor = 'border-2 border-primary bg-indigo-50 dark:bg-indigo-900/10 shadow-lg transform scale-[1.02]';

    return (
        <div className={`h-24 lg:h-32 rounded-xl border ${borderColor} p-2 flex flex-col relative group hover:shadow-md transition-all cursor-pointer bg-white dark:bg-gray-800`}>
            {isSelected ? (
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white text-xs font-bold shadow-sm">{day}</span>
            ) : (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{day}</span>
            )}

            {isWfh && (
                <div className="absolute top-2 right-2">
                    <MdHome className="text-blue-400 text-sm" />
                </div>
            )}
            <div className="mt-auto space-y-1">
                {time && (
                    <div className={`text-[10px] px-2 py-1 rounded truncate ${isLate
                        ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 font-medium'
                        : isWfh
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                            : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                        }`}>
                        {time}
                    </div>
                )}
                {duration && <div className="text-[10px] text-gray-400 px-1 truncate">{duration}</div>}
            </div>
        </div>
    );
};

const TimelineItem = ({ title, time, desc, location, color, verified, last }: { title: string, time: string, desc: string, location?: string, color: string, verified?: boolean, last?: boolean }) => {
    const colors = {
        blue: 'bg-primary border-primary',
        orange: 'bg-orange-400 border-orange-400',
        green: 'bg-green-500 border-green-500',
        purple: 'bg-purple-500 border-purple-500',
    };

    return (
        <div className={`relative pl-6 ${!last ? 'border-l-2 border-gray-100 dark:border-gray-700 pb-8' : ''}`}>
            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 shadow-sm ${colors[color as keyof typeof colors].split(' ')[0]}`}></div>
            <div className="flex justify-between items-start mb-1">
                <h4 className="font-semibold text-gray-800 dark:text-white">{title}</h4>
                <span className="text-xs font-mono text-gray-400">{time}</span>
            </div>
            <p className="text-sm text-gray-500 mb-2">{desc}</p>
            {location && (
                <div className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-800 py-1.5 px-3 rounded-lg w-max text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                    <MdLocationOn className="text-sm" />
                    {location}
                </div>
            )}
            {verified && (
                <div className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-800 py-1.5 px-3 rounded-lg w-max text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                    <MdVerified className="text-sm" />
                    Geofence Verified
                </div>
            )}
        </div>
    );
};

export default AttendanceHistory;
