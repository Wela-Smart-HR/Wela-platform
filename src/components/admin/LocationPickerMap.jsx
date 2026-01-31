import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin, MagnifyingGlass, X, NavigationArrow } from '@phosphor-icons/react';

// --- Custom Icon ---
const createIcon = (iconComponent, color) => {
    const iconHtml = renderToStaticMarkup(iconComponent);
    return L.divIcon({
        html: `<div class="drop-shadow-lg transform -translate-y-1/2" style="color: ${color};">${iconHtml}</div>`,
        className: 'custom-leaflet-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 40],
    });
};

const PinIcon = createIcon(<MapPin weight="fill" size={40} />, '#EF4444');

// --- Map Click Handler ---
const LocationMarker = ({ position, setPosition }) => {
    const map = useMap(); // Get map instance

    useMapEvents({
        click(e) {
            setPosition(e.latlng);
            // Close search results when clicking on map
            setResults && setResults([]);
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, 16, { animate: true });
        }
    }, [position, map]);

    return position ? <Marker position={position} icon={PinIcon} /> : null;
};

export default function LocationPickerMap({ isOpen, onClose, onConfirm, initialLocation }) {
    const [position, setPosition] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const isSelectionRef = useRef(false); // ✅ Track selection to prevent auto-search

    // Reset position when modal opens
    useEffect(() => {
        if (isOpen && initialLocation?.lat && initialLocation?.lng) {
            setPosition({ lat: initialLocation.lat, lng: initialLocation.lng });
        }
    }, [isOpen, initialLocation]);

    // --- Debounced Search (Autocomplete) ---
    useEffect(() => {
        const timerId = setTimeout(async () => {
            if (!searchQuery.trim() || searchQuery.length < 2) {
                setResults([]);
                return;
            }

            // ✅ Only skip if this update was triggered by selection
            if (isSelectionRef.current) {
                isSelectionRef.current = false;
                return;
            }

            setIsSearching(true);
            try {
                const response = await fetch(
                    `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=5&lang=en`
                );
                const data = await response.json();

                const mappedResults = data.features.map(f => ({
                    lat: f.geometry.coordinates[1],
                    lon: f.geometry.coordinates[0],
                    display_name: [f.properties.name, f.properties.city, f.properties.state].filter(Boolean).join(', ')
                }));
                setResults(mappedResults);
            } catch (err) {
                console.error("Auto-search error", err);
            } finally {
                setIsSearching(false);
            }
        }, 800); // Wait 800ms after stopping typing

        return () => clearTimeout(timerId);
    }, [searchQuery]);

    // --- Manual Search (Enter / Button) ---
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        // Force strictly new search
        setIsSearching(true);
        try {
            const response = await fetch(
                `https://photon.komoot.io/api/?q=${encodeURIComponent(searchQuery)}&limit=1`
            );
            const data = await response.json();

            if (data.features && data.features.length > 0) {
                const first = data.features[0];
                const lat = first.geometry.coordinates[1];
                const lon = first.geometry.coordinates[0];
                const name = [first.properties.name, first.properties.city].filter(Boolean).join(', ');

                // Set flag to prevent re-opening list
                isSelectionRef.current = true;
                setPosition({ lat, lng: lon });
                setSearchQuery(name); // Auto-fill full name
                setResults([]); // Close list
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectResult = (item) => {
        isSelectionRef.current = true; // ✅ Mark as selection
        setPosition({ lat: item.lat, lng: item.lon });
        setResults([]);
        setSearchQuery(item.display_name.split(',')[0]);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Card */}
            <div className="bg-white w-full h-full sm:w-[800px] sm:h-[90vh] sm:rounded-2xl shadow-2xl relative z-10 flex flex-col overflow-hidden animate-zoom-in">

                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-white shrink-0 z-20 shadow-sm">
                    <div className="flex-1 relative">
                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                placeholder="ค้นหาสถานที่ (เช่น บิ๊กซี, เซ็นทรัล...)"
                                className="w-full pl-4 pr-12 py-2.5 bg-slate-100 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition shadow-sm"
                            >
                                {isSearching ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <MagnifyingGlass weight="bold" size={16} />
                                )}
                            </button>
                            {results.length > 0 && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden divide-y divide-slate-50 max-h-60 overflow-y-auto">
                                    {results.map((item, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSelectResult(item)}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm text-slate-700 truncate transition-colors flex items-center gap-2"
                                        >
                                            <MapPin size={14} className="text-slate-400" />
                                            {item.display_name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </form>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
                        <X size={24} weight="bold" />
                    </button>
                </div>

                {/* Map Area */}
                <div className="flex-1 relative bg-slate-200">
                    <MapContainer
                        center={position || [13.7563, 100.5018]} // Default to Bangkok
                        zoom={13}
                        style={{ height: "100%", width: "100%" }}
                        zoomControl={false}
                    >
                        <TileLayer
                            attribution='&copy; OpenStreetMap'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationMarker position={position} setPosition={setPosition} />
                    </MapContainer>

                    {/* Hint */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg text-xs font-bold text-slate-600 pointer-events-none z-[400] flex items-center gap-2">
                        <MapPin weight="fill" className="text-red-500" />
                        จิ้มบนแผนที่ เพื่อปักหมุดตำแหน่งร้าน
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
                    <div className="text-xs text-slate-500">
                        {position ? `Selected: ${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}` : 'No location selected'}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-5 py-2 rounded-full text-sm font-bold text-slate-600 hover:bg-slate-100 transition">
                            ยกเลิก
                        </button>
                        <button
                            onClick={() => {
                                if (position) {
                                    onConfirm(position);
                                    onClose();
                                }
                            }}
                            disabled={!position}
                            className="px-6 py-2 rounded-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
                        >
                            <NavigationArrow weight="bold" />
                            ใช้ตำแหน่งนี้
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
