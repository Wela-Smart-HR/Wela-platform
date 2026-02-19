import { useState, useRef, useCallback } from 'react';
import { gpsService } from '../gps.service';

/**
 * 📍 useLocationTracking
 * จัดการเรื่อง GPS และระยะทางจากบริษัท
 * 
 * @param {Object} companyConfig - config ของบริษัท (มี location, radius)
 */
export function useLocationTracking(companyConfig) {
    const [location, setLocation] = useState(null);
    const [locationStatus, setLocationStatus] = useState('loading'); // 'loading' | 'success' | 'error' | 'out-of-range'
    const [distance, setDistance] = useState(0);
    const [gpsError, setGpsError] = useState('');
    const gpsRef = useRef(null);

    /**
     * Helper: ลอง GPS แบบ Low Accuracy (Fallback)
     */
    const startGpsTrackingLowAccuracy = useCallback((config) => {
        const { watchId, stop } = gpsService.startTracking({
            highAccuracy: false,
            onSuccess: (pos) => handleGpsSuccess(pos, config),
            onError: (errInfo) => {
                setLocationStatus('error');
                setGpsError(errInfo.message);
            }
        });
        gpsRef.current = { watchId, stop };
    }, []);

    /**
     * Helper: จัดการเมื่อได้พิกัดมาแล้ว
     */
    const handleGpsSuccess = (pos, config) => {
        // Return formatted address like legacy code
        const address = `Lat: ${pos.lat.toFixed(5)}, Lng: ${pos.lng.toFixed(5)} (±${Math.round(pos.accuracy)}m)`;
        const newLocation = { ...pos, address };
        setLocation(newLocation);

        // เช็คระยะ (ถ้ามี config)
        if (config?.location) {
            const dist = gpsService.calculateDistance(
                pos.lat, pos.lng,
                config.location.lat, config.location.lng
            );
            setDistance(Math.round(dist));

            if (dist <= (config.radius || 350)) {
                setLocationStatus('success');
            } else {
                setLocationStatus('out-of-range');
            }
        } else {
            // ไม่มี Config Location แปลว่าไม่ต้องเช็คระยะ -> ถือว่าผ่าน
            setLocationStatus('success');
            setDistance(0);
        }
    };

    /**
     * เริ่มติดตาม GPS
     */
    const startTracking = useCallback((config) => {
        // Cleanup old watcher
        if (gpsRef.current) {
            gpsRef.current.stop();
        }

        setLocationStatus('loading');
        setGpsError('');

        // 1. Quick Fix: ขอพิกัดครั้งแรกทันที (Fast)
        gpsService.getCurrentPosition(false)
            .then((pos) => handleGpsSuccess(pos, config))
            .catch(() => { /* ignore initial error, wait for watcher */ });

        // 2. Start Watcher (High Accuracy)
        const { watchId, stop } = gpsService.startTracking({
            highAccuracy: true,
            onSuccess: (pos) => handleGpsSuccess(pos, config),
            onError: (errInfo) => {
                // Fallback policy
                if (errInfo.shouldFallback) {
                    console.log('[GPS] Switching to Low Accuracy mode...');
                    startGpsTrackingLowAccuracy(config);
                } else {
                    setLocationStatus('error');
                    setGpsError(errInfo.message);
                }
            }
        });

        gpsRef.current = { watchId, stop };
    }, [startGpsTrackingLowAccuracy]);

    /**
     * ลองใหม่ (Retry)
     */
    const retryGps = useCallback(() => {
        if (gpsRef.current) gpsRef.current.stop();
        if (companyConfig) startTracking(companyConfig);
    }, [companyConfig, startTracking]);

    // Cleanup when component unmounts (managed by parent or here?)
    // Note: Usually parent manages lifetime, but we can add useEffect cleanup here if we want strictly self-contained.
    // However, in the facade pattern, we might want to control when to stop explicitly.
    // For safety, let's add a cleanup effect.
    // BUT! Since `startTracking` creates a watcher, we need to be careful not to stop it prematurely if re-renders happen.
    // We'll expose `stopTracking` if needed, but standard `useEffect` in facade usually handles unmount.
    // Let's rely on the Facade to call stop?
    // Actually, hooks should be self-contained.

    // Let's add cleanup effect that stops ONLY on unmount of using component
    // useEffect(() => {
    //    return () => {
    //        if (gpsRef.current) gpsRef.current.stop();
    //    };
    // }, []);

    return {
        location,
        locationStatus,
        distance,
        gpsError,
        startTracking,
        retryGps,
        stopTracking: () => {
            if (gpsRef.current) gpsRef.current.stop();
        }
    };
}
