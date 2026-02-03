import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import axios from 'axios';
import {
    MdTouchApp,
    MdLocationOn,
    MdCheckCircle,
    MdLogin,
    MdLogout,
    MdSchedule,
    MdCoffee,
    MdCameraAlt,
    MdClose
} from 'react-icons/md';
import DashboardLayout from '../components/DashboardLayout';
import { compressImage } from '../utils/imageCompression';

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [clockedIn, setClockedIn] = useState(false);
    const [attendanceId, setAttendanceId] = useState<string | null>(null);
    const [leavesStats, setLeavesStats] = useState({ total: 12, used: 0 });
    const [weeklyHours, setWeeklyHours] = useState<number[]>([0, 0, 0, 0, 0]);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [activities, setActivities] = useState<any[]>([]);
    const [stats, setStats] = useState({
        checkInTime: '--:--',
        checkOutTime: '--:--',
        workingHours: '0h 0m',
        location: 'Not checked in'
    });

    // Camera State
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [locationCoords, setLocationCoords] = useState<{ latitude: number, longitude: number } | null>(null);

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        fetchTodayAttendance();
        fetchLeavesData();
        fetchWeeklyData();
    }, []);

    // Camera Logic
    useEffect(() => {
        if (showCamera && videoRef.current && stream) {
            console.log("Attaching stream to video element in Dashboard");
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
    }, [showCamera, stream]);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false
            });
            setStream(mediaStream);
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Could not access camera. Please allow permissions.');
            setShowCamera(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const closeCamera = () => {
        stopCamera();
        setCapturedImage(null);
        setShowCamera(false);
    }

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const photoData = canvasRef.current.toDataURL('image/jpeg', 0.8);
                setCapturedImage(photoData);
                stopCamera(); // Stop stream after capture to save battery/resources
            }
        }
    };

    const fetchLeavesData = async () => {
        try {
            const res = await api.get('/leaves');
            const used = res.data.data.filter((l: any) => l.status === 'approved').length;
            setLeavesStats(prev => ({ ...prev, used }));
        } catch (error) {
            console.error('Failed to fetch leaves', error);
        }
    }

    const fetchWeeklyData = async () => {
        try {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 6);
            const res = await api.get(`/attendance/history?start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}`);
            const data = res.data.data;
            if (data.length > 0) {
                // Logic implemented later
            }
            setWeeklyHours([0, 0, 0, 0, 0]);
        } catch (error) {
            console.error('Failed to fetch weekly data', error);
        }
    }

    const fetchTodayAttendance = async () => {
        try {
            const res = await api.get('/attendance/today');
            const data = res.data.data;
            setActivities(data);

            if (data && data.length > 0) {
                const latest = data[0];
                const checkIn = new Date(latest.check_in_time);

                let checkOutStr = '--:--';
                let isClockedIn = false;
                let workingHrs = '0h 0m';

                if (!latest.check_out_time) {
                    isClockedIn = true;
                    setAttendanceId(latest.id);
                    const diffMs = new Date().getTime() - checkIn.getTime();
                    const diffHrs = Math.floor(diffMs / 3600000);
                    const diffMins = Math.floor((diffMs % 3600000) / 60000);
                    workingHrs = `${diffHrs}h ${diffMins}m`;
                } else {
                    const checkOut = new Date(latest.check_out_time);
                    checkOutStr = checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const diffMs = checkOut.getTime() - checkIn.getTime();
                    const diffHrs = Math.floor(diffMs / 3600000);
                    const diffMins = Math.floor((diffMs % 3600000) / 60000);
                    workingHrs = `${diffHrs}h ${diffMins}m`;
                }

                setClockedIn(isClockedIn);
                setStats(prev => ({
                    ...prev,
                    checkInTime: checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    checkOutTime: checkOutStr,
                    workingHours: workingHrs,
                    location: 'Office (Verified)'
                }));
            } else {
                setStats(prev => ({ ...prev, location: 'Ready to check-in' }));
            }
        } catch (error: any) {
            console.error('Failed to fetch attendance', error);
            if (error.response?.status === 401) navigate('/login');
        }
    };

    const initiateClockAction = () => {
        setLoading(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setLocationCoords({ latitude, longitude });
            setLoading(false);

            if (clockedIn) {
                // If clocking out, verify location directly (or add camera if required later)
                // For now, proceed to checkout
                handleCheckOut(latitude, longitude);
            } else {
                // If clocking IN, open Camera
                setShowCamera(true);
                startCamera();
            }

        }, (err) => {
            console.error(err);
            alert('Location permission is required.');
            setLoading(false);
        });
    }

    const handleCheckOut = async (lat: number, lng: number) => {
        setLoading(true);
        try {
            await api.post('/attendance/check-out', {
                attendance_id: attendanceId,
                latitude: lat,
                longitude: lng
            });
            await fetchTodayAttendance();
        } catch (error) {
            console.error('Clock out failed', error);
            alert('Clock out failed');
        } finally {
            setLoading(false);
        }
    }

    const handleCheckInWithPhoto = async () => {
        if (!locationCoords || !capturedImage) return;

        setLoading(true);
        try {
            // 1. Upload Photo to get URL
            const token = localStorage.getItem('access_token');
            // Compress image before upload
            const compressedFile = await compressImage(capturedImage);

            const formData = new FormData();
            formData.append('file', compressedFile, 'checkin_photo.jpg');

            let photoUrl = '';
            try {
                // Reuse existing upload endpoint
                const uploadRes = await axios.post(`${API_URL}/upload`, formData, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                photoUrl = uploadRes.data.url || uploadRes.data.data?.url;
            } catch (e) {
                console.error("Upload failed, proceeding check-in without public URL (if backend supported base64)", e);
                // Fallback or error? For now let's hope upload works as backend expects photo_url
            }

            // 2. Check In
            await api.post('/attendance/check-in', {
                latitude: locationCoords.latitude,
                longitude: locationCoords.longitude,
                location_id: 'default',
                photo_url: photoUrl
            });

            closeCamera();
            await fetchTodayAttendance();

        } catch (error: any) {
            console.error('Clock in failed', error);
            const errorData = error.response?.data;
            const errorMessage = errorData?.details || errorData?.error || error.message || 'Unknown error';
            alert(`Clock in failed: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <DashboardLayout>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Clock In & Status */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Main Clock In Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center relative overflow-hidden">
                        {/* Background Blurs */}
                        <div className="absolute -top-20 -left-20 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl dark:bg-blue-600/10 pointer-events-none"></div>
                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl dark:bg-purple-600/10 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col items-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mb-6 transition-colors ${clockedIn ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                                <span className={`w-2 h-2 rounded-full mr-2 ${clockedIn ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                                {clockedIn ? 'Currently Clocked In' : 'Currently Checked Out'}
                            </span>

                            <div className="mb-8">
                                <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white tracking-tight mb-2">
                                    {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    <span className="text-2xl text-gray-400 font-medium ml-1"></span>
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400">{currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                            </div>

                            {/* Ripple & Button */}
                            <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center cursor-pointer group mb-8">
                                {/* CSS Ripple would go here, simplified for React */}
                                <div className="absolute w-full h-full rounded-full border border-indigo-500/30 animate-ping opacity-20"></div>
                                <div className="absolute w-3/4 h-3/4 rounded-full border border-indigo-500/50 animate-pulse opacity-40"></div>

                                <button
                                    onClick={initiateClockAction}
                                    disabled={loading}
                                    className={`relative w-40 h-40 md:w-48 md:h-48 rounded-full shadow-lg transform transition-transform duration-300 hover:scale-105 active:scale-95 flex flex-col items-center justify-center text-white z-20 ${clockedIn ? 'bg-gradient-to-br from-red-500 to-pink-600 shadow-red-500/30' : 'bg-gradient-to-br from-indigo-600 to-purple-600 shadow-indigo-500/30'} ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                                >
                                    {clockedIn ? <MdLogout className="text-5xl mb-1" /> : <MdTouchApp className="text-5xl mb-1" />}
                                    <span className="font-bold text-lg tracking-wider uppercase">{loading ? '...' : (clockedIn ? 'Clock Out' : 'Clock In')}</span>
                                </button>
                            </div>

                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-4 py-2 rounded-lg border border-gray-100 dark:border-gray-600">
                                <MdLocationOn className="text-green-500 text-base mr-2" />
                                Location: <span className="font-medium text-gray-700 dark:text-gray-300 ml-1">{stats.location}</span>
                                <MdCheckCircle className="text-green-500 text-base ml-2" />
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard icon={<MdLogin />} title="Clock In" value={stats.checkInTime} color="blue" />
                        <StatCard icon={<MdLogout />} title="Clock Out" value={stats.checkOutTime} color="orange" />
                        <StatCard icon={<MdSchedule />} title="Working Hrs" value="0h 02m" color="purple" />
                        <StatCard icon={<MdCoffee />} title="Break Time" value="0h 00m" color="teal" />
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                            <button onClick={() => navigate('/attendance')} className="text-sm text-primary hover:text-secondary font-medium">View All</button>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {activities.slice(0, 3).map((act, idx) => (
                                <ActivityItem
                                    key={idx}
                                    icon={act.check_out_time ? <MdLogout /> : <MdLogin />}
                                    title={act.check_out_time ? 'Clock Out' : 'Clock In'}
                                    subtitle="Office"
                                    time={new Date(act.check_out_time || act.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    type={act.check_out_time ? 'out' : 'in'}
                                    faded={!!act.check_out_time}
                                />
                            ))}
                            {activities.length === 0 && <div className="p-4 text-center text-gray-500 text-sm">No activity today</div>}
                        </div>
                    </div>
                </div>

                {/* Right Column: Cards */}
                <div className="space-y-6">

                    {/* Leave Balance */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Leave Balance</h3>
                        <div className="flex items-center justify-center relative w-48 h-48 mx-auto mb-4">
                            {/* SVG Circle Progress */}
                            <svg className="w-full h-full transform -rotate-90">
                                <circle className="text-gray-100 dark:text-gray-700" cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" strokeWidth="12"></circle>
                                <circle className="text-primary" cx="96" cy="96" fill="transparent" r="80" stroke="currentColor" strokeDasharray="502" strokeDashoffset="125" strokeLinecap="round" strokeWidth="12"></circle>
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                <span className="text-4xl font-bold text-gray-900 dark:text-white">{leavesStats.total - leavesStats.used}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Days Left</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-center">
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                <span className="block text-xs text-gray-500 dark:text-gray-400">Total Leaves</span>
                                <span className="block text-lg font-bold text-gray-900 dark:text-white">{leavesStats.total}</span>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                                <span className="block text-xs text-gray-500 dark:text-gray-400">Used</span>
                                <span className="block text-lg font-bold text-gray-900 dark:text-white">{leavesStats.used}</span>
                            </div>
                        </div>
                        <button onClick={() => navigate('/leaves')} className="w-full mt-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-primary font-medium rounded-lg transition-colors text-sm">
                            Apply for Leave
                        </button>
                    </div>

                    {/* Weekly Hours - Simplified Bar Chart */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Weekly Hours</h3>
                            <span className="text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded">On Track</span>
                        </div>
                        <div className="flex items-end justify-between h-32 gap-2 mb-2">
                            {weeklyHours.map((h, i) => (
                                <div key={i} className="w-full bg-gray-100 dark:bg-gray-700 rounded-t-lg relative group overflow-hidden">
                                    {h > 0 && (
                                        <div
                                            className={`absolute bottom-0 w-full rounded-t-lg transition-all group-hover:opacity-90 ${i === 2 ? 'bg-gradient-to-t from-primary to-secondary' : 'bg-primary/60'}`}
                                            // Visualize as percentage (assuming 10h is 100% for now)
                                            style={{ height: `${Math.min((h / 10) * 100, 100)}%` }}
                                        ></div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
                            <span>Mon</span><span>Tue</span><span className="font-bold text-primary">Wed</span><span>Thu</span><span>Fri</span>
                        </div>
                    </div>

                </div>

            </div>

            {/* Camera Modal */}
            {showCamera && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 relative">
                        <button
                            onClick={closeCamera}
                            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <MdClose className="text-2xl" />
                        </button>

                        <h3 className="text-xl font-bold mb-4 text-center dark:text-white">
                            {capturedImage ? 'Confirm Photo' : 'Take Selfie'}
                        </h3>

                        <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3] mb-4">
                            {!capturedImage ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
                            )}
                            <canvas ref={canvasRef} className="hidden" />
                        </div>

                        <div className="flex space-x-3">
                            {!capturedImage ? (
                                <button
                                    onClick={capturePhoto}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center"
                                >
                                    <MdCameraAlt className="mr-2 text-xl" /> Capture
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setCapturedImage(null);
                                            startCamera();
                                        }}
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-3 rounded-xl"
                                    >
                                        Retake
                                    </button>
                                    <button
                                        onClick={handleCheckInWithPhoto}
                                        disabled={loading}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center"
                                    >
                                        {loading ? 'Processing...' : 'Confirm Check In'}
                                    </button>
                                </>
                            )}
                        </div>
                        <p className="text-center text-xs text-gray-500 mt-4">
                            Photo is required for face verification
                        </p>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
};

const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string, color: 'blue' | 'orange' | 'purple' | 'teal' }) => {
    const colors = {
        blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
        orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
        purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
        teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex flex-col items-center justify-center border border-gray-100 dark:border-gray-700/50">
            <div className={`p-2 rounded-full mb-2 ${colors[color]}`}>
                <span className="text-xl">{icon}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mb-1">{title}</span>
            <span className="font-bold text-gray-900 dark:text-white">{value}</span>
        </div>
    );
}

const ActivityItem = ({ icon, title, subtitle, time, type, faded }: { icon: React.ReactNode, title: string, subtitle: string, time: string, type: 'in' | 'out', faded?: boolean }) => {
    return (
        <div className={`px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${faded ? 'opacity-60' : ''}`}>
            <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${type === 'in' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                    <span className="text-sm">{icon}</span>
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
                </div>
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{time}</span>
        </div>
    );
}

export default Dashboard;
