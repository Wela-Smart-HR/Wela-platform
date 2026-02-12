import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAdminSchedule } from '../../features/schedule/useAdminSchedule';

// Components
import ScheduleHeader from '../../components/admin/schedule/ScheduleHeader';
import ScheduleDailyView from '../../components/admin/schedule/ScheduleDailyView';
import ScheduleMonthlyView from '../../components/admin/schedule/ScheduleMonthlyView';
import ScheduleCombinedView from '../../components/admin/schedule/ScheduleCombinedView'; // New Combined View
import EditShiftModal from '../../components/admin/schedule/EditShiftModal';
import ManageTodayModal from '../../components/admin/schedule/ManageTodayModal';
import IndividualScheduleModal from '../../components/admin/schedule/IndividualScheduleModal';

export default function Schedule() {
    const location = useLocation();
    const initialView = location.state?.viewMode || 'monthly'; // Default to Monthly now

    // Local UI State for Individual View
    const [individualViewEmployee, setIndividualViewEmployee] = React.useState(null);

    // --- Custom Hook (Logic Layer) ---
    const { state, actions, modals } = useAdminSchedule(initialView);

    // 2. Drill-down Handler (Month -> Weekly)
    const handleDateSelect = (date) => {
        actions.changeDay(date.getDate());

        // Calculate Monday of that week
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));

        actions.setWeekStart(monday);
        actions.setViewMode('weekly');
    };

    // 3. Drill-down Handler (Weekly -> Daily)
    const handleDaySelect = (date) => {
        actions.changeDay(date.getDate());
        actions.setViewMode('daily'); // Switch to Daily View
    };

    return (
        <div className="flex flex-col min-h-full bg-[#FAFAFA] text-[#1E293B] font-sans">

            {/* 1. Header & Navigation */}
            <ScheduleHeader
                viewMode={state.viewMode}
                setViewMode={actions.setViewMode}
            />

            <main className="flex-1 px-6 pb-6 pt-4">

                {/* 2. Daily View (Deep Drill-down) */}
                {state.viewMode === 'daily' && (
                    <ScheduleDailyView
                        currentDate={state.currentDate}
                        changeDay={actions.changeDay}
                        workingStaff={state.workingStaff}
                        leaveStaff={state.leaveStaff}
                        offStaff={state.offStaff}
                        openEditModal={actions.openEditModal}
                        openManageTodayModal={actions.openManageTodayModal}
                        activeEmployees={state.activeEmployees} // New
                    />
                )}

                {/* 3. Combined View (Weekly Detail) */}
                {state.viewMode === 'weekly' && (
                    <ScheduleCombinedView
                        weekStart={state.weekStart}
                        changeWeek={actions.changeWeek}
                        setWeekStart={actions.setWeekStart}
                        resetToStandardMonday={actions.resetToStandardMonday}
                        schedules={state.schedules}
                        activeEmployees={state.activeEmployees} // New
                        openEditModal={actions.openEditModal}
                        currentDate={state.currentDate}
                        changeDay={actions.changeDay}
                        onDaySelect={handleDaySelect}
                        onStaffClick={(emp) => setIndividualViewEmployee(emp)}
                        openManageTodayModal={actions.openManageTodayModal}
                    />
                )}

                {/* 4. Monthly View (Overview, Default) */}
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
                        activeEmployees={state.activeEmployees} // Fix Count
                        onDateSelect={handleDateSelect}
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
                activeEmployees={state.activeEmployees}
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
                workingStaff={state.workingStaff} // Pass for Cost Calc
            />

            <IndividualScheduleModal
                isOpen={!!individualViewEmployee}
                onClose={() => setIndividualViewEmployee(null)}
                employee={individualViewEmployee}
                currentDate={state.currentDate}
                changeMonth={actions.changeMonth}
                schedules={state.schedules}
                daysInMonth={state.daysInMonth}
                firstDayOfMonth={state.firstDayOfMonth}
                loading={state.loading}
            />
        </div>
    );
}