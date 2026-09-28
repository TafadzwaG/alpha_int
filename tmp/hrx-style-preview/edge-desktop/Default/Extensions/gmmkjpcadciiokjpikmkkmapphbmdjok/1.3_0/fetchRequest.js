import {EXTENSION_VERSION, getAuthHeader, getContentType, invalidRequest, isASCII, isForbiddenHeader, validateAuthHeader} from "./utils.js";

export function fetchRequest(data, sendResponse) {
    try {
        if (!data || typeof data.json !== 'string') {
            sendResponse(invalidRequest("Invalid request payload."));
            return;
        }

        const json = JSON.parse(data.json);
        const headers = typeof json.headers === 'string' ? json.headers.split("\n") : [];
        const fetchHeaders = new Headers();
        const fetchData = {
            method: json.method,
            headers: fetchHeaders
        };

        if (json.content !== undefined && json.method !== 'GET' && json.method !== 'HEAD') {
            fetchData.body = json.content;
        }

        for (let i = 0; i < headers.length; i++) {
            const header = headers[i].trim();
            if (!header) {
                continue;
            }

            const separatorIndex = header.indexOf(':');
            if (separatorIndex <= 0) {
                sendResponse(invalidRequest(`Invalid Header:\n${header}`));
                return;
            }

            const key = header.slice(0, separatorIndex).trim();
            const val = header.slice(separatorIndex + 1).trim();
            if (!isASCII(key) || !isASCII(val) || key.includes(' ')) {
                sendResponse(invalidRequest(`Invalid Header:\n${header}`));
                return;
            }

            if (isForbiddenHeader(key)) {
                sendResponse(invalidRequest(`Cannot set the header:\n${key}`));
                return;
            }

            fetchHeaders.append(key, val);
        }

        const authError = validateAuthHeader(json.auth);
        if (authError) {
            sendResponse(invalidRequest(authError));
            return;
        }

        const authHeader = getAuthHeader(json.auth).trim();
        if (authHeader) {
            fetchHeaders.set('Authorization', authHeader);
        }

        const start = new Date();

        if (json.method === 'POST' || json.method === 'PUT' || json.method === 'PATCH') {
            const contentType = json.contentType;
            if (contentType) {
                fetchHeaders.set('Content-Type', getContentType(contentType));
            }
        }

        fetch(json.idnUrl, fetchData)
            .then(response => {
                const statusCode = response.status;
                const statusDescription = response.statusText;

                const elapsed = new Date() - start;
                const contentType = response.headers.get('content-type');

                let headers = '';
                response.headers.forEach((value, name) => {
                    headers += (`${name}: ${value}\n`);
                });

                return response.text().then(responseData => {
                    sendResponse({
                        'Success': true,
                        'Version': EXTENSION_VERSION,
                        'StatusCode': statusCode,
                        'StatusDescription': statusDescription,
                        'Headers': headers,
                        'Content': responseData || '',
                        'ContentLength': (responseData || '').length,
                        'ContentType': contentType,
                        'Elapsed': elapsed,
                    });
                });
            })
            .catch((error) => {
                console.error(error);
                sendResponse(invalidRequest(error && error.message ? error.message : "Error sending request."));
            });
    } catch (error) {
        console.error(error);
        sendResponse(invalidRequest(error && error.message ? error.message : "Invalid request payload."));
    }
}
