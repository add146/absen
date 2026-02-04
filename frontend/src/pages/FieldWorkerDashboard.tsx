import React, { useState, useEffect, useRef } from 'react';
import { MdAddLocation, MdLocationOn, MdCameraAlt, MdClose, MdHistory } from 'react-icons/md';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';

const FieldWorkerDashboard: React.FC = () => {
    const [visits, setVisits] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    // Visit form state
    const [visitForm, setVisitForm] = useState({
        location_name: '',
        notes: '',
        photo: null as string | null
    });

    // Camera state
    const [showCamera, setShowCamera] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        fetchTodayVisits();
        getCurrentLocation();
    }, []);

    useEffect(() => {
        if (showCamera && videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
    }, [showCamera, stream]);

    const getCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setCurrentLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => console.error('Error getting location:', error)
            );
        }
    };

    const fetchTodayVisits = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await api.get(`/visits?start_date=${today}&end_date=${today}`);
            setVisits(res.data.data || []);
        } catch (error) {
            console.error('Failed to fetch visits', error);
        }
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            setStream(mediaStream);
            setShowCamera(true);
        } catch (error) {
            console.error('Error accessing camera:', error);
            alert('Tidak dapat mengakses kamera');
        }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0);
            const photoData = canvas.toDataURL('image/jpeg', 0.8);
            setVisitForm(prev => ({ ...prev, photo: photoData }));
            stopCamera();
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setShowCamera(false);
    };

    const handleLogVisit = async () => {
        if (!currentLocation) {
            alert('Menunggu lokasi GPS...');
            return;
        }

        setLoading(true);
        try {
            await api.post('/visits/log', {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                location_name: visitForm.location_name,
                notes: visitForm.notes,
                photo: visitForm.photo
            });

            alert('Kunjungan berhasil dicatat!');
            setShowLogModal(false);
            setVisitForm({ location_name: '', notes: '', photo: null });
            fetchTodayVisits();
        } catch (error: any) {
            console.error('Failed to log visit', error);
            alert(error.response?.data?.error || 'Gagal mencatat kunjungan');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">🚗 Field Worker Dashboard</h1>
                        <p className="text-gray-600 mt-1">Catat kunjungan Anda hari ini</p>
                    </div>
                    <button
                        onClick={() => {
                            getCurrentLocation();
                            setShowLogModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg transition"
                    >
                        <MdAddLocation size={24} />
                        <span className="font-semibold">Log Kunjungan</span>
                    </button>
                </div>

                {/* GPS Status */}
                {currentLocation && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                        <MdLocationOn className="text-green-600" size={24} />
                        <div>
                            <p className="text-sm font-medium text-green-800">GPS Aktif</p>
                            <p className="text-xs text-green-600">
                                {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Today's Visits Timeline */}
                <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <MdHistory className="text-blue-600" size={28} />
                        <h2 className="text-xl font-bold text-gray-800">Kunjungan Hari Ini</h2>
                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                            {visits.length} kunjungan
                        </span>
                    </div>

                    {visits.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Belum ada kunjungan hari ini</p>
                    ) : (
                        <div className="space-y-4">
                            {visits.map((visit, idx) => (
                                <div key={visit.id} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">
                                                    #{idx + 1}
                                                </span>
                                                <span className="font-semibold text-gray-800">
                                                    {visit.location_name || 'Lokasi tidak disebutkan'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mb-2">{visit.notes || '-'}</p>
                                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                                <span>📍 {visit.latitude?.toFixed(6)}, {visit.longitude?.toFixed(6)}</span>
                                                <span>🕐 {formatTime(visit.visit_time)}</span>
                                            </div>
                                        </div>
                                        {visit.photo_url && (
                                            <div className="ml-4">
                                                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                                    <MdCameraAlt className="text-gray-400" size={24} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Log Visit Modal */}
                {showLogModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-800">Log Kunjungan Baru</h3>
                                <button
                                    onClick={() => {
                                        setShowLogModal(false);
                                        stopCamera();
                                        setVisitForm({ location_name: '', notes: '', photo: null });
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <MdClose size={28} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Location Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nama Lokasi/Tujuan
                                    </label>
                                    <input
                                        type="text"
                                        value={visitForm.location_name}
                                        onChange={e => setVisitForm({ ...visitForm, location_name: e.target.value })}
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Contoh: Toko ABC, PT XYZ"
                                    />
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Catatan
                                    </label>
                                    <textarea
                                        value={visitForm.notes}
                                        onChange={e => setVisitForm({ ...visitForm, notes: e.target.value })}
                                        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        rows={3}
                                        placeholder="Catatan kunjungan..."
                                    />
                                </div>

                                {/* Photo */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Foto (Opsional)
                                    </label>

                                    {showCamera ? (
                                        <div className="space-y-3">
                                            <video ref={videoRef} className="w-full rounded-lg" autoPlay playsInline />
                                            <canvas ref={canvasRef} className="hidden" />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={capturePhoto}
                                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg"
                                                >
                                                    Ambil Foto
                                                </button>
                                                <button
                                                    onClick={stopCamera}
                                                    className="px-4 py-2 bg-gray-200 rounded-lg"
                                                >
                                                    Batal
                                                </button>
                                            </div>
                                        </div>
                                    ) : visitForm.photo ? (
                                        <div className="space-y-2">
                                            <img src={visitForm.photo} className="w-full rounded-lg" alt="Preview" />
                                            <button
                                                onClick={() => setVisitForm({ ...visitForm, photo: null })}
                                                className="w-full bg-red-100 text-red-600 px-4 py-2 rounded-lg"
                                            >
                                                Hapus Foto
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={startCamera}
                                            className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center gap-2 hover:border-blue-500 transition"
                                        >
                                            <MdCameraAlt size={24} className="text-gray-400" />
                                            <span className="text-gray-600">Ambil Foto</span>
                                        </button>
                                    )}
                                </div>

                                {/* GPS Info */}
                                {currentLocation && (
                                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                        <p className="text-gray-600">📍 GPS:</p>
                                        <p className="text-gray-800 font-mono">
                                            {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                                        </p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    onClick={handleLogVisit}
                                    disabled={loading || !currentLocation}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition"
                                >
                                    {loading ? 'Menyimpan...' : 'Simpan Kunjungan'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default FieldWorkerDashboard;
