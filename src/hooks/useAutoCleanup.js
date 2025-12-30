import { useEffect } from 'react';
import { deleteOldRecordings } from '../utils/StorageManager';

const useAutoCleanup = (onCleanup) => {
    useEffect(() => {
        // Run cleanup on mount
        const runCleanup = async () => {
            try {
                const deletedCount = await deleteOldRecordings(30);
                if (deletedCount > 0 && onCleanup) {
                    onCleanup(deletedCount);
                }
            } catch (error) {
                console.error('Auto-cleanup error:', error);
            }
        };

        runCleanup();

        // Set up daily cleanup at midnight
        const scheduleNextCleanup = () => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const timeUntilMidnight = tomorrow - now;

            return setTimeout(() => {
                runCleanup();
                // Schedule next cleanup
                const interval = setInterval(runCleanup, 24 * 60 * 60 * 1000);
                return () => clearInterval(interval);
            }, timeUntilMidnight);
        };

        const timeout = scheduleNextCleanup();

        return () => {
            clearTimeout(timeout);
        };
    }, [onCleanup]);
};

export default useAutoCleanup;
