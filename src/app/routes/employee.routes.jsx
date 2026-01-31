import React from 'react';
import { Route } from 'react-router-dom';

// Employee Pages
import Connect from '../../pages/employee/Connect';
import TimeAttendance from '../../pages/employee/TimeAttendance';
import MyRequests from '../../pages/employee/MyRequests';
import Payslip from '../../pages/employee/Payslip';
import Profile from '../../pages/employee/Profile';
import MyWork from '../../pages/employee/MyWork';

/**
 * Employee Routes Configuration
 * All routes for Employee users
 */
export const employeeRoutes = (
    <>
        <Route index element={<Connect />} />
        <Route path="time" element={<TimeAttendance />} />
        <Route path="requests" element={<MyRequests />} />
        <Route path="payslip" element={<Payslip />} />
        <Route path="profile" element={<Profile />} />
        <Route path="my-work" element={<MyWork />} />
    </>
);
