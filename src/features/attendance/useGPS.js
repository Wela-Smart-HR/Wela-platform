import { useState, useEffect, useRef } from 'react';

export const useGPS = (config = {}) => {
    const [currentLocation, setCurrentLocation] = useState(null);
    const [locationStatus, setLocationStatus] = useState('loading'); // loading, success, error, out-of-range
    const [distance, setDistance] = useState(null);
    const [gpsErrorMsg, setGpsErrorMsg] = useState('');
    const [accuracy, setAccuracy] = useState(0);

    const watchIdRef = useRef(null);
    const configRef = useRef(config);

    // Keep configRef in sync with latest props
    useEffect(() => {
        configRef.current = config;
    }, [config]);

    // Default helper to calculate distance
    const getDistanceFromLatLonInMeters = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const startGPS = (useHighAccuracy = true) => {
        if (!navigator.geolocation) {
            setLocationStatus('error');
            setGpsErrorMsg('Browser not supported');
            return;
        }

        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
        }

        setLocationStatus('loading');
        setGpsErrorMsg('');
        setDistance(null);

        const handleSuccess = (position) => {
            const { latitude, longitude, accuracy: acc } = position.coords;
            setAccuracy(acc);

            const newLoc = {
                lat: latitude,
                lng: longitude,
                address: `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)} (±${Math.round(acc)}m)`
            };
            setCurrentLocation(newLoc);

            const currentConfig = configRef.current; // Always use latest config

            if (currentConfig.targetLocation) {
                const dist = getDistanceFromLatLonInMeters(latitude, longitude, currentConfig.targetLocation.lat, currentConfig.targetLocation.lng);
                setDistance(dist);

                if (currentConfig.radius && dist <= currentConfig.radius) {
                    setLocationStatus('success');
                } else {
                    setLocationStatus('out-of-range');
                }
            } else {
                // If no target location to check against, just consider it success that we got a fix
                setLocationStatus('success');
            }
        };

        const handleError = (error) => {
            console.warn("GPS Error:", error.code, error.message);

            // Timeout with high accuracy? Try low accuracy
            if (error.code === 3 && useHighAccuracy) {
                console.log("High accuracy timeout, switching to low accuracy...");
                startGPS(false);
                return;
            }

            // Only show error if we don't have a location yet
            if (!currentLocation) {
                setLocationStatus('error');
                switch (error.code) {
                    case 1: setGpsErrorMsg('Permission Denied'); break;
                    case 2: setGpsErrorMsg('Signal Lost'); break;
                    case 3: setGpsErrorMsg('Timeout'); break;
                    default: setGpsErrorMsg('GPS Error');
                }
            }
        };

        // 1. Try to get a quick cached position first (within 30 seconds is fine for attendance usually)
        navigator.geolocation.getCurrentPosition(
            handleSuccess,
            (err) => { /* Ignore cache miss or error, let the watch take over */ },
            { enableHighAccuracy: useHighAccuracy, timeout: 2000, maximumAge: 30000 }
        );

        // 2. Start watching for updates
        watchIdRef.current = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            {
                enableHighAccuracy: useHighAccuracy,
                timeout: useHighAccuracy ? 15000 : 30000,
                maximumAge: 10000, // Accept cached positions up to 10s old
                distanceFilter: 5
            }
        );
    };

    const stopGPS = () => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
    };

    useEffect(() => {
        // Auto-start if config says so, or let user call it manually
        // Ideally, we wait for the component to call startGPS to give control
        return () => stopGPS();
    }, []);

    return {
        currentLocation,
        locationStatus,
        distance,
        accuracy,
        gpsErrorMsg,
        startGPS,
        stopGPS
    };
};
