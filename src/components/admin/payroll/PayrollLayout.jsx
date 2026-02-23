import React from 'react';

export const PayrollLayout = ({ children }) => {
    return (
        <div className="flex flex-col min-h-full bg-[#FAFAFA] text-[#1E293B] font-sans">
            {children}
        </div>
    );
};
