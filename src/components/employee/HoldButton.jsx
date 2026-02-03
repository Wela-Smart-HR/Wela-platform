import React, { useState, useRef, useEffect } from 'react';
import { Fingerprint } from '@phosphor-icons/react';

const HoldButton = ({ onAction, disabled, isClockIn }) => {
    const [isHolding, setIsHolding] = useState(false);
    const [completed, setCompleted] = useState(false);
    const actionTimeoutRef = useRef(null);
    const HOLD_DURATION = 1500; // 1.5 seconds

    // Style configs
    const accentColor = isClockIn ? 'text-[#007AFF]' : 'text-[#FF3B30]';
    const ringColor = isClockIn ? '#007AFF' : '#FF3B30';
    const glowColor = isClockIn ? 'shadow-[0_20px_50px_-12px_rgba(0,122,255,0.3)]' : 'shadow-[0_20px_50px_-12px_rgba(255,59,48,0.3)]';

    // SVG Configs
    const btnSize = 340;
    const radius = 135;
    const circumference = 2 * Math.PI * radius;

    useEffect(() => {
        return () => {
            if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);
        };
    }, []);

    const startHold = (e) => {
        // Prevent generic issues, but allow default touch behavior if needed
        if (disabled || completed) return;
        setIsHolding(true);

        // Set timeout to trigger action ONLY after animation finishes
        actionTimeoutRef.current = setTimeout(() => {
            setCompleted(true);
            if (navigator.vibrate) navigator.vibrate(200); // Stronger feedback
            onAction();

            // Reset after a brief delay
            setTimeout(() => {
                setCompleted(false);
                setIsHolding(false);
            }, 500);
        }, HOLD_DURATION);
    };

    const cancelHold = () => {
        if (completed) return; // If already done, don't cancel

        setIsHolding(false);
        if (actionTimeoutRef.current) {
            clearTimeout(actionTimeoutRef.current);
            actionTimeoutRef.current = null;
        }
    };

    return (
        <div className="relative group flex items-center justify-center select-none touch-none">
            {/* SVG Ring with CSS Animation */}
            <svg width={btnSize} height={btnSize} className="-rotate-90 transform drop-shadow-lg absolute pointer-events-none">
                {/* Background Track */}
                <circle cx={btnSize / 2} cy={btnSize / 2} r={radius} fill="none" stroke="#E5E5EA" strokeWidth="8" strokeLinecap="round" />

                {/* Active Progress Ring */}
                <circle
                    cx={btnSize / 2} cy={btnSize / 2} r={radius} fill="none"
                    stroke={ringColor} strokeWidth="8"
                    strokeLinecap="round" strokeDasharray={circumference}
                    strokeDashoffset={isHolding ? 0 : circumference}
                    className="transition-[stroke-dashoffset] ease-linear"
                    style={{
                        transitionDuration: isHolding ? `${HOLD_DURATION}ms` : '300ms',
                        strokeDashoffset: isHolding ? 0 : circumference // CSS Controls animation now!
                    }}
                />
            </svg>

            {/* Hold Button Target */}
            <div
                className="z-10 cursor-pointer"
                onMouseDown={startHold}
                onMouseUp={cancelHold}
                onMouseLeave={cancelHold}
                onTouchStart={startHold}
                onTouchEnd={cancelHold}
                onTouchCancel={cancelHold}
                onContextMenu={(e) => e.preventDefault()} // Disable right click
            >
                <div
                    className={`w-60 h-60 rounded-full bg-white flex items-center justify-center transition-all duration-300 ${glowColor} 
                    ${isHolding ? 'scale-95 shadow-[inset_0_4px_12px_rgba(0,0,0,0.05)]' : 'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] hover:scale-105'}
                    ${disabled ? 'opacity-50 grayscale cursor-not-allowed' : ''} 
                    `}
                >
                    <div className="flex flex-col items-center gap-2 pointer-events-none">
                        <Fingerprint weight="fill" className={`w-28 h-28 transition-colors duration-300 ${accentColor} ${isHolding ? 'animate-pulse' : ''}`} />
                        <span className="text-[11px] font-bold text-slate-300 tracking-[0.2em] uppercase mt-2">
                            {completed ? "COMPLETED" : (isHolding ? "HOLDING..." : "HOLD")}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HoldButton;
