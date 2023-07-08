import RefreshGoogleToken from "./RefreshGoogleToken.js";
import * as ProgressBar from 'cli-progress';
import querystring from 'querystring';
import axios from "axios";
import fs from "fs";

/**
 * This class is used for handling requests to the Google Analytics API.
 * @extends {RefreshGoogleToken}
 */
class UniversalAnalyticsRequest extends RefreshGoogleToken {
    /**
     * Creates a new UniversalAnalyticsRequest instance.
     * @class
     * @classdesc This class is used to handle requests to Universal Analytics.
     *
     * @param {string} gAuthToken - The Google Authorization Token.
     *
     * @property {string} gAuthUrl - The URL for the Google Analytics API.
     * @property {Object} gAuthUrlBody - The body of the API request. This includes various metrics and dimensions.
     * @property {string|null} gAuthUrlBody."start-date" - The start date for the data request.
     * @property {string|null} gAuthUrlBody."end-date" - The end date for the data request.
     * @property {string} tsvWritePath - The path to where the TSV file will be written.
     * @property {string} jsonWritePath - The path to where the JSON file will be written.
     * @property {Object} config - The configuration for the axios request.
     * @property {string} config.method - The HTTP method for the request.
     * @property {number} config.maxBodyLength - The maximum length of the request body.
     * @property {string|null} config.url - The URL for the request.
     * @property {Object} config.headers - The headers to be sent with the request.
     * @property {string} config.headers.Authorization - The Authorization header, including the Bearer token.
     */
    constructor(gAuthToken) {
        super();

        // Default request data
        this.gAuthUrl = "https://www.googleapis.com/analytics/v3/data/ga";
        this.gAuthUrlBody = {
            ids: "ga:146624",
            dimensions: "ga:campaign,ga:sourceMedium,ga:country,ga:region,ga:city,ga:productName,ga:date",
            metrics: "ga:itemQuantity,ga:itemRevenue,ga:localItemRevenue,ga:localProductRefundAmount,ga:productAddsToCart,ga:productDetailViews,ga:productListClicks",
            "start-date": null,
            "end-date": null //2023-01-01
        };

        // Set the default write path for the TSV file
        this.tsvWritePath = "exports/google_ua_request.tsv";
        this.jsonWritePath = "exports/google_ua_request_all.json";
        this.logFilePath = "logs.txt";

        // Set the config details for the UA API request
        this.config = this.getConfigHeaders(gAuthToken);

        this.progressBar = new ProgressBar.SingleBar({}, ProgressBar.Presets.shades_classic);
        this.progressStarted = false;
        this.currentPageNumber = 0;
    }

    /**
     * Update the headers to get the google authentication token.
     * @param {string} gAuthToken - The Google Authorization Token.
     * @returns {Object} The object header API data with the authorization token.
     */
    getConfigHeaders = (gAuthToken) => {
        return {
            method: 'get',
            maxBodyLength: Infinity,
            url: null,
            headers: {
                'Authorization': `Bearer ${gAuthToken}`
            }
        };
    };

