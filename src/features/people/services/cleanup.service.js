import { db } from '../../../shared/lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

export const UserCleanupService = {
    /**
     * Find and cleanup duplicate users by name.
     * Keeps the most recently updated/created active user.
     * Marks others as active: false, status: 'archived_duplicate'
     */
    async cleanupDuplicates(companyId) {
        console.log("Starting Cleanup for company:", companyId);
        const q = query(collection(db, 'users'), where('companyId', '==', companyId));
        const snap = await getDocs(q);

        const users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const groups = {};

        // Group by normalized name
        users.forEach(u => {
            const name = u.name?.trim();
            if (!name) return;
            if (!groups[name]) groups[name] = [];
            groups[name].push(u);
        });

        const batch = writeBatch(db);
        let fixCount = 0;
        let removedIds = [];

        Object.entries(groups).forEach(([name, list]) => {
            if (list.length > 1) {
                console.log(`Found duplicate: ${name} (${list.length} records)`);

                // Sort to find the "Winner"
                // Priority: Active > Recent Update > Recent Create
                list.sort((a, b) => {
                    if (a.active !== b.active) return b.active ? 1 : -1; // Active first
                    const timeA = a.updatedAt?.toMillis?.() || 0;
                    const timeB = b.updatedAt?.toMillis?.() || 0;
                    return timeB - timeA; // Newest first
                });

                const winner = list[0];
                const losers = list.slice(1);

                losers.forEach(loser => {
                    const ref = doc(db, 'users', loser.id);
                    batch.update(ref, {
                        active: false,
                        status: 'archived_duplicate',
                        note: `Duplicate of ${winner.id} (Auto Cleaned)`
                    });
                    fixCount++;
                    removedIds.push(loser.id + ` (${loser.role})`);
                });
            }
        });

        if (fixCount > 0) {
            await batch.commit();
            console.log("Cleanup Complete! Fixed:", fixCount, "users.");
        } else {
            console.log("No duplicates found to fix.");
        }

        return { count: fixCount, removed: removedIds };
    }
};
