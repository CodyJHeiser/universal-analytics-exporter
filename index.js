import UniversalAnalyticsRequest from './modules/UniversalAnalyticsRequest.js';
import GoogleCloudManager from "upload-google-storage-to-bigquery";
import 'dotenv/config';

// Get .env token and intialize request class
const token = process.env.GAUTH_CURRENT_TOKEN;
const manager = new GoogleCloudManager("google-cloud-key.json");

const performanceBody = {
    dimensions: "ga:campaign,ga:sourceMedium,ga:country,ga:region,ga:city,ga:date",
    metrics: "ga:users,ga:sessions,ga:bounces,ga:goalCompletionsAll,ga:goalValueAll"
};

// dimensions=ga:campaign,ga:sourceMedium,ga:country,ga:region,ga:city,ga:productName,ga:date
// metrics=ga:itemQuantity,ga:itemRevenue,ga:localItemRevenue,ga:localProductRefundAmount,ga:productAddsToCart,ga:productDetailViews,ga:productListClicks

const productRptGeo = {
    dimensions: "ga:campaign,ga:sourceMedium,ga:country,ga:region,ga:city,ga:productName,ga:date",
    metrics: "ga:itemQuantity,ga:itemRevenue,ga:localItemRevenue,ga:localProductRefundAmount,ga:productAddsToCart,ga:productDetailViews,ga:productListClicks"
};

// dimensions=ga:campaign,ga:sourceMedium,ga:country,ga:region,ga:city,ga:date
// metrics=ga:users,ga:sessions,ga:bounces,ga:goalCompletionsAll,ga:goalValueAll,ga:pageviews

const productRptNoGeo = {
    dimensions: "ga:campaign,ga:sourceMedium,ga:country,ga:region,ga:city,ga:date",
    metrics: "ga:users,ga:sessions,ga:bounces,ga:goalCompletionsAll,ga:goalValueAll,ga:pageviews"
};

// const uaCampaignRequest = new UniversalAnalyticsRequest(token, {});
// const uaPerformanceRequest = new UniversalAnalyticsRequest(token, performanceBody);

const uaGeoRequest = new UniversalAnalyticsRequest(token, productRptGeo);
const uaNoGeoRequest = new UniversalAnalyticsRequest(token, productRptNoGeo);

async function processData(requestObj, tableName = "ua_data") {
    try {
        const response = await requestObj.requestAnalytics("2006-01-01", "2023-07-01");
        if (!response) return;

        const filePath = requestObj.writeToFile(response);
        console.log("Google UA Data Written to TSV.");

        // Upload the data to big query via NPM package
        manager.loadToBigQuery('google_ua_analysis', tableName, 'ua-uploads', filePath.tsv);
    } catch (error) {
        // handle the error
        console.log("Failed to process data: ", error);
    }
}

// processData(uaCampaignRequest);
// processData(uaPerformanceRequest, "ua_performace_data");

(async () => {
    await processData(uaGeoRequest, "ua_product_geo");
    await processData(uaNoGeoRequest, "ua_product");
})();