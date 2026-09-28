export const EXTENSION_VERSION = "1.3";

export function invalidRequest(error) {
    return {
        'Success': false,
        'Version': EXTENSION_VERSION,
        'StatusCode': 0,
        'StatusDescription': 'Error',
        'Headers': '',
        'ContentType': 'text/plain',
        "Content": "ReqBin Chrome Extension\n\n" + error,
        'ContentLength': ("ReqBin Chrome Extension\n\n" + error).length,
        'Elapsed': 0
    }
}

export function isASCII(str) {
    return /^[\x00-\x7F]*$/.test(str);
}

export function validateAuthHeader(auth) {
    if (!auth || !auth.auth) {
        return "";
    }

    const authType = auth.auth;
    if (authType === "bearerToken") {
        const header = auth.bearerToken;
        if (!header) {
            return "Invalid Bearer Token.";
        }

        if (!isASCII(header)) {
            return `Bearer Token contains non-ascii characters:\n${header}`;
        }
    }

    if (authType === "basicAuth") {
        const  header = auth.basicUsername + ":" + auth.basicPassword;
        if (!auth.basicUsername || !auth.basicPassword) {
            return `Invalid Basic Auth header:\n${header}`;
        }

        if (!isASCII(header)) {
            return `Basic Auth header contains non-ascii characters:\n${header}`;
        }
    }

    if (authType === "customAuth") {
        const  header = auth.customHeader;
        if (!header) {
            return "Invalid Custom Auth header.";
        }

        if (!isASCII(header)) {
            return `Custom Auth header contains non-ascii characters:\n${header}`;
        }
    }

    return "";
}

export function getAuthHeader(auth) {
    if (!auth || !auth.auth) {
        return "";
    }

    const authType = auth.auth;
    if (authType === "noAuth") {
        return "";
    }

    if (authType === "bearerToken") {
        return "Bearer " + auth.bearerToken;
    }

    if (authType === "basicAuth") {
        const basic = auth.basicUsername + ":" + auth.basicPassword;
        return "Basic " + btoa(basic);
    }

    if (authType === "customAuth") {
        return auth.customHeader;
    }

    return "";
}

export function getContentType(contentType) {
    if (contentType === "URLENCODED")
        return "application/x-www-form-urlencoded"
    if (contentType === "JSON")
        return "application/json"
    if (contentType === "HTML")
        return "text/html"
    if (contentType === "XML")
        return "application/xml"
    if (contentType === "TEXT")
        return "text/plain"
    return contentType;
}

export function isForbiddenHeader(header) {
    const headers = [
        "Accept-Charset",
        "Accept-Encoding",
        "Access-Control-Request-Headers",
        "Access-Control-Request-Method",
        "Connection",
        "Content-Length",
        "Cookie",
        "Cookie2",
        "Date",
        "DNT",
        "Expect",
        "Feature-Policy",
        "Host",
        "Keep-Alive",
        "Origin",
        //"Proxy-",
        //"Sec-",
        "Set-Cookie",
        "Set-Cookie2",
        "Referer",
        "TE",
        "Trailer",
        "Transfer-Encoding",
        "Upgrade",
        "User-Agent",
        "Via"
    ];

    return !!headers.find(x => x.toLowerCase() === header.toLowerCase());
}
