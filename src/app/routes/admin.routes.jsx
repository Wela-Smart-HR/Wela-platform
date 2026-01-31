import React from 'react';
import { Route } from 'react-router-dom';

// Admin Pages
import Dashboard from '../../pages/admin/Dashboard';
import Schedule from '../../pages/admin/Schedule';
import Reports from '../../pages/admin/Reports';
import Payroll from '../../pages/admin/Payroll';
import Settings from '../../pages/admin/Settings';
import People from '../../pages/admin/People';
import Requests from '../../pages/admin/Requests';

/**
 * Admin Routes Configuration
 * All routes for Owner/Admin users
 */
export const adminRoutes = (
    <>
        <Route path="/" element={<Dashboard />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/people" element={<People />} />
        <Route path="/requests" element={<Requests />} />
    </>
);
