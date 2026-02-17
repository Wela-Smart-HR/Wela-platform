import React from 'react';

export const LogsTab = ({ logs }) => {

    const fmtInfo = (dateStr) => {
        const d = new Date(dateStr);
        return {
            date: d.getDate(),
            day: d.toLocaleDateString('th-TH', { weekday: 'short' })
        };
    };

    return (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden mt-2">
            <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="pl-4 py-3 text-[9px] text-gray-400 font-bold uppercase">DATE</th>
                        <th className="py-3 text-[9px] text-gray-400 font-bold uppercase">TIME</th>
                        <th className="pr-4 py-3 text-[9px] text-gray-400 font-bold uppercase text-right">DETAILS</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {!logs || logs.length === 0 ? (
                        <tr><td colSpan="3" className="text-center py-8 text-xs text-gray-400">ไม่มีข้อมูลบันทึกในรอบนี้</td></tr>
                    ) : (
                        logs.map((log, idx) => {
                            const { date, day } = fmtInfo(log.date);
                            return (
                                <tr key={idx} className="group hover:bg-blue-50/50 transition-colors">
                                    {/* Date */}
                                    <td className="pl-4 align-top py-3 w-16">
                                        <div className="flex flex-col items-center bg-gray-100 rounded-lg p-1 w-10">
                                            <span className="text-[9px] font-bold text-gray-500 uppercase">{day}</span>
                                            <span className="text-sm font-bold text-black">{date}</span>
                                        </div>
                                    </td>

                                    {/* Time */}
                                    <td className="align-top py-3">
                                        {log.status === 'absent' ? (
                                            <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded">ขาดงาน</span>
                                        ) : (
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1 text-xs font-bold text-gray-800">
                                                    {log.checkIn} - {log.checkOut}
                                                </div>
                                                <div className="flex gap-1">
                                                    {log.status === 'late' && <span className="text-[9px] text-orange-500 font-bold">มาสาย</span>}
                                                    {log.otHours > 0 && <span className="text-[9px] text-blue-500 font-bold">OT</span>}
                                                </div>
                                            </div>
                                        )}
                                    </td>

                                    {/* Details */}
                                    <td className="pr-4 align-top py-3 text-right">
                                        <div className="flex flex-col gap-1 items-end">
                                            {/* Logic to parse details from text logs or structured items */}
                                            {/* For demo, simply showing raw status or derived impacts if available */}
                                            {log.income > 0 && (
                                                <span className="text-[10px] font-bold text-green-500">+{log.income.toLocaleString()}</span>
                                            )}
                                            {log.deduction > 0 && (
                                                <span className="text-[10px] font-bold text-red-500">-{log.deduction.toLocaleString()}</span>
                                            )}
                                            {(!log.income && !log.deduction) && <span className="text-[10px] text-gray-300">-</span>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};
