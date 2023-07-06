# universal-analytics-exporter

This project includes a `UniversalAnalyticsRequest` class that extends the `RefreshGoogleToken` class. This class is used to make requests to the Universal Analytics API and handle the data received.  There is no need to update the authorization token, this will automatically update and notify you that a restart is needed.

## Installation

1. Clone the repository.
2. Run `npm install` to install all required dependencies.

## Usage

```javascript
const uaRequest = new UniversalAnalyticsRequest(GAUTH_CURRENT_TOKEN);
const data = await uaRequest.requestAnalytics('YYYY-MM-DD', 'YYYY-MM-DD');
uaRequest.writeToFile(data);
```

## Features

- Request data from the Universal Analytics API.
- Validate date and URL parameters.
- Convert received data to TSV (Tab-Separated Values) format.
- Write received data to files in JSON and TSV formats.
- Log any errors encountered during the request process to a log file.

## Methods

- `constructor(gAuthToken)`: Initializes a new instance of the `UniversalAnalyticsRequest` class.
- `requestAnalytics(startDate, endDate)`: Makes a request to the Universal Analytics API for data from `startDate` to `endDate`.
- `isValidDate(dateString)`: Validates whether a given string is a valid date in 'YYYY-MM-DD' format.
- `isValidUrl(urlString)`: Validates whether a given string is a valid URL.
- `convertToTsv(dataObj)`: Converts a data object to TSV format.
- `writeToFile(json, tsvWritePath, jsonWritePath)`: Writes the given data object to a file in TSV and JSON formats. Default paths are used if none are provided.
- `logToFile(dataObj)`: Logs a given data object to a log file.

## Error Handling

The `requestAnalytics` method includes error handling logic. If an error is encountered during the request process, the error details will be logged to a log file and the Google auth token will be refreshed. The console will then display a message prompting the user to run the program again.

## Logs

Logs are saved in a file with the following format:

```
[yyyy-mm-dd HH:MM:SS]: <log message>
```

Each new log entry is appended to the top of the log file. This allows for easy tracking of the most recent logs.

## Note

Ensure that you have a valid Google Auth token and internet connection before making requests to the Universal Analytics API.
