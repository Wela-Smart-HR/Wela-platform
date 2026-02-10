import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminSchedule } from '../../features/schedule/useAdminSchedule';

// Components
import ScheduleHeader from '../../components/admin/schedule/ScheduleHeader';
import ScheduleDailyView from '../../components/admin/schedule/ScheduleDailyView';
import ScheduleMonthlyView from '../../components/admin/schedule/ScheduleMonthlyView';
import EditShiftModal from '../../components/admin/schedule/EditShiftModal';
import ManageTodayModal from '../../components/admin/schedule/ManageTodayModal';

export default function Schedule() {
    const location = useLocation();
    const initialView = location.state?.viewMode || 'daily';

    // --- Custom Hook (Logic Layer) ---
    const { state, actions, modals } = useAdminSchedule(initialView);

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA] text-[#1E293B] font-sans">

            {/* 1. Header & View Toggle */}
            <ScheduleHeader
                viewMode={state.viewMode}
                setViewMode={actions.setViewMode}
            />

            <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 pt-4">

                {/* 2. Daily View */}
                {state.viewMode === 'daily' && (
                    <ScheduleDailyView
                        currentDate={state.currentDate}
                        changeDay={actions.changeDay}
                        workingStaff={state.workingStaff}
                        leaveStaff={state.leaveStaff}
                        offStaff={state.offStaff}
                        openEditModal={actions.openEditModal}
                        setIsManageTodayOpen={actions.setIsManageTodayOpen}
                    />
                )}

                {/* 3. Monthly View */}
                {state.viewMode === 'monthly' && (
                    <ScheduleMonthlyView
                        currentDate={state.currentDate}
                        changeMonth={actions.changeMonth}
                        changeDay={actions.changeDay}
                        setViewMode={actions.setViewMode}
                        handleAutoSchedule={actions.handleAutoSchedule}
                        loading={state.loading}
                        daysInMonth={state.daysInMonth}
                        firstDayOfMonth={state.firstDayOfMonth}
                        schedules={state.schedules}
                    />
                )}
            </main>

            {/* --- Modals --- */}

            <EditShiftModal
                isOpen={modals.isEditModalOpen}
                editingShift={modals.editingShift}
                setEditingShift={actions.setEditingShift}
                saveShiftEdit={actions.saveShiftEdit}
                setIsEditModalOpen={actions.setIsEditModalOpen}
                companyShifts={state.companyShifts}
                otTypes={state.otTypes}
                loading={state.loading}
            />

            <ManageTodayModal
                isOpen={modals.isManageTodayOpen}
                currentDate={state.currentDate}
                setIsManageTodayOpen={actions.setIsManageTodayOpen}
                manageTodayTab={modals.manageTodayTab}
                setManageTodayTab={actions.setManageTodayTab}
                bulkForm={modals.bulkForm}
                setBulkForm={actions.setBulkForm}
                executeBulkAction={actions.executeBulkAction}
                otTypes={state.otTypes}
            />
        </div>
    );
}