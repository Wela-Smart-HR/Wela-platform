import React, { useState, useEffect } from 'react';

const LiveClock = React.memo(({ isClockIn, locationStatus, distance }) => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const accentColor = isClockIn ? 'text-[#007AFF]' : 'text-[#FF3B30]';

    return (
        <div className="text-center relative">
            <h1 className="text-[5rem] font-bold text-[#1C1C1E] tracking-tighter tabular-nums drop-shadow-sm leading-none">
                {time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
            </h1>
            <span className={`text-sm font-bold tracking-tight mt-2 block ${accentColor}`}>
                {isClockIn ? 'Ready to Clock In' : 'Ready to Clock Out'}
            </span>
            {locationStatus === 'out-of-range' && distance && (
                <span className="text-[10px] text-orange-500 font-bold mt-1 block animate-pulse">
                    ห่างจากจุดเช็คอิน {Math.round(distance)} เมตร
                </span>
            )}
        </div>
    );
});

export default LiveClock;
