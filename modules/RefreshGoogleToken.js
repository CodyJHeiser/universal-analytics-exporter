import axios from "axios";
import 'dotenv/config';
import fs from "fs";
import os from "os";
import querystring from 'querystring';

/**
 * Class to refresh the Google Authentication Token
 * @class
 */
class RefreshGoogleToken {
    /**
     * Constructor for RefreshGoogleToken class
     * @constructor
     */
    constructor() {
        // Get .env variables
        const GAUTH_CLIENT_ID = process.env.GAUTH_CLIENT_ID;
        const GAUTH_CLIENT_SECRET = process.env.GAUTH_CLIENT_SECRET;
        const GAUTH_REFRESH_TOKEN = process.env.GAUTH_REFRESH_TOKEN;
        const GAUTH_GRANT_TYPE = process.env.GAUTH_GRANT_TYPE;

        this.gAuthEnv = "GAUTH_CURRENT_TOKEN";

        // Build the post request body
        this.gAuthConfig = {
            client_id: GAUTH_CLIENT_ID,
            client_secret: GAUTH_CLIENT_SECRET,
            refresh_token: GAUTH_REFRESH_TOKEN,
            grant_type: GAUTH_GRANT_TYPE,
        };
    }

    /**
     * Refreshes the auth token
     * @async
     * @method
     * @returns {Promise<number|null>} The new expiry time of the auth token or null if an error occurred
     */
    refreshAuth = async () => {
        try {
            const { data: { expires_in, access_token } } = await axios.post('https://www.googleapis.com/oauth2/v4/token', querystring.stringify(this.gAuthConfig), {
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                }
            });

            console.log(`gAuth New Token Expiry: ${expires_in}`);

            // Update the .env file
            await this.setEnvValue(this.gAuthEnv, access_token);

            return { expires_in, access_token };
        } catch (error) {
            console.error("refreshAuth Error: ", error);
            return null;
        }
    };

    /**
     * Sets a new value for a given key in the .env file
     * @async
     * @method
     * @param {string} key - The key to update
     * @param {string} value - The new value
     */
    setEnvValue = async (key, value) => {
        // read file from hdd & split it from a linebreak to a array
        const ENV_VARS = fs.readFileSync("./.env", "utf8").split(os.EOL);

        // find the env we want based on the key
        const target = ENV_VARS.indexOf(ENV_VARS.find((line) => {
            return line.match(new RegExp(key));
        }));

        // replace the key/value with the new value
        ENV_VARS.splice(target, 1, `${key}=${value}`);

        // write everything back to the file system
        fs.writeFileSync("./.env", ENV_VARS.join(os.EOL));
    };
}

export default RefreshGoogleToken;
