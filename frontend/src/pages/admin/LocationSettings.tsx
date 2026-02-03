import { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdAdd, MdLocationOn } from 'react-icons/md';

const LocationSettings = () => {
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        latitude: '',
        longitude: '',
        radius_meters: '100'
    });

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const res = await api.get('/admin/locations');
            setLocations(res.data.data);
        } catch (error) {
            console.error('Failed to fetch locations', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/admin/locations', {
                name: formData.name,
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                radius_meters: parseInt(formData.radius_meters)
            });
            setShowForm(false);
            setFormData({ name: '', latitude: '', longitude: '', radius_meters: '100' });
            fetchLocations();
            alert('Location added successfully');
        } catch (error) {
            console.error('Failed to add location', error);
            alert('Failed to add location');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Location Settings</h2>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <MdAdd size={20} />
                    <span>Add Location</span>
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                    <h3 className="text-lg font-semibold mb-4">Add New Office Location</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Location Name</label>
                            <input
                                type="text"
                                required
                                className="mt-1 w-full p-2 border rounded-lg"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Headquarters"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Latitude</label>
                                <input
                                    type="number" step="any" required
                                    className="mt-1 w-full p-2 border rounded-lg"
                                    value={formData.latitude}
                                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                    placeholder="-6.123456"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Longitude</label>
                                <input
                                    type="number" step="any" required
                                    className="mt-1 w-full p-2 border rounded-lg"
                                    value={formData.longitude}
                                    onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                    placeholder="106.123456"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Radius (Meters)</label>
                            <input
                                type="number" required
                                className="mt-1 w-full p-2 border rounded-lg"
                                value={formData.radius_meters}
                                onChange={e => setFormData({ ...formData, radius_meters: e.target.value })}
                            />
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Save Location
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loading ? <p>Loading locations...</p> : locations.map(loc => (
                    <div key={loc.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start space-x-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                            <MdLocationOn size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">{loc.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Lat: {loc.latitude}<br />
                                Lng: {loc.longitude}
                            </p>
                            <div className="mt-3 inline-block px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full">
                                Radius: {loc.radius_meters}m
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default LocationSettings;
