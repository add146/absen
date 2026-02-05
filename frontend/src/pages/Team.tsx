import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import api from '../services/api';
import { MdSearch, MdPerson } from 'react-icons/md';

interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    face_photo_url?: string;
    created_at: string;
}

const Team: React.FC = () => {
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchTeam();
    }, []);

    const fetchTeam = async () => {
        try {
            const res = await api.get('/auth/team');
            setMembers(res.data.data);
        } catch (error) {
            console.error('Failed to fetch team', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tim Saya</h1>
                <p className="text-gray-500 dark:text-gray-400">Daftar rekan kerja dalam organisasi Anda</p>
            </div>

            {/* Search Bar */}
            <div className="mb-6 relative max-w-md">
                <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl" />
                <input
                    type="text"
                    placeholder="Cari nama atau email..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
                            <div className="flex items-center space-x-4">
                                <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMembers.map((member) => (
                        <div key={member.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow group">
                            <div className="flex items-center space-x-4">
                                <div className="relative">
                                    {member.face_photo_url ? (
                                        <img
                                            src={member.face_photo_url}
                                            alt={member.name}
                                            className="h-14 w-14 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm"
                                        />
                                    ) : (
                                        <div className="h-14 w-14 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-xl border-2 border-white dark:border-gray-700">
                                            {member.name.charAt(0)}
                                        </div>
                                    )}
                                    <div className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-800 ${member.role === 'owner' || member.role === 'super_admin' ? 'bg-purple-500' : (member.role === 'admin' ? 'bg-blue-500' : 'bg-green-500')}`}></div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{member.name}</h3>
                                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                        <MdPerson className="mr-1 text-xs" />
                                        <span className="capitalize">{member.role.replace('_', ' ')}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1 truncate max-w-[150px]" title={member.email}>{member.email}</p>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredMembers.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                            <p>Tidak ada anggota tim yang ditemukan {searchTerm && `untuk "${searchTerm}"`}</p>
                        </div>
                    )}
                </div>
            )}
        </DashboardLayout>
    );
};

export default Team;
