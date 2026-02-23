// Fix attendance data for specific company
// Run this script to migrate missing data from legacy 'attendance' collection to new 'attendance_logs' collection

import { migrationService } from './src/features/migration/migration.service.js';

// CONFIGURE THESE VALUES
const COMPANY_ID = 'YOUR_COMPANY_ID_HERE'; // Replace with actual company ID
const MONTH_TO_MIGRATE = new Date(2026, 1, 1); // February 2026 (0-indexed month)

// Run the migration
async function fixAttendanceData() {
    try {
        console.log('Starting attendance data migration...');
        console.log(`Company ID: ${COMPANY_ID}`);
        console.log(`Month: ${MONTH_TO_MIGRATE.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`);
        
        const result = await migrationService.runDataMigration(COMPANY_ID, MONTH_TO_MIGRATE);
        
        console.log(`Migration completed! ${result} records migrated.`);
        console.log('Please check the Admin Reports section again - the data should now appear correctly.');
        
    } catch (error) {
        console.error('Migration failed:', error);
        console.log('Please check the error and try again.');
    }
}

// Execute the fix
fixAttendanceData();
