import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { MdCameraAlt, MdCheckCircle, MdError, MdFace } from 'react-icons/md';
import { compressImage } from '../utils/imageCompression';

const FaceRegistration: React.FC = () => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'registered' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const API_URL = import.meta.env.VITE_API_URL;

    useEffect(() => {
        checkStatus();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const checkStatus = async () => {
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${API_URL}/profile/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.data?.face_registered) {
                setStatus('registered');
            }
        } catch (error) {
            console.error('Failed to check status:', error);
        }
    };

    useEffect(() => {
        if (videoRef.current && stream) {
            console.log("Attaching stream to video element");
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.error("Error playing video:", e));
        }
    }, [stream]);

    const startCamera = async () => {
        try {
            console.log("Requesting camera access...");
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' },
                audio: false
            });
            console.log("Camera access granted");
            setStream(mediaStream);
        } catch (error) {
            console.error('Error accessing camera:', error);
            setMessage('Could not access camera. Please allow permissions.');
            setStatus('error');
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                // Set canvas size to match video dimensions
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;

                context.drawImage(videoRef.current, 0, 0);
                const photoData = canvasRef.current.toDataURL('image/jpeg', 0.8);
                setImage(photoData);
                stopCamera();
            }
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleUpload = async () => {
        if (!image) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('access_token');

            // First upload image to R2 via /upload endpoint
            // Compress and convert to file
            const compressedFile = await compressImage(image);

            const formData = new FormData();
            formData.append('file', compressedFile, 'face_registration.jpg');

            const uploadRes = await axios.post(`${API_URL}/upload`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (uploadRes.data.url) {
                // Register face with URL
                await axios.post(`${API_URL}/profile/face-register`, {
                    photoUrl: uploadRes.data.url
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                setStatus('registered');
                setMessage('Face registered successfully!');
                setImage(null);
            }
        } catch (error: any) {
            console.error('Registration failed:', error);
            setStatus('error');
            setMessage(error.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
                <MdFace className="mr-2 text-blue-600" />
                Face Verification
            </h3>

            {status === 'registered' ? (
                <div className="text-center p-6 bg-green-50 rounded-lg">
                    <MdCheckCircle className="mx-auto text-green-500 text-5xl mb-3" />
                    <p className="text-green-700 font-medium">Face Registered</p>
                    <p className="text-sm text-green-600 mt-2">
                        You can now use face verification for check-in.
                    </p>
                    <button
                        onClick={() => setStatus('idle')}
                        className="mt-4 text-blue-600 text-sm hover:underline"
                    >
                        Update Photo
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <p className="text-gray-600 text-sm">
                        Register your face photo to enable secure check-in.
                        Please ensure good lighting and look directly at the camera.
                    </p>

                    <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-[4/3]">
                        {stream ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />
                        ) : image ? (
                            <img
                                src={image}
                                alt="Captured"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <MdFace className="text-gray-400 text-6xl" />
                            </div>
                        )}
                        <canvas ref={canvasRef} width="640" height="480" className="hidden" />
                    </div>

                    {message && (
                        <div className={`text-sm p-3 rounded ${status === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                            }`}>
                            {status === 'error' && <MdError className="inline mr-1" />}
                            {message}
                        </div>
                    )}

                    <div className="flex space-x-3">
                        {!stream && !image && (
                            <button
                                onClick={startCamera}
                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 flex items-center justify-center"
                            >
                                <MdCameraAlt className="mr-2" />
                                Start Camera
                            </button>
                        )}

                        {stream && (
                            <button
                                onClick={capturePhoto}
                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                            >
                                Capture
                            </button>
                        )}

                        {image && (
                            <>
                                <button
                                    onClick={() => {
                                        setImage(null);
                                        startCamera();
                                    }}
                                    className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50"
                                >
                                    Retake
                                </button>
                                <button
                                    onClick={handleUpload}
                                    disabled={loading}
                                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    {loading ? 'Saving...' : 'Save Photo'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FaceRegistration;