    /**
     * Requests analytics data from Google Analytics API for given dates.
     * @async
     * @param {string} startDate - The start date in 'YYYY-MM-DD' format.
     * @param {string} endDate - The end date in 'YYYY-MM-DD' format.
     * @param {string} [url=null] - The url to send the request to. If not provided, the default url is used.
     * @return {Promise<Array|null>} The analytics data or null if an error occurred.
     */
    requestAnalytics = async (startDate, endDate, url = null, retries = 2) => {
        if (!this.isValidDate(startDate) || !this.isValidDate(endDate)) {
            console.error('Invalid date format. Dates should be in YYYY-MM-DD format.');
            return null;
        }

        if (!url) {
            // Set the date values for the URL
            this.gAuthUrlBody["start-date"] = startDate;
            this.gAuthUrlBody["end-date"] = endDate;

            // Convert your object to a query string
            const urlParams = querystring.stringify(this.gAuthUrlBody);

            // Set the config
            url = `${this.gAuthUrl}?${urlParams}`;

            if (!this.isValidUrl(url)) {
                console.error('Invalid URL.');
                return null;
            }
        }

        this.config.url = url;

        try {
            const { data } = await axios.request(this.config);

            const { totalResults, itemsPerPage } = data;
            const totalPages = Math.ceil(totalResults / itemsPerPage);

            if (!this.progressStarted) {
                // Start the progress bar
                this.progressBar.start(totalPages, 0);
            }

            // If there's a next page, fetch it recursively and merge it with the current data.
            if (data.nextLink && data.nextLink !== data.selfLink) {
                await this.delay(1000);

                const nextPageData = await this.requestAnalytics(startDate, endDate, data.nextLink);
                if (nextPageData) {
                    // Get current and new column headers, ignore blank, null, or spaces-only headers
                    const currentColumnHeaders = data.columnHeaders.reduce((a, c) => {
                        if (c.name && c.name.trim()) {
                            return [...a, c.name];
                        } else {
                            return a;
                        }
                    }, []);

                    const newColumnHeaders = nextPageData.columnHeaders.reduce((a, c) => {
                        if (c.name && c.name.trim()) {
                            return [...a, c.name];
                        } else {
                            return a;
                        }
                    }, []);

                    // Append column headers if missing
                    newColumnHeaders.forEach(header => {
                        if (!(currentColumnHeaders.includes(header))) {
                            // Get full value of header data
                            const fullData = nextPageData.columnHeaders.filter(next => next.name === header)[0];

                            // Append header values to the end of the data
                            data.columnHeaders.push(fullData);
                        }
                    });

                    const expectedLength = data.columnHeaders.length;

                    // Merge rows from nextPageData to data, not more than the headers
                    const nonValidRows = data.rows.concat(nextPageData.rows);
                    const validatedRows = nonValidRows.map(row => row.map(deepRow => deepRow.slice(0, expectedLength)));
                    data.rows = validatedRows;
                }
            }

            // Save each page to exports/pages
            this.currentPageNumber += 1;

            const tsvPath = `exports/pages/google_ua_request-${this.currentPageNumber}.tsv`;
            const jsonPath = `exports/pages/google_ua_request_all-${this.currentPageNumber}.json`;

            this.writeToFile(data, tsvPath, jsonPath);

            // Increment the progress bar for the last run
            this.progressBar.increment();

            // Stop the progress bar
            this.progressBar.stop();

            return data;
        } catch (error) {
            if (retries > 0) {
                // Log the error
                const { response } = error;
                this.logToFile(response);
                console.error("modules/requestAnalytics Error: ", response.statusText);

                // Attempt to refresh auth token
                const { expires_in, access_token } = await this.refreshAuth();

                if (!expires_in || !access_token) {
                    const errorMessage = "modules/requestAnalytics Failed to refresh the token.";
                    console.error(errorMessage);

                    // Stop the progress bar if there is an error
                    this.progressBar.stop();

                    this.logToFile(errorMessage);
                    throw new Error(errorMessage);
                }

                // Refresh returns no error;
                const successMessage = `Token refreshed, attempting to continue. New expiry: ${String(expires_in)}`;
                console.log(successMessage);
                this.logToFile(successMessage);

                // Reset the token value
                this.config = this.getConfigHeaders(access_token);

                // Attempt to continue
                await this.delay(2000, false);
                return this.requestAnalytics(startDate, endDate, url, retries - 1);
            } else {
                throw new Error('Failed after several retries');
            }
        }
    };

    // Helper function to add delay
    delay = (ms, progressBarIncrement = true) => {
        // Increment the progress bar
        if (progressBarIncrement) {
            this.progressBar.increment();
            this.progressStarted = true;
        }

        return new Promise(resolve => setTimeout(resolve, ms));
    };

    /**
     * Checks whether a given date string is in 'YYYY-MM-DD' format.
     * @param {string} dateString - The date string to check.
     * @return {boolean} True if the date string is valid, otherwise false.
     */
    isValidDate = (dateString) => {
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        return regex.test(dateString);
    };

    /**
     * Checks whether a given URL string is a valid URL.
     * @param {string} urlString - The URL string to check.
     * @return {boolean} True if the URL string is valid, otherwise false.
     */
    isValidUrl = (urlString) => {
        try {
            new URL(urlString);
            return true;
        } catch (_) {
            return false;
        }
    };

