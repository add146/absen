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
    MdVerified,
    MdClose
} from 'react-icons/md';
import api from '../services/api';

interface AttendanceCalendarViewProps {
    userId?: string; // If provided, acts in Admin Mode (fetching specific user's data)
    userName?: string; // For display title in modal
    onClose?: () => void; // If used in modal
}

const AttendanceCalendarView: React.FC<AttendanceCalendarViewProps> = ({ userId, userName, onClose }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [stats, setStats] = useState({
        present: 0,
        absent: 0,
        late: 0,
        avgHours: '0h 0m'
    });

    useEffect(() => {
        fetchMonthlyData();
    }, [currentDate, userId]);

    // Handle initial selection when data loads to point to today or latest data
    useEffect(() => {
        if (attendanceData.length > 0) {
            // Find if today has data
            const todayStr = new Date().toDateString();
            const todayHasData = attendanceData.some(d => new Date(d.check_in_time).toDateString() === todayStr);
            if (!todayHasData) {
                // If not today, maybe select the last day with data? 
                // For now keep default selectedDate as today/init
            }
        }
    }, [attendanceData]);

    const fetchMonthlyData = async () => {
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const start = new Date(year, month, 1);
            const end = new Date(year, month + 1, 0);

            const startStr = start.toISOString().split('T')[0];
            const endStr = end.toISOString().split('T')[0];

            let data;
            if (userId) {
                // Admin Mode: Fetch via admin endpoint
                // We set limit high enough to cover the whole month (e.g., 100)
                const res = await api.get(`/admin/attendance?user_id=${userId}&start_date=${startStr}&end_date=${endStr}&limit=100`);
                data = res.data.data;
            } else {
                // Employee Mode: Fetch via personal history endpoint
                const res = await api.get(`/attendance/history?start_date=${startStr}&end_date=${endStr}`);
                data = res.data.data;
            }

            setAttendanceData(data);
            calculateStats(data);
        } catch (error) {
            console.error('Failed to fetch history', error);
        }
    };

    const calculateStats = (data: any[]) => {
        let present = 0;
        let late = 0;
        let totalHoursMs = 0;
        const uniqueDays = new Set();
        let presentCountForAvg = 0;

        data.forEach(record => {
            // Only count 'presence' type for stats (ignore leaves for avg hours, but maybe count for presence?)
            // If data comes from /attendance/history, it might not have 'type' field populated explicitly as 'presence', 
            // but /admin/attendance returns 'type'.
            // Simple check: if check_in_time exists, it's presence-like.

            if (record.type === 'leave') return; // Skip leaves for hours calc

            const dateStr = new Date(record.check_in_time).toDateString();
            if (!uniqueDays.has(dateStr)) {
                uniqueDays.add(dateStr);
                present++;

                // Late calculation - Only count once per day (based on the record we encounter first, which is latest by default)
                // Ideally we should check the EARLIEST record for the day, but for now consistency with 'present' count is the priority.
                let isRecordLate = false;

                if (record.is_late !== undefined) {
                    isRecordLate = record.is_late; // Trust server if available
                } else {
                    // Fallback client-side calculation (Default 9 AM)
                    const checkIn = new Date(record.check_in_time);
                    if (checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 0)) {
                        isRecordLate = true;
                    }
                }

                if (isRecordLate) {
                    late++;
                }

                if (record.check_out_time) {
                    totalHoursMs += new Date(record.check_out_time).getTime() - new Date(record.check_in_time).getTime();
                    presentCountForAvg++;
                }
            }
        });

        const avgMs = presentCountForAvg > 0 ? totalHoursMs / presentCountForAvg : 0;
        const avgH = Math.floor(avgMs / 3600000);
        const avgM = Math.floor((avgMs % 3600000) / 60000);

        setStats({
            present,
            absent: 0, // Need logic for absent (working days - present)
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
        // Find *any* record for this day
        // Prioritize presence over leave if multiple? assume one per day for now
        return attendanceData.find(d => {
            const dateStr = d.check_in_time || d.start_date; // Handle leave start_date fallback if needed
            return new Date(dateStr).toDateString() === targetDate.toDateString();
        });
    };

    const selectedDayData = attendanceData.filter(d => {
        const dateStr = d.check_in_time || d.start_date;
        return new Date(dateStr).toDateString() === selectedDate.toDateString();
    });

    return (
        <div className="space-y-6">

            {/* Header / Stats Grid */}
            <div className="flex flex-col gap-6">
                {onClose && (
                    <div className="flex justify-between items-center pb-4 border-b">
                        <h3 className="text-xl font-bold">Riwayat: {userName || 'Karyawan'}</h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <MdClose size={24} />
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <StatCard icon={<MdCheckCircle />} title="Hadir" value={`${stats.present} Hari`} color="green" />
                    <StatCard icon={<MdCancel />} title="Absen" value={`${stats.absent} Hari`} color="red" />
                    <StatCard icon={<MdTimer />} title="Terlambat" value={`${stats.late} Hari`} color="orange" />
                    <StatCard icon={<MdHourglassBottom />} title="Rata-rata" value={stats.avgHours} color="blue" />
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Calendar Section */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <MdCalendarToday className="text-blue-600" />
                                {currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                            </h2>
                            <div className="flex items-center gap-2">
                                <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                                    <MdChevronLeft className="text-xl" />
                                </button>
                                <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                                    <MdChevronRight className="text-xl" />
                                </button>
                                {/* Export button could be here */}
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="grid grid-cols-7 mb-4 text-center">
                                {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
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

                                    let type: 'present' | 'late' | 'weekend' | 'leave' | 'regular' = 'regular';
                                    let timeStr = '';
                                    let durationStr = '';

                                    if (isWeekend) {
                                        type = 'weekend';
                                    } else if (record) {
                                        if (record.type === 'leave') {
                                            type = 'leave';
                                            timeStr = 'Cuti';
                                        } else {
                                            const checkIn = new Date(record.check_in_time);
                                            // Late check
                                            let isLate = false;
                                            if (record.is_late !== undefined) {
                                                isLate = record.is_late;
                                            } else {
                                                isLate = checkIn.getHours() > 9 || (checkIn.getHours() === 9 && checkIn.getMinutes() > 0);
                                            }

                                            type = isLate ? 'late' : 'present';
                                            timeStr = isLate
                                                ? `Late: ${checkIn.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                                                : `${checkIn.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
                                        }
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
                                {selectedDate.toLocaleDateString('id-ID', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </h3>
                            <p className="text-sm text-gray-500">Log Aktivitas Harian</p>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {selectedDayData.length > 0 ? selectedDayData.map((record, i) => (
                                <div key={i}>
                                    {record.type === 'leave' ? (
                                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800">
                                            <p className="font-semibold">Sedang Cuti</p>
                                            <p className="text-sm">{record.leave_type}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <TimelineItem
                                                title="Clock In"
                                                time={new Date(record.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                desc="Mulai Shift"
                                                location={record.location_name || 'Lokasi'}
                                                color="blue"
                                                verified={!!record.is_valid}
                                                photoUrl={record.face_photo_url}
                                                onPhotoClick={() => setSelectedPhoto(record.face_photo_url)}
                                            />
                                            {record.check_out_time && (
                                                <TimelineItem
                                                    title="Clock Out"
                                                    time={new Date(record.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    desc="Selesai Shift"
                                                    location={record.checkout_location_name || 'Lokasi'}
                                                    color="purple"
                                                    last
                                                />
                                            )}
                                        </>
                                    )}
                                </div>
                            )) : (
                                <p className="text-center text-gray-400 text-sm italic">Pilih tanggal dengan data untuk melihat detail.</p>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Photo Lightbox Modal */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedPhoto(null)}>
                    <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
                        <button
                            className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors flex items-center gap-2"
                            onClick={() => setSelectedPhoto(null)}
                        >
                            <span className="text-sm font-medium">Tutup</span>
                            <div className="bg-white/20 p-1 rounded-full">
                                <MdClose size={20} />
                            </div>
                        </button>
                        <img
                            src={selectedPhoto}
                            alt="Verification Full Size"
                            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl border-4 border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
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

const CalendarDay = ({ day, time, type = 'regular', isSelected }: { day: number, time?: string, duration?: string, type?: 'present' | 'late' | 'weekend' | 'leave' | 'regular', isSelected?: boolean }) => {
    if (type === 'weekend') {
        return (
            <div className={`h-24 lg:h-32 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-2 flex flex-col ${isSelected ? 'ring-2 ring-blue-600 ring-offset-2' : ''}`}>
                <span className="text-sm font-medium text-red-400">{day}</span>
                <div className="mt-auto flex justify-center">
                    <span className="text-[10px] text-gray-400">Weekend</span>
                </div>
            </div>
        );
    }

    const isLate = type === 'late';
    const isLeave = type === 'leave';

    let borderColor = 'border-gray-100 dark:border-gray-700';
    if (isLate) borderColor = 'border-l-4 border-l-orange-400 border-y border-r border-gray-100 dark:border-gray-700';
    if (isLeave) borderColor = 'border-l-4 border-l-blue-400 border-y border-r border-gray-100 dark:border-gray-700';
    if (isSelected) borderColor = 'border-2 border-blue-600 bg-indigo-50 dark:bg-indigo-900/10 shadow-lg transform scale-[1.02]';

    return (
        <div className={`h-24 lg:h-32 rounded-xl border ${borderColor} p-2 flex flex-col relative group hover:shadow-md transition-all cursor-pointer bg-white dark:bg-gray-800`}>
            {isSelected ? (
                <span className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shadow-sm">{day}</span>
            ) : (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{day}</span>
            )}

            <div className="mt-auto space-y-1">
                {time && (
                    <div className={`text-[10px] px-2 py-1 rounded truncate ${isLate
                        ? 'bg-orange-100 text-orange-700 font-medium'
                        : isLeave
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                        {time}
                    </div>
                )}
            </div>
        </div>
    );
};

const TimelineItem = ({ title, time, desc, location, color, verified, last, photoUrl, onPhotoClick }: { title: string, time: string, desc: string, location?: string, color: string, verified?: boolean, last?: boolean, photoUrl?: string, onPhotoClick?: () => void }) => {
    const colors = {
        blue: 'bg-blue-600 border-blue-600',
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

            <div className="flex flex-wrap gap-2">
                {location && (
                    <div className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-800 py-1.5 px-3 rounded-lg w-max text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                        <MdLocationOn className="text-sm" />
                        {location}
                    </div>
                )}
                {verified && (
                    <div className="flex items-center gap-2 text-xs bg-gray-50 dark:bg-gray-800 py-1.5 px-3 rounded-lg w-max text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                        <MdVerified className="text-sm text-green-500" />
                        Verified
                    </div>
                )}
            </div>

            {photoUrl && (
                <div onClick={onPhotoClick} className="mt-3 cursor-pointer group w-20 h-20 rounded-lg overflow-hidden border border-gray-200 relative">
                    <img src={photoUrl} alt="Selfie" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                </div>
            )}
        </div>
    );
};

export default AttendanceCalendarView;
