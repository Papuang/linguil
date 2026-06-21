import type { RawDailyData } from '@/shared/types/index';
import { restGetDoc } from '@/server/lib/firestore-rest';

// Fetches the complete daily word data from Firestore.
export const getDailyWordData = async (): Promise<RawDailyData | null> => {
    const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    try {
        // Fetches and parses the document into a clean JSON object.
        const dailyWordDoc = await restGetDoc(`dailyWords/${dateStr}`);
        
        // If no data is found for the current day, log it and return null.
        if (!dailyWordDoc) {
            console.error(`Daily word data not found for date: ${dateStr}`);
            return null;
        }

        // Cast the returned object to the expected type.
        return dailyWordDoc as RawDailyData;
    } catch (error) {
        // If any unexpected errors occur, log them on the server.
        console.error("Error fetching daily word via Firebase REST API:", error);
        return null;
    }
};