    /**
     * Converts a given data object to TSV format.
     * @param {Object} dataObj - The data object to convert.
     * @return {string} The data in TSV format.
     */
    convertToTsv = (dataObj) => {
        let tsv = '';

        try {
            // Extract column names and add to the TSV string as headers
            let headers = dataObj.columnHeaders.map(header => header.name).join('\t');
            tsv += headers + '\n';

            // Add each row of data to the TSV string
            for (let row of dataObj.rows) {
                let rowData = row.join('\t');
                tsv += rowData + '\n';
            }
        } catch (error) {
            console.error("modules/convertToTsv Error: ", error);
            this.logToFile(error);
        }

        return tsv;
    };

    /**
     * Writes the given data object to a file in JSON format.
     * @param {Object} json - The data to write.
     * @param {string} jsonWritePath - The path to write the JSON file.
     */
    writeJsonToFile = (json, jsonWritePath) => {
        try {
            fs.writeFileSync(jsonWritePath, JSON.stringify(json, null, '\t'));
            return true;
        } catch (error) {
            console.error(error);
            this.logToFile(error);
            return false;
        }
    };

    /**
     * Writes the given data object to a file in TSV format.
     * @param {Object} json - The data to convert to TSV and write.
     * @param {string} tsvWritePath - The path to write the TSV file.
     */
    writeTsvToFile = (json, tsvWritePath) => {
        // Convert to correct format before writing
        const formattedTsv = this.convertToTsv(json);

        try {
            fs.writeFileSync(tsvWritePath, formattedTsv);
            return true;
        } catch (error) {
            console.error(error);
            this.logToFile(error);
            return false;
        }
    };

    /**
     * Logs the results of the file write operations.
     * @param {Array<string>} success - Array of successful file write paths.
     * @param {Array<string>} failed - Array of failed file write paths.
     */
    logWriteResults = (success, failed) => {
        // Message to console
        const successLength = success.length;
        const failedLength = failed.length;

        const successJoin = success.join(", ");
        const failedJoin = failed.join(", ");

        const message = `Wrote ${successLength} file${successLength > 1 ? 's' : ''} [${successJoin}]. ${successLength} passed, ${failedLength} failed${failedLength > 0 ? ` [${failedJoin}]` : ""}.`;

        console.log(message);
        this.logToFile(message);
    };

    /**
     * Writes the given data object to a file in TSV and JSON formats.
     * @param {Object} json - The data to write.
     * @param {string} [tsvWritePath=null] - The path to write the TSV file. If not provided, the default path is used.
     * @param {string} jsonWritePath - The path to write the JSON file.
     */
    writeToFile = (json, tsvWritePath = null, jsonWritePath = null) => {
        if (!tsvWritePath) tsvWritePath = this.tsvWritePath;
        if (!jsonWritePath) jsonWritePath = this.jsonWritePath;

        let success = [];
        let failed = [];

        if (this.writeJsonToFile(json, jsonWritePath)) {
            success.push(jsonWritePath);
        } else {
            failed.push(jsonWritePath);
        }

        if (this.writeTsvToFile(json, tsvWritePath)) {
            success.push(tsvWritePath);
        } else {
            failed.push(tsvWritePath);
        }

        this.logWriteResults(success, failed);

        // Return file names
        return { tsv: tsvWritePath, json: jsonWritePath };
    };

    /**
     * Logs a message with a timestamp to a log file.
     * @param {string} message - The message to log.
     */
    logToFile = (message) => {
        if (typeof message === "object") {
            // Format the error response as a pretty-printed JSON string
            try {
                message = JSON.stringify(message, null, 2);
            } catch {
                message = JSON.stringify({
                    status: message.response && message.response.status,
                    statusText: message.response && message.response.statusText,
                    data: message.response && message.response.data
                }, null, 2);
            }
        }

        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp}: ${message}\n\n`;

        fs.appendFileSync(this.logFilePath, logMessage);
    };
}

export default UniversalAnalyticsRequest;