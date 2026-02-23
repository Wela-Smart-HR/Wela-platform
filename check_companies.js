// Check attendance data for specific companies
// This script will check if data exists in both legacy and new collections

const { db } = require('./src/shared/lib/firebase');
const { collection, query, where, getDocs } = require('firebase/firestore');

// Companies to check
const COMPANIES_TO_CHECK = ['comp_1764954200820', 'COMP-1768062566486'];
const MONTH_TO_CHECK = new Date(2026, 1, 1); // February 2026

async function checkCompanyData(companyId) {
    console.log(`\n=== Checking Company: ${companyId} ===`);
    
    try {
        // Calculate date range
        const year = MONTH_TO_CHECK.getFullYear();
        const month = String(MONTH_TO_CHECK.getMonth() + 1).padStart(2, '0');
        const startStr = `${year}-${month}-01`;
        const endStr = `${year}-${month}-28`;
        
        console.log(`Date range: ${startStr} to ${endStr}`);
        
        // 1. Check LEGACY collection (attendance)
        console.log('\n--- LEGACY Collection (attendance) ---');
        const legacyQuery = query(
            collection(db, 'attendance'),
            where('companyId', '==', companyId),
            where('date', '>=', startStr),
            where('date', '<=', endStr)
        );
        
        const legacySnap = await getDocs(legacyQuery);
        console.log(`Found ${legacySnap.size} records in legacy collection`);
        
        // Group by date for better analysis
        const legacyByDate = {};
        legacySnap.forEach(doc => {
            const data = doc.data();
            const date = data.date;
            if (!legacyByDate[date]) {
                legacyByDate[date] = [];
            }
            legacyByDate[date].push({
                id: doc.id,
                userId: data.userId,
                type: data.type || data.actionType,
                time: data.localTimestamp || data.time
            });
        });
        
        // Show daily breakdown
        Object.keys(legacyByDate).sort().forEach(date => {
            const records = legacyByDate[date];
            console.log(`  ${date}: ${records.length} records (${records.map(r => r.type).join(', ')})`);
        });
        
        // 2. Check NEW collection (attendance_logs)
        console.log('\n--- NEW Collection (attendance_logs) ---');
        const newQuery = query(
            collection(db, 'attendance_logs'),
            where('company_id', '==', companyId),
            where('shift_date', '>=', startStr),
            where('shift_date', '<=', endStr)
        );
        
        const newSnap = await getDocs(newQuery);
        console.log(`Found ${newSnap.size} records in new collection`);
        
        // Group by date for better analysis
        const newByDate = {};
        newSnap.forEach(doc => {
            const data = doc.data();
            const date = data.shift_date;
            if (!newByDate[date]) {
                newByDate[date] = [];
            }
            newByDate[date].push({
                id: doc.id,
                employee_id: data.employee_id,
                hasClockIn: !!data.clock_in,
                hasClockOut: !!data.clock_out,
                status: data.status
            });
        });
        
        // Show daily breakdown
        Object.keys(newByDate).sort().forEach(date => {
            const records = newByDate[date];
            console.log(`  ${date}: ${records.length} records (${records.filter(r => r.hasClockIn).length} with clock-in, ${records.filter(r => r.hasClockOut).length} with clock-out)`);
        });
        
        // 3. Compare and identify issues
        console.log('\n--- Analysis ---');
        const allDates = new Set([...Object.keys(legacyByDate), ...Object.keys(newByDate)]);
        const sortedDates = Array.from(allDates).sort();
        
        let issueFound = false;
        sortedDates.forEach(date => {
            const legacyCount = legacyByDate[date] ? legacyByDate[date].length : 0;
            const newCount = newByDate[date] ? newByDate[date].length : 0;
            
            if (legacyCount > 0 && newCount === 0) {
                console.log(`  ⚠️  ${date}: Data exists in LEGACY but MISSING in NEW collection`);
                issueFound = true;
            } else if (legacyCount > 0 && newCount > 0) {
                console.log(`  ✅ ${date}: Data exists in both collections`);
            } else if (legacyCount === 0 && newCount > 0) {
                console.log(`  ℹ️  ${date}: Only in NEW collection`);
            }
        });
        
        if (issueFound) {
            console.log(`  🚨 COMPANY ${companyId} HAS MIGRATION ISSUES - Needs migration`);
        } else {
            console.log(`  ✅ COMPANY ${companyId} appears to be properly migrated`);
        }
        
    } catch (error) {
        console.error(`Error checking company ${companyId}:`, error);
    }
}

async function main() {
    console.log('Checking attendance data migration status...');
    console.log(`Month: ${MONTH_TO_CHECK.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`);
    
    for (const companyId of COMPANIES_TO_CHECK) {
        await checkCompanyData(companyId);
    }
    
    console.log('\n=== Summary Complete ===');
}

// Run the check
main().catch(console.error);
