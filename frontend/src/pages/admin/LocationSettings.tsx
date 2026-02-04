import { useEffect, useState } from 'react';
import api from '../../services/api';
import { MdAdd, MdLocationOn, MdEdit, MdDelete, MdLayers, MdRadioButtonUnchecked } from 'react-icons/md';
import { APIProvider, Map, Marker, InfoWindow, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';

declare var google: any;

const GOOGLE_MAPS_API_KEY = 'AIzaSyCsIPdS9shnKfJb2SVlOuWUbLq0ZC5ov3E';

// Component to handle Polygon Drawing
const MapDrawingManager = ({
    type,
    onPolygonComplete,
    onCenterChanged
}: {
    type: 'radius' | 'polygon',
    onPolygonComplete: (path: any[]) => void,
    onCenterChanged?: (lat: number, lng: number) => void
}) => {
    const map = useMap();
    const drawingLib = useMapsLibrary('drawing');
    const [drawingManager, setDrawingManager] = useState<any | null>(null);
    const [currentPolygon, setCurrentPolygon] = useState<any | null>(null);

    useEffect(() => {
        if (!map || !drawingLib) return;

        const manager = new drawingLib.DrawingManager({
            drawingMode: type === 'polygon' ? google.maps.drawing.OverlayType.POLYGON : null,
            drawingControl: type === 'polygon',
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [google.maps.drawing.OverlayType.POLYGON],
            },
            polygonOptions: {
                fillColor: '#3b82f6',
                fillOpacity: 0.3,
                strokeWeight: 2,
                clickable: true,
                editable: true,
                zIndex: 1,
            },
        });

        manager.setMap(map);
        setDrawingManager(manager);

        return () => {
            manager.setMap(null);
        };
    }, [map, drawingLib, type]);

    useEffect(() => {
        if (!drawingManager) return;

        if (type === 'polygon') {
            drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        } else {
            drawingManager.setDrawingMode(null);
            // If switching to radius, maybe clear polygon? 
            // For now, let's leave it unless manually cleared or saved.
        }

        const polygonCompleteListener = google.maps.event.addListener(
            drawingManager,
            'polygoncomplete',
            (polygon: any) => {
                // Remove previous polygon if exists (to enforce single polygon per location for now)
                if (currentPolygon) {
                    currentPolygon.setMap(null);
                }
                setCurrentPolygon(polygon);

                // Get path
                const path = polygon.getPath().getArray().map((coord: any) => ({
                    lat: coord.lat(),
                    lng: coord.lng()
                }));
                onPolygonComplete(path);

                // Add listener for edits
                google.maps.event.addListener(polygon.getPath(), 'set_at', () => {
                    const updatedPath = polygon.getPath().getArray().map((coord: any) => ({
                        lat: coord.lat(),
                        lng: coord.lng()
                    }));
                    onPolygonComplete(updatedPath);
                });
                google.maps.event.addListener(polygon.getPath(), 'insert_at', () => {
                    const updatedPath = polygon.getPath().getArray().map((coord: any) => ({
                        lat: coord.lat(),
                        lng: coord.lng()
                    }));
                    onPolygonComplete(updatedPath);
                });
            }
        );

        return () => {
            google.maps.event.removeListener(polygonCompleteListener);
        };
    }, [drawingManager, type, currentPolygon, onPolygonComplete]);

    // Listen for map click to update center coordinates for Radius mode
    useEffect(() => {
        if (!map || type !== 'radius') return;

        const clickListener = map.addListener('click', (e: any) => {
            if (e.latLng && onCenterChanged) {
                onCenterChanged(e.latLng.lat(), e.latLng.lng());
            }
        });

        return () => {
            google.maps.event.removeListener(clickListener);
        }
    }, [map, type, onCenterChanged]);

    return null;
};

// Simple Polygon visualizer for existing locations
const ExistingPolygon = ({ coords }: { coords: any[] }) => {
    const map = useMap();

    useEffect(() => {
        if (!map || !coords) return;

        const polygon = new google.maps.Polygon({
            paths: coords,
            strokeColor: '#22c55e',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#22c55e',
            fillOpacity: 0.35
        });

        polygon.setMap(map);

        return () => {
            polygon.setMap(null);
        }
    }, [map, coords]);

    return null;
}

// Helper for Circle Visualization


// Circle Component for checking radius
const RadiusCircle = ({ center, radius }: { center: { lat: number, lng: number }, radius: number }) => {
    const map = useMap();
    const [circle, setCircle] = useState<any | null>(null);

    useEffect(() => {
        if (!map) return;

        const newCircle = new google.maps.Circle({
            strokeColor: "#3b82f6",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#3b82f6",
            fillOpacity: 0.20,
            map,
            center,
            radius,
        });

        setCircle(newCircle);

        return () => {
            newCircle.setMap(null);
        };
    }, [map]);

    useEffect(() => {
        if (circle) {
            circle.setCenter(center);
            circle.setRadius(radius);
        }
    }, [circle, center, radius]);

    return null;
}

