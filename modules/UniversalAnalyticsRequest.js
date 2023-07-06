import axios from "axios";
import 'dotenv/config';
import fs from "fs";
import RefreshGoogleToken from "./RefreshGoogleToken.js";

class UniversalAnalyticsRequest extends RefreshGoogleToken {
    constructor() {
        super();

        // Get .env variables
        const GUA_URL = process.env.GUA_URL;
        const GAUTH_CURRENT_TOKEN = process.env.GAUTH_CURRENT_TOKEN;

        // Set the default write path for the TSV file
        this.tsvWritePath = "exports/google_ua_request.tsv";
        this.jsonWritePath = "exports/google_ua_request_all.json";

        // Set the config details for the UA API request
        this.config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: GUA_URL,
            headers: {
                'Authorization': `Bearer ${GAUTH_CURRENT_TOKEN}`
            }
        };
    }

    request = async () => {
        try {
            const { data } = await axios.request(this.config);

            return data;
        } catch (error) {
            const { response: { statusText } } = error;

            console.error("request Error: ", statusText);

            // Attempt to refresh auth token
            await this.refreshAuth();
            console.log("Token refreshed, please run the program again.");
            return null;
        }
    };

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
            console.error("convertToTsv Error: ", error);
        }

        return tsv;
    };

    writeToFile = (json, tsvWritePath = null, jsonWritePath) => {
        if (!tsvWritePath) tsvWritePath = this.tsvWritePath;
        if (!jsonWritePath) jsonWritePath = this.jsonWritePath;

        // Convert to correct format before writing
        const formattedTsv = this.convertToTsv(json);

        let success = [];
        let failed = [];

        try {
            fs.writeFileSync(jsonWritePath, JSON.stringify(json, null, '\t'));
            success.push(jsonWritePath);
            // file written successfully
        } catch (error) {
            failed.push(jsonWritePath);
        }

        try {
            fs.writeFileSync(tsvWritePath, formattedTsv);
            success.push(tsvWritePath);
            // file written successfully
        } catch (error) {
            failed.push(tsvWritePath);
        }

        // Message to console
        const successLength = success.length;
        const failedLength = failed.length;

        const successJoin = success.join(", ");
        const failedJoin = failed.join(", ");

        console.log(`Wrote ${successLength} file${successLength > 1 ? 's' : ''} [${successJoin}]. ${successLength} passed, ${failedLength} failed${failedLength > 0 ? ` [${failedJoin}]` : ""}.`);
    };
}

export default UniversalAnalyticsRequest;