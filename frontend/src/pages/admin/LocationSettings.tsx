import { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdAdd, MdLocationOn, MdEdit, MdDelete } from 'react-icons/md';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCsIPdS9shnKfJb2SVlOuWUbLq0ZC5ov3E';

// Office locations map component with Google Maps
const OfficeMap = ({
    locations,
    onMapClick,
    showClickHandler = false
}: {
    locations: any[],
    onMapClick?: (lat: number, lng: number) => void,
    showClickHandler?: boolean
}) => {
    const [selectedLocation, setSelectedLocation] = useState<any>(null);

    // Calculate center from locations, default to Jakarta if no locations
    const center = locations.length > 0
        ? { lat: locations[0].latitude, lng: locations[0].longitude }
        : { lat: -6.2088, lng: 106.8456 };

    const handleMapClick = (e: any) => {
        if (showClickHandler && onMapClick && e.detail?.latLng) {
            const lat = e.detail.latLng.lat;
            const lng = e.detail.latLng.lng;
            onMapClick(lat, lng);
        }
    };

    return (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <div className="h-[400px] w-full rounded-xl overflow-hidden border border-gray-200">
                <Map
                    defaultCenter={center}
                    defaultZoom={13}
                    onClick={handleMapClick}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    clickableIcons={false}
                >
                    {/* Display all locations with markers */}
                    {locations.map(loc => (
                        <Marker
                            key={loc.id}
                            position={{ lat: loc.latitude, lng: loc.longitude }}
                            onClick={() => setSelectedLocation(loc)}
                        />
                    ))}

                    {/* Info Window */}
                    {selectedLocation && (
                        <InfoWindow
                            position={{ lat: selectedLocation.latitude, lng: selectedLocation.longitude }}
                            onCloseClick={() => setSelectedLocation(null)}
                        >
                            <div className="p-2">
                                <strong className="text-gray-800">{selectedLocation.name}</strong><br />
                                <span className="text-xs text-gray-500">
                                    {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                                </span><br />
                                <span className="text-xs font-semibold text-blue-600">
                                    Radius: {selectedLocation.radius_meters}m
                                </span>
                            </div>
                        </InfoWindow>
                    )}
                </Map>
            </div>
        </APIProvider>
    );
};

const LocationSettings = () => {
    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
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

    const handleMapClick = (lat: number, lng: number) => {
        setFormData({
            ...formData,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6)
        });
    };

    const handleEdit = (location: any) => {
        setEditingId(location.id);
        setFormData({
            name: location.name,
            latitude: location.latitude.toString(),
            longitude: location.longitude.toString(),
            radius_meters: location.radius_meters.toString()
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"?`)) {
            return;
        }

        try {
            await api.delete(`/admin/locations/${id}`);
            fetchLocations();
            alert('Location deleted successfully');
        } catch (error: any) {
            console.error('Failed to delete location', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to delete location';
            alert(errorMessage);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                // Update existing location
                await api.put(`/admin/locations/${editingId}`, {
                    name: formData.name,
                    latitude: parseFloat(formData.latitude),
                    longitude: parseFloat(formData.longitude),
                    radius_meters: parseInt(formData.radius_meters)
                });
                alert('Location updated successfully');
            } else {
                // Create new location
                await api.post('/admin/locations', {
                    name: formData.name,
                    latitude: parseFloat(formData.latitude),
                    longitude: parseFloat(formData.longitude),
                    radius_meters: parseInt(formData.radius_meters)
                });
                alert('Location added successfully');
            }
            setShowForm(false);
            setEditingId(null);
            setFormData({ name: '', latitude: '', longitude: '', radius_meters: '100' });
            fetchLocations();
        } catch (error: any) {
            console.error('Failed to save location', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to save location';
            alert(errorMessage);
        }
    };

    const handleCancelEdit = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: '', latitude: '', longitude: '', radius_meters: '100' });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Location Settings</h2>
                <button
                    onClick={() => {
                        setEditingId(null);
                        setFormData({ name: '', latitude: '', longitude: '', radius_meters: '100' });
                        setShowForm(!showForm);
                    }}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                    <MdAdd size={20} />
                    <span>Add Location</span>
                </button>
            </div>

            {/* Map View */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">📍 Office Locations Map</h3>
                {loading ? (
                    <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Loading map...</p>
                    </div>
                ) : (
                    <>
                        <OfficeMap
                            locations={locations}
                            onMapClick={showForm ? handleMapClick : undefined}
                            showClickHandler={showForm}
                        />
                        {showForm && (
                            <p className="text-sm text-blue-600 mt-2">
                                💡 Tip: Click on the map to automatically fill coordinates
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Add/Edit Location Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                    <h3 className="text-lg font-semibold mb-4">
                        {editingId ? 'Edit Office Location' : 'Add New Office Location'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Location Name</label>
                            <input
                                type="text"
                                required
                                className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                    className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={formData.latitude}
                                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                    placeholder="-6.123456"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Longitude</label>
                                <input
                                    type="number" step="any" required
                                    className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={formData.radius_meters}
                                onChange={e => setFormData({ ...formData, radius_meters: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Geofence radius for attendance validation</p>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                            >
                                {editingId ? 'Update Location' : 'Save Location'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Location Cards Grid */}
            {locations.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Saved Locations</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {locations.map(loc => (
                            <div key={loc.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4 flex-1">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                            <MdLocationOn size={24} />
                                        </div>
                                        <div className="flex-1">
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
                                    <div className="flex space-x-2 ml-4">
                                        <button
                                            onClick={() => handleEdit(loc)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                            title="Edit location"
                                        >
                                            <MdEdit size={20} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(loc.id, loc.name)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                            title="Delete location"
                                        >
                                            <MdDelete size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationSettings;
