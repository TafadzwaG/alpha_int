/*
 * Copyright (C) 2010-2022 Talend Inc. - www.talend.com
 *
 * This source code is available under agreement available at
 * https://www.talend.com/legal-terms/us-eula
 *
 * You should have received a copy of the agreement
 * along with this program; if not, write to Talend SA
 * 5 rue Salomon de Rothschild - 92150 Suresnes
 *
 */

/* eslint-disable no-bitwise,no-mixed-operators, no-console */

/**
 * Constants
 */

const EXTENSION_ID = chrome.runtime.id;
const EXTENSION_VERSION = chrome.runtime.getManifest().version;
const PAYLOAD_TYPE_NONE = 'none';
const MESSAGE_PAYLOAD_TYPES = [ 'none', 'restletClient', 'apiTester' ]; // From: MessagePayloadProcessor
const NON_PROD_EXTENSION_IDS = [ 'mkjahmpfgjlnmilf', 'nbdfcmckhmmmhbad', 'kpkhbpfmfgajpeee' ];
const LOCAL_STORAGE_TESTER_TAB_IDS_KEY = 'testerTabIds'; // Same constant is defined in the ChromeAppEntryPoint class.
const LOCAL_STORAGE_QUERY_PAYLOADS_KEY = 'queryPayloads'; // Same constant is defined in the TryOutPayloadUtils class.

const isNonProdExtension = NON_PROD_EXTENSION_IDS.includes(EXTENSION_ID.substr(16, 16));

const PROD_TRUSTED_DOMAINS = [
  new RegExp(EXTENSION_ID), // Host for extensions is extension ID
  /^[a-zA-Z0-9-.]+\.talend\.com$/,
  /^[a-zA-Z0-9-.]+\.api-documentation\.com$/,
];
const NON_PROD_TRUSTED_DOMAINS = [
  ...PROD_TRUSTED_DOMAINS,
  /^[a-zA-Z0-9-.]+\.api\.dev\.datapwn\.com$/, // Local stacks (devstack)
  /^localhost:[0-9]+$/,
  /^127\.0\.0\.1\.xip\.io:[0-9]+$/,
];

// /!\ To be used on new URL(url).host /!\
const TRUSTED_DOMAINS = isNonProdExtension ? NON_PROD_TRUSTED_DOMAINS : PROD_TRUSTED_DOMAINS;

/**
 * Utility functions
 */

const adaptQueryStringFirstPart = (queryStringFirstPart) => {
  const queryStringStarter = /^[?]/.test(queryStringFirstPart || '') ? '' : '?';
  return `${queryStringStarter}${queryStringFirstPart}&`;
};

const generateQueryString = (queryStringFirstPart, querySecondPart) => {
  const queryStringSecondPart = Object.keys(querySecondPart)
    .filter((key) => querySecondPart[ key ])
    .map((key) => `${key}=${querySecondPart[ key ]}`)
    .join('&');

  return `${adaptQueryStringFirstPart(queryStringFirstPart)}${queryStringSecondPart}`;
};

const getExtensionUrl = (isDevMode, queryString) => (
  `chrome-extension://${EXTENSION_ID}/index${isDevMode ? '_dev' : ''}.html${queryString || ''}`
);

// From: https://gist.github.com/jcxplorer/823878, changed to pass linting
const uuid = () => {
  const hyphensIndexes = [ 8, 13, 18, 23 ];
  return Array(36)
    .fill(0)
    .map((__, index) => {
      // eslint-disable-next-line no-bitwise
      const random = Math.random() * 16 | 0;

      if (hyphensIndexes.includes(index)) {
        return '-';
      }

      if (index === 14) {
        return (4).toString(16);
      }

      if (index === 19) {
        // eslint-disable-next-line no-bitwise,no-mixed-operators
        return (random & 3 | 8).toString(16);
      }

      return (random).toString(16);
    })
    .join('');
};

/**
 * Returns the list of recorded identifiers of Tester tabs.
 * /!\ Some tabs may not be active in case the local storage is not up-to-date (previous memory crash, etc.).
 */
