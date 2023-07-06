import UniversalAnalyticsRequest from './modules/UniversalAnalyticsRequest.js';

const uaRequest = new UniversalAnalyticsRequest();

async function processData() {
    try {
        const response = await uaRequest.request();

        if (!response) return;
        uaRequest.writeToFile(response);

        console.log("Google UA Data Written to TSV.");
    } catch (error) {
        // handle the error
        console.log("Failed to process data: ", error);
    }
}

processData();
