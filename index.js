import UniversalAnalyticsRequest from './modules/UniversalAnalyticsRequest.js';
import GoogleCloudManager from "upload-google-storage-to-bigquery";
import 'dotenv/config';

// Get .env token and intialize request class
const token = process.env.GAUTH_CURRENT_TOKEN;
const uaRequest = new UniversalAnalyticsRequest(token);
const manager = new GoogleCloudManager("google-cloud-key.json");

async function processData() {
    try {
        const response = await uaRequest.requestAnalytics("2023-01-01", "2023-02-01");
        if (!response) return;

        const filePath = uaRequest.writeToFile(response);
        console.log("Google UA Data Written to TSV.");

        // Upload the data to big query via NPM package
        manager.loadToBigQuery('google_ua_analysis', 'ua_data', 'ua-uploads', filePath.tsv);
    } catch (error) {
        // handle the error
        console.log("Failed to process data: ", error);
    }
}

processData();