const readRegisteredTesterTabIds = () => chrome.storage.local.get([ LOCAL_STORAGE_TESTER_TAB_IDS_KEY ])
  .then((result) => result[ LOCAL_STORAGE_TESTER_TAB_IDS_KEY ] || []);
const checkTabIsOpened = (tabId) => chrome.tabs.get(tabId)
  .then(() => ({ active: true, tabId }))
  .catch(() => ({ active: false, tabId }));

const readRegisteredAndOpenedTesterTabIds = () => readRegisteredTesterTabIds()
  .then((registeredTabIds) => Promise.all(registeredTabIds.map((registeredTabId) => checkTabIsOpened(registeredTabId))))
  .then((registeredTabIdsWithStatus) => registeredTabIdsWithStatus
    .filter((registeredTabIdWithStatus) => registeredTabIdWithStatus.active)
    .map((registeredAndOpenedTabId) => registeredAndOpenedTabId.tabId));

const silentlyCloseTabById = (tabId) => chrome.tabs.remove(tabId).catch(() => {});

/**
 * Returns the list of recorded query payloads.
 */
const readTesterQueryPayloads = () => chrome.storage.local.get([ LOCAL_STORAGE_QUERY_PAYLOADS_KEY ])
  .then((result) => result[ LOCAL_STORAGE_QUERY_PAYLOADS_KEY ] || {});

/**
 * store a new query payload.
 */
const storeTesterQueryPayloads = (key, payload) => readTesterQueryPayloads()
  .then((testerQueryPayloads) => {
    chrome.storage.local.set({
      [ LOCAL_STORAGE_QUERY_PAYLOADS_KEY ]: {
        ...testerQueryPayloads,
        [ key ]: payload,
      },
    });
  });

/**
 * Returns false if no Tester tab is opened, the id of the opened tab otherwise.
 */
const findOpenedExtensionTab = () => readRegisteredAndOpenedTesterTabIds()
  .then((testerTabIds) => (testerTabIds.length === 0 ? false : testerTabIds[ 0 ]));

const closeAllExtensionTabs = () => readRegisteredAndOpenedTesterTabIds()
  .then((testerTabIds) => Promise.all(testerTabIds.map((tabId) => silentlyCloseTabById(tabId))));

/**
 * Initialization
 */

const restoreLastSessionTabs = () => {
  const clearOpenedTabs = () => chrome.storage.local.remove('app.opened.tabs');

  chrome.storage.local.get('app.opened.tabs', (openedTabs) => {
    const apiTesterOpenedTabs = openedTabs[ 'app.opened.tabs' ];
    if (apiTesterOpenedTabs) {
      apiTesterOpenedTabs.forEach((url) => {
        chrome.tabs.create({ url }, clearOpenedTabs);
      });
    }
  });
};

restoreLastSessionTabs();

/**
 * Message handling
 */

const stripPatchVersion = (applicationVersion) => /^([0-9]+\.[0-9]+\.[0-9]+)(\.[0-9]+)?$/.exec(applicationVersion)[ 1 ];

const validateQueryString = (queryString) => {
  if (!queryString || typeof queryString === 'string') {
    return true;
  }

  console.warn('Field queryString of a message must be a string. Message ignored.');
  return false;
};

const validateEnumField = (fieldName, message, enumAsArray) => {
  if (enumAsArray.includes(message[ fieldName ])) { return true; }

  const acceptedValues = enumAsArray.join(', ');
  console.warn(`Field ${fieldName} of a message must be one of [ ${acceptedValues} ]. Message ignored`);
  return false;
};

const validateBooleanField = (fieldName, message) => {
  const fieldValue = message[ fieldName ] || false;
  if (typeof fieldValue === 'boolean') {
    return true;
  }

  console.warn(`Field ${fieldName} of a message must be a boolean. Message ignored.`);
  return false;
};

// BEGIN: message handlers

const handleUpgrade = () => {
  /*
     This method has been muted while migrating to manifest v3 for several reasons:
       - The "upgrade" feature has never been used so far
       - API Tester is in a maintenance mode, which makes future new versions of the EntityTreeNode format unlikely
       - The "chrome.extension.getViews" API does not exist anymore and replacing it would require some efforts.

  const openedTabsUrl = chrome.extension.getViews({ type: 'tab' })
    .map((tab) => tab.location.href);

  chrome.storage.local.set(
    { 'app.opened.tabs': openedTabsUrl },
    () => {
      if (chrome.runtime.lastError) {
        // Just in case
        chrome.storage.local.remove('app.opened.tabs');
        return;
      }
      chrome.runtime.reload();
    },
  );
  */
};

