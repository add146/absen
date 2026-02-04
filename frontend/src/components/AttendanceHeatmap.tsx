import React, { useState, useEffect } from 'react';
import { MdChevronLeft, MdChevronRight, MdInfoOutline } from 'react-icons/md';
import api from '../services/api';

interface AttendanceDay {
    date: string;
    first_check_in: string;
    last_check_out: string | null;
}

const AttendanceHeatmap: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceDay>>({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCalendarData();
    }, [currentDate]);

    const fetchCalendarData = async () => {
        setLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const res = await api.get(`/attendance/calendar?year=${year}&month=${month}`);

            // Map array to object for easier lookup
            const map: Record<string, AttendanceDay> = {};
            if (res.data.data) {
                res.data.data.forEach((item: any) => {
                    map[item.date] = item;
                });
            }
            setAttendanceData(map);
        } catch (error) {
            console.error("Failed to fetch calendar data", error);
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    // Calendar logic
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday

    // Create array for days
    const days = [];
    // Fill empty slots for previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    // Fill days
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    const getStatusColor = (day: number) => {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const data = attendanceData[dateStr];

        if (!data) return 'bg-gray-100 dark:bg-gray-800 text-gray-400'; // No record

        // Simple logic for now: Green if present
        // Enhanced logic could be: Late if check_in > 9:00
        const checkIn = new Date(data.first_check_in);
        const hour = checkIn.getHours();

        if (hour >= 9) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800'; // Late
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'; // On Time
    };

    const getDayData = (day: number) => {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        return attendanceData[dateStr];
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    Attendance History
                    <div className="group relative">
                        <MdInfoOutline className="text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="hidden group-hover:block absolute z-10 w-48 p-2 mt-2 text-xs text-white bg-gray-800 rounded shadow-lg -left-20">
                            Green: On Time (&lt; 9 AM)<br />
                            Yellow: Late (&gt; 9 AM)<br />
                            Gray: Absent / Weekend
                        </div>
                    </div>
                </h3>
                <div className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-1">
                    <button onClick={prevMonth} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 transition-colors">
                        <MdChevronLeft size={20} />
                    </button>
                    <span className="text-sm font-medium px-2 min-w-[100px] text-center text-gray-700 dark:text-gray-200">
                        {currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded text-gray-600 dark:text-gray-300 transition-colors">
                        <MdChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs text-gray-500 font-medium">
                <div>Sun</div>
                <div>Mon</div>
                <div>Tue</div>
                <div>Wed</div>
                <div>Thu</div>
                <div>Fri</div>
                <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 gap-2">
                {days.map((day, idx) => (
                    <div key={idx} className="aspect-square relative group">
                        {day ? (
                            <>
                                <div
                                    className={`w-full h-full rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all cursor-default ${getStatusColor(day)}`}
                                >
                                    <span>{day}</span>
                                    {getDayData(day) && (
                                        <div className="w-1 h-1 rounded-full bg-current mt-1"></div>
                                    )}
                                </div>

                                {/* Tooltip */}
                                {getDayData(day) && (
                                    <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 w-40 p-2 bg-gray-900 text-white text-xs rounded shadow-xl pointer-events-none">
                                        <div className="font-semibold mb-1">
                                            {new Date(getDayData(day)!.date).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-2">
                                            <span className="text-gray-400">In:</span>
                                            <span>{new Date(getDayData(day)!.first_check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            <span className="text-gray-400">Out:</span>
                                            <span>{getDayData(day)!.last_check_out ? new Date(getDayData(day)!.last_check_out!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                        </div>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full"></div>
                        )}
                    </div>
                ))}
            </div>

            {loading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex items-center justify-center rounded-2xl">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}
        </div>
    );
};

export default AttendanceHeatmap;
