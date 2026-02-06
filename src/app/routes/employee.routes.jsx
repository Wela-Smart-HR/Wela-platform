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
export const employeeRoutes = [
    { index: true, element: <Connect /> },
    { path: "time", element: <TimeAttendance /> },
    { path: "requests", element: <MyRequests /> },
    { path: "payslip", element: <Payslip /> },
    { path: "profile", element: <Profile /> },
    { path: "my-work", element: <MyWork /> }
];