const OfficeMap = ({
    locations,
    isEditing,
    editType,
    editData, // Pass current form data for visualization
    onPolygonUpdate,
    onLocationSelect
}: {
    locations: any[],
    isEditing: boolean,
    editType: 'radius' | 'polygon',
    editData?: { latitude: number, longitude: number, radius: number },
    onPolygonUpdate: (path: any[]) => void,
    onLocationSelect: (lat: number, lng: number) => void
}) => {
    const [selectedLocation, setSelectedLocation] = useState<any>(null);

    // Calculate center from locations
    const center = locations.length > 0
        ? { lat: locations[0].latitude, lng: locations[0].longitude }
        : { lat: -6.2088, lng: 106.8456 };

    return (
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['drawing', 'geometry']}>
            <div className="h-[500px] w-full rounded-xl overflow-hidden border border-gray-200 relative">
                <Map
                    defaultCenter={center}
                    defaultZoom={13}
                    gestureHandling="greedy"
                    disableDefaultUI={false}
                    mapId="DEMO_MAP_ID"
                    onClick={(e) => {
                        if (isEditing && editType === 'radius' && e.detail.latLng) {
                            onLocationSelect(e.detail.latLng.lat, e.detail.latLng.lng);
                        }
                    }}
                >
                    {/* Drawing Manager for Edit Mode */}
                    {isEditing && (
                        <>
                            <MapDrawingManager
                                type={editType}
                                onPolygonComplete={onPolygonUpdate}
                                onCenterChanged={onLocationSelect}
                            />
                            {/* Visualize Selected Point and Radius being edited */}
                            {editType === 'radius' && editData && editData.latitude && editData.longitude && (
                                <>
                                    <Marker
                                        position={{ lat: editData.latitude, lng: editData.longitude }}
                                        draggable
                                        onDragEnd={(e) => {
                                            if (e.latLng) onLocationSelect(e.latLng.lat(), e.latLng.lng());
                                        }}
                                    />
                                    <RadiusCircle
                                        center={{ lat: editData.latitude, lng: editData.longitude }}
                                        radius={editData.radius}
                                    />
                                </>
                            )}
                        </>
                    )}

                    {/* Display existing locations */}
                    {locations.map(loc => (
                        <div key={loc.id}>
                            <Marker
                                position={{ lat: loc.latitude, lng: loc.longitude }}
                                onClick={() => setSelectedLocation(loc)}
                            />
                            {loc.polygon_coords ? (
                                <ExistingPolygon coords={typeof loc.polygon_coords === 'string' ? JSON.parse(loc.polygon_coords) : loc.polygon_coords} />
                            ) : (
                                loc.radius_meters && (
                                    <RadiusCircle center={{ lat: loc.latitude, lng: loc.longitude }} radius={loc.radius_meters} />
                                )
                            )}
                        </div>
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
                                {selectedLocation.polygon_coords ? (
                                    <span className="text-xs font-semibold text-purple-600">Polygon Geofence</span>
                                ) : (
                                    <span className="text-xs font-semibold text-blue-600">
                                        Radius: {selectedLocation.radius_meters}m
                                    </span>
                                )}
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
    const [geofenceType, setGeofenceType] = useState<'radius' | 'polygon'>('radius');

    const [formData, setFormData] = useState({
        name: '',
        latitude: '',
        longitude: '',
        radius_meters: '100',
        polygon_coords: [] as any[]
    });

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const res = await api.get('/admin/locations');
            const data = res.data.data.map((loc: any) => ({
                ...loc,
                polygon_coords: loc.polygon_coords ? (typeof loc.polygon_coords === 'string' ? JSON.parse(loc.polygon_coords) : loc.polygon_coords) : null
            }));
            setLocations(data);
        } catch (error) {
            console.error('Failed to fetch locations', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLocationSelect = (lat: number, lng: number) => {
        setFormData(prev => ({
            ...prev,
            latitude: lat.toFixed(6),
            longitude: lng.toFixed(6)
        }));
    };

    const handlePolygonUpdate = (path: any[]) => {
        setFormData(prev => ({
            ...prev,
            polygon_coords: path,
            // Automatically set center to first point of polygon if not set
            latitude: path[0].lat.toFixed(6),
            longitude: path[0].lng.toFixed(6)
        }));
    };

    const handleEdit = (location: any) => {
        setEditingId(location.id);
        const isPolygon = !!location.polygon_coords;
        setGeofenceType(isPolygon ? 'polygon' : 'radius');

        setFormData({
            name: location.name,
            latitude: location.latitude.toString(),
            longitude: location.longitude.toString(),
            radius_meters: location.radius_meters?.toString() || '100',
            polygon_coords: location.polygon_coords || []
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
            alert('Failed to delete location');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                name: formData.name,
                latitude: parseFloat(formData.latitude),
                longitude: parseFloat(formData.longitude),
                radius_meters: parseInt(formData.radius_meters),
                polygon_coords: geofenceType === 'polygon' ? formData.polygon_coords : null
            };

            if (editingId) {
                await api.put(`/admin/locations/${editingId}`, payload);
                alert('Location updated successfully');
            } else {
                await api.post('/admin/locations', payload);
                alert('Location added successfully');
            }

            resetForm();
            fetchLocations();
        } catch (error: any) {
            console.error('Failed to save location', error);
            alert('Failed to save location');
        }
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setGeofenceType('radius');
        setFormData({ name: '', latitude: '', longitude: '', radius_meters: '100', polygon_coords: [] });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Location Settings & Geofencing</h2>
                <button
                    onClick={() => {
                        resetForm();
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
                <p className="text-sm text-gray-500 mb-4">
                    {showForm ?
                        (geofenceType === 'radius' ? "Click on map to set center point." : "Use drawing tools to draw polygon area.")
                        : "View existing geofences."}
                </p>

                {loading ? (
                    <div className="h-[400px] flex items-center justify-center bg-gray-50 rounded-lg">
                        <p className="text-gray-500">Loading map...</p>
                    </div>
                ) : (
                    <OfficeMap
                        locations={locations}
                        isEditing={showForm}
                        editType={geofenceType}
                        editData={{
                            latitude: parseFloat(formData.latitude),
                            longitude: parseFloat(formData.longitude),
                            radius: parseInt(formData.radius_meters) || 100
                        }}
                        onPolygonUpdate={handlePolygonUpdate}
                        onLocationSelect={handleLocationSelect}
                    />
                )}
                <p className="text-xs text-gray-400 mt-2 italic text-center">
                    * GPS accuracy varies between 5 - 20 meters depending on device and location.
                </p>
            </div>

            {/* Add/Edit Location Form */}
            {showForm && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
                    <h3 className="text-lg font-semibold mb-4">
                        {editingId ? 'Edit Location' : 'Add New Location'}
                    </h3>

                    {/* Type Toggle */}
                    <div className="flex space-x-4 mb-6">
                        <button
                            type="button"
                            onClick={() => setGeofenceType('radius')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition ${geofenceType === 'radius'
                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                : 'bg-white border-gray-200 text-gray-600'
                                }`}
                        >
                            <MdRadioButtonUnchecked />
                            <span>Simple Radius (Circle)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setGeofenceType('polygon')}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition ${geofenceType === 'polygon'
                                ? 'bg-blue-50 border-blue-500 text-blue-700'
                                : 'bg-white border-gray-200 text-gray-600'
                                }`}
                        >
                            <MdLayers />
                            <span>Advanced Polygon</span>
                        </button>
                    </div>

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
                                <label className="block text-sm font-medium text-gray-700">Center Latitude</label>
                                <input
                                    type="number" step="any" required
                                    className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                                    value={formData.latitude}
                                    onChange={e => setFormData({ ...formData, latitude: e.target.value })}
                                    placeholder="-6.123456"
                                    readOnly={geofenceType === 'polygon'} // Read only in polygon mode, auto-filled
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Center Longitude</label>
                                <input
                                    type="number" step="any" required
                                    className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                                    value={formData.longitude}
                                    onChange={e => setFormData({ ...formData, longitude: e.target.value })}
                                    placeholder="106.123456"
                                    readOnly={geofenceType === 'polygon'}
                                />
                            </div>
                        </div>

                        {geofenceType === 'radius' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Radius (Meters)</label>
                                <input
                                    type="number" required
                                    className="mt-1 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={formData.radius_meters}
                                    onChange={e => setFormData({ ...formData, radius_meters: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">Check-in allowed within this radius.</p>
                            </div>
                        )}

                        {geofenceType === 'polygon' && (
                            <div className="p-3 bg-purple-50 text-purple-700 rounded-lg text-sm">
                                <strong>Polygon Mode Active:</strong> Draw a shape on the map to define the detailed geofence area.
                                {formData.polygon_coords.length > 0 ? (
                                    <span className="block mt-1">✅ {formData.polygon_coords.length} points defined.</span>
                                ) : (
                                    <span className="block mt-1">⚠️ No valid polygon drawn yet.</span>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                type="button"
                                onClick={resetForm}
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
                                        <div className={`p-3 rounded-lg ${loc.polygon_coords ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {loc.polygon_coords ? <MdLayers size={24} /> : <MdLocationOn size={24} />}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800">{loc.name}</h3>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Lat: {loc.latitude}<br />
                                                Lng: {loc.longitude}
                                            </p>
                                            <div className={`mt-3 inline-block px-3 py-1 text-xs font-semibold rounded-full ${loc.polygon_coords ? 'bg-purple-100 text-purple-800' : 'bg-green-50 text-green-700'}`}>
                                                {loc.polygon_coords ? 'Polygon Geofence' : `Radius: ${loc.radius_meters}m`}
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
