import React from 'react';
import { Ghost, Plus } from '@phosphor-icons/react';

export const EmptyState = ({
    title = "ยังไม่มีข้อมูล",
    message = "เริ่มต้นสร้างรายการใหม่ได้เลย",
    onAction,
    actionLabel
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 shadow-inner">
                <Ghost size={40} weight="fill" className="text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 max-w-xs mb-6 leading-relaxed">
                {message}
            </p>
            {onAction && (
                <button
                    onClick={onAction}
                    className="bg-black text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-black/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                    <Plus weight="bold" />
                    {actionLabel}
                </button>
            )}
        </div>
    );
};
