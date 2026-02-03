import React, { useState, useEffect } from 'react';
import { MdPerson, MdEmail, MdPhone, MdEdit } from 'react-icons/md';
import FaceRegistration from '../components/FaceRegistration';
import DashboardLayout from '../components/DashboardLayout';

interface UserProfile {
    name: string;
    email: string;
    phone: string;
    department: string;
    role: string;
}

const Profile: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            // If endpoint doesn't exist yet, we rely on local storage for now
            // const response = await axios.get(`${API_URL}/auth/me`, { 
            //   headers: { Authorization: `Bearer ${token}` }
            // });

            const userData = localStorage.getItem('user_data');
            if (userData) {
                setProfile(JSON.parse(userData));
            }
        } catch (error) {
            console.error('Failed to load profile', error);
            const userData = localStorage.getItem('user_data');
            if (userData) {
                setProfile(JSON.parse(userData));
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <DashboardLayout>
            <div className="bg-blue-600 rounded-xl pb-16 pt-8 px-4 mb-8">
                <div className="text-center text-white">
                    <div className="w-20 h-20 bg-white/20 rounded-full mx-auto flex items-center justify-center text-4xl mb-4 backdrop-blur-sm">
                        {profile?.name?.charAt(0) || <MdPerson />}
                    </div>
                    <h1 className="text-2xl font-bold">{profile?.name}</h1>
                    <p className="opacity-80">{profile?.role} - {profile?.department}</p>
                </div>
            </div>

            <div className="max-w-md mx-auto px-4 -mt-16 space-y-6 relative z-10">
                {/* Profile Info Card */}
                <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-gray-900">Personal Info</h3>
                        <button className="text-blue-600">
                            <MdEdit />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center text-gray-600">
                            <MdEmail className="mr-3 text-gray-400" />
                            <span>{profile?.email}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                            <MdPhone className="mr-3 text-gray-400" />
                            <span>{profile?.phone || 'No phone number'}</span>
                        </div>
                    </div>
                </div>

                {/* Face Verification Card */}
                <FaceRegistration />
            </div>
        </DashboardLayout>
    );
};

export default Profile;