/**
 * See documentation in $TAT_CLIENT/doc/bridges.md
 */
const handleOpenApiOrRequestOrParameterizedRequest = (message, sender) => {
  if (sender.tab == null) { return false; }
  if (!validateEnumField('payloadType', message, MESSAGE_PAYLOAD_TYPES)) { return false; }
  if (!validateQueryString(message.queryString)) { return false; }
  if (!validateBooleanField('isDevMode', message)) { return false; }
  if (!validateBooleanField('shouldReplaceOriginTab', message)) { return false; }
  if (!validateBooleanField('shouldReplaceTab', message)) { return false; }
  if (!validateBooleanField('useExistingTab', message)) { return false; }

  const query = { key: uuid(), payloadType: message.payloadType };
  const queryString = generateQueryString(message.queryString, query);
  const targetUrl = getExtensionUrl(message.isDevMode, queryString);
  const senderTabId = sender.tab.id;

  const shouldReplaceOriginTab = message.shouldReplaceOriginTab
    // TODO: remove the two below when all callers use the new version above (see TAD-342)
    || message.shouldReplaceTab
    || message.useExistingTab;

  storeTesterQueryPayloads(query.key, {
    messageType: message.type,
    payloadType: message.payloadType,
    payload: JSON.stringify(message.payload), // MUST be parsed with AutoBean T-T => parsing done elsewhere.
    url: sender.url,
  });

  if (shouldReplaceOriginTab) {
    return closeAllExtensionTabs()
      .then(() => chrome.tabs.update(senderTabId, { url: targetUrl, active: true }));
  }

  return findOpenedExtensionTab()
    .then((openedTabId) => (
      openedTabId
        ? chrome.tabs.update(openedTabId, { url: targetUrl, active: true })
        : chrome.tabs.create({ url: targetUrl, active: true })
    ));
};

const getApplicationInstances = (sender) => readRegisteredAndOpenedTesterTabIds()
  .then((testerTabIds) => testerTabIds.filter((tabId) => sender.tab.id !== tabId));

const checkAvailability = (tabId, message) => chrome.tabs.sendMessage(tabId, message);

const checkRootNameAvailability = (message, sender, sendResponse) => {
  const applicationInstancesPromiseList = getApplicationInstances(sender)
    .then((tabIds) => tabIds.map((tabId) => checkAvailability(tabId)));

  Promise.all(applicationInstancesPromiseList)
    .then((availabilities) => availabilities.reduce((accumulator, availability) => accumulator && availability, true))
    .then(sendResponse)
    .catch(() => sendResponse(false));
  return true;
};

const notifyRunningInstances = (message, sender) => {
  getApplicationInstances(sender)
    .then((tabIds) => tabIds.forEach((tabId) => chrome.tabs.sendMessage(tabId, message)));
};

const handleDiscovery = (message, sender, sendResponse) => {
  sendResponse(stripPatchVersion(EXTENSION_VERSION));
};

/**
 * See documentation in $TAT_CLIENT/doc/bridges.md
 */
const openExtension = (message, sender) => {
  if (!validateQueryString(message.queryString)) { return; }
  if (!validateBooleanField('isDevMode', message)) { return; }
  if (!validateBooleanField('shouldReplaceOriginTab', message)) { return; }
  if (!validateBooleanField('shouldReplaceTab', message)) { return; }
  if (!validateBooleanField('useExistingTab', message)) { return; }

  const query = { key: uuid(), payloadType: PAYLOAD_TYPE_NONE };
  const queryString = generateQueryString(message.queryString, query);
  const targetUrl = getExtensionUrl(message.isDevMode, queryString);
  const senderTabId = sender.tab.id;

  const shouldReplaceOriginTab = message.shouldReplaceOriginTab
    // TODO: remove the two below when all callers use the new version above (see TAD-342)
    || message.shouldReplaceTab
    || message.useExistingTab;

  storeTesterQueryPayloads(query.key, {
    messageType: message.type,
    payloadType: PAYLOAD_TYPE_NONE,
    url: sender.url,
  });

  findOpenedExtensionTab()
    .then((openTesterTabId) => {
      if (openTesterTabId) {
        return chrome.tabs.update(openTesterTabId, { active: true }) // No URL change, just bring to front
          .catch(() => chrome.tabs.create({ url: targetUrl, active: true })); // In case of error, just create a new tab
      }

      return closeAllExtensionTabs()
        .then(() => (shouldReplaceOriginTab
          ? chrome.tabs.update(senderTabId, { url: targetUrl, active: true })
          : chrome.tabs.create({ url: targetUrl, active: true })));
    });
};

