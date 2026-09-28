import {EXTENSION_VERSION} from './utils.js';
import {fetchRequest} from './fetchRequest.js';

console.log('The ReqBin plugin has been initialized.');

const TRUSTED_ORIGINS = new Set([
    'https://reqbin.com',
    'https://app.reqbin.com',
    'https://beta.reqbin.com'
]);

function getSenderOrigin(sender) {
    if (!sender) {
        return '';
    }

    if (sender.origin) {
        return sender.origin;
    }

    if (sender.url) {
        try {
            return new URL(sender.url).origin;
        } catch (error) {
            console.error(error);
        }
    }

    return '';
}

chrome.runtime.onMessageExternal.addListener(
function(req, sender, sendResponse) {
    const origin = getSenderOrigin(sender);

    if (!TRUSTED_ORIGINS.has(origin)) {
        sendResponse({error: "Unauthorized sender"});
        return;
    }

    switch (req && req.cmd) {
        case 'rbGetVersion':
            sendResponse({ver: EXTENSION_VERSION});
            return;
        case 'rbPostData':
            fetchRequest(req.data, sendResponse);
            return true;
        default:
            sendResponse({error: "Unknown command"});
    }
});
