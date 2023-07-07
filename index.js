import UniversalAnalyticsRequest from './modules/UniversalAnalyticsRequest.js';
import 'dotenv/config';

// Get .env token and intialize request class
const token = process.env.GAUTH_CURRENT_TOKEN;
const uaRequest = new UniversalAnalyticsRequest(token);

async function processData() {
    try {
        const response = await uaRequest.requestAnalytics("2006-01-01", "2023-07-01");

        if (!response) return;
        uaRequest.writeToFile(response);

        console.log("Google UA Data Written to TSV.");
    } catch (error) {
        // handle the error
        console.log("Failed to process data: ", error);
    }
}

processData();