const MESSAGE_TYPES = {
  // related to multi tabs (do not remove, this feature will be reintroduced soon)
  checkRootNameAvailability: {
    isProtected: true,
    handler: checkRootNameAvailability,
  },
  notifyRunningInstances: {
    isProtected: true,
    handler: notifyRunningInstances,
  },

  // allow any caller to check the current version of Tester
  discovery: {
    isProtected: false,
    handler: handleDiscovery,
  },

  // allow authorized callers to ask to upgrade Tester
  upgrade: {
    isProtected: true,
    handler: handleUpgrade,
  },

  openApi: {
    isProtected: false, // TAT-1498 will re-add proper domain name validation
    handler: handleOpenApiOrRequestOrParameterizedRequest,
  },
  openRequest: {
    isProtected: false,
    handler: handleOpenApiOrRequestOrParameterizedRequest,
  },
  openParameterizedRequest: {
    isProtected: false,
    handler: handleOpenApiOrRequestOrParameterizedRequest,
  },
  openExtension: {
    isProtected: false,
    handler: openExtension,
  },
};
// END: message handlers

const createMessageListener = () => (message, sender, sendResponse) => {
  if (!message || !message.type || !MESSAGE_TYPES[ message.type ]) { return false; }

  const messageType = MESSAGE_TYPES[ message.type ];

  if (messageType.isProtected) {
    const senderHost = new URL(sender.url).host;
    const validatedUrlRegexes = TRUSTED_DOMAINS
      .filter((trustedDomainRegex) => trustedDomainRegex.test(senderHost));

    if (validatedUrlRegexes.length < 1) {
      console.warn(`Message of type ${message.type} from URL ${sender.url} was blocked for your safety, it's domain is not trusted.`);
      return false;
    }
  }

  return messageType.handler(message, sender, sendResponse);
};

chrome.runtime.onMessage.addListener(createMessageListener());
chrome.runtime.onMessageExternal.addListener(createMessageListener());

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      'api.tester.installed': 'true',
      last_migration_ran: EXTENSION_VERSION,
    });
  }

  // In case of fresh install or update then notify the opened websites that want to be API Tester aware
  if (details.reason === 'install' || details.reason === 'update') {
    chrome.windows.getAll({}, (windows) => {
      windows.forEach((applicationWindow) => {
        chrome.tabs.query({ windowId: applicationWindow.id })
          .then((tabs) => {
            tabs
              .filter((tab) => tab && tab.url && tab.url.indexOf('http') === 0)
              .forEach((tab) => {
                // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/scripting/executeScript
                chrome.scripting.executeScript(
                  {
                    target: { tabId: tab.id },
                    files: [ 'contentScript.js' ],
                  },
                  () => { // Swallows the exception and logs it in JS console
                    const { lastError } = chrome.runtime;
                    if (lastError) {
                      console.warn(`contentScript injection failed on ${tab.url}\n Error: ${JSON.stringify(lastError)}`);
                    }
                  },
                );
              });
          });
      });
    });
  }
});

/**
 * This code may not be executed in case Chrome does not close properly (no battery, memory crash, etc.).
 * It means that the local storage may not be up-to-date.
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  readRegisteredTesterTabIds()
    .then((testerTabIds) => {
      if (testerTabIds.includes(tabId)) {
        testerTabIds.splice(testerTabIds.indexOf(tabId), 1);
        chrome.storage.local.set({ testerTabIds });
      }
    });
});
