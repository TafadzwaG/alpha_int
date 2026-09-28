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

/**
 *
 * This script must be product agnostic, => but there are a few exceptions
 * as it is intended to be copy/paste between Designer and Tester.
 *
 */

/* API Designer/API Tester agnostic mode OFF */
export const MODAL_STATUS = {
  CANCELED: 'STATUS_CANCELED',
  SUCCESS: 'STATUS_SUCCESS',
  ERROR: 'STATUS_ERROR',
  NOT_LOADED: 'MODAL_NOT_LOADED',
  UNKNOWN: 'STATUS_UNKNOWN',
};
export const SHARING_ENTITY_TYPE = {
  PROJECT: 'project',
  ENVIRONMENT: 'environment',
};
/* API Designer/API Tester agnostic mode ON */

const styles = {
  TRANSITION_DURATION_IN_SECONDS: 2,
  DONUT_SIZE_IN_PX: 50,
  Z_INDEX_IFRAME: 9998,
};

const messageTypes = {
  SHARING_IFRAME_HAS_LOADED: 'SHARING_IFRAME_HAS_LOADED',
  SHARING_MODAL_HAS_LOADED: 'SHARING_MODAL_HAS_LOADED',
  SHARING_MODAL_CLOSE: 'SHARING_MODAL_CLOSE',
  CREDENTIALS_PROVIDED: 'CREDENTIALS_PROVIDED',
};

export const sharingPaths = {
  OPEN_SHARING_FOR_API_TEST: 'open_sharing_for_api_test',
  OPEN_SHARING_FOR_API_TEST_ENVIRONMENT: 'open_sharing_for_api_test_environment',
  OPEN_VERSION_SHARING_FOR_API_DESIGNER: 'open_sharing_for_api_design',
  OPEN_API_SHARING_FOR_API_DESIGNER: 'open_api_sharing_for_api_designer',
};

let state = {};

function newNodeStyleForLoadingWidget (animationName) {

  const rules = document.createTextNode(`
      @keyframes ${animationName} {
          0% { transform: rotate(0deg);   }
        100% { transform: rotate(360deg); }
      }`);

  const el = document.createElement('style');
  el.type = 'text/css';
  el.appendChild(rules);
  return el;
}

function newNodeForAnimatedLoader (animationName) {

  const donutSize = `${styles.DONUT_SIZE_IN_PX}px`;
  const donutMargin = `${(-1 * styles.DONUT_SIZE_IN_PX) / 2}px`;

  const el = document.createElement('div');
  el.id = 'sharing-loader';
  el.style.cssText = `
      display: inline-block;
      border: 4px solid rgba(0, 0, 0, .2);
      border-left-color: rgba(0, 0, 0, .4);
      border-radius: 50%;
      width: ${donutSize};
      height: ${donutSize};
      position: absolute;
      top: 50%;
      left: 50%;
      margin: ${donutMargin} 0 0 ${donutMargin};
      animation: ${animationName} 1.2s linear infinite;
    `;
  return el;
}

function newNodeForBackdrop () {
  const el = document.createElement('div');
  el.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      background-color: #000;
      opacity: .2;
    `;
  return el;
}

function newNodeForLoadingWidget () {

  const el = document.createElement('div');
  el.style.cssText = `
      position: fixed;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      z-index: ${styles.Z_INDEX_IFRAME + 1};
      transition: opacity ${styles.TRANSITION_DURATION_IN_SECONDS}s ease-out;
    `;
  return el;
}

function newNodeIframeForSharingApplication () {
  const el = document.createElement('iframe');
  el.style.cssText = `
      width: 100%;
      height: 100%;
      border: 0;
      z-index: ${styles.Z_INDEX_IFRAME};
      position: absolute;
      opacity: 0;
    `;
  return el;
}

function displayLoading () {

  const animationName = 'sharing-donut-spin';

  state.sharingLoadingStyle = newNodeStyleForLoadingWidget(animationName);
  document.head.appendChild(state.sharingLoadingStyle);

  state.sharingLoading = newNodeForLoadingWidget();
  state.sharingLoading.appendChild(newNodeForBackdrop());
  state.sharingLoading.appendChild(newNodeForAnimatedLoader(animationName));
  document.body.appendChild(state.sharingLoading);
}

function hideLoading () {

  state.sharingLoading.style.opacity = 0; // it triggers the `transition`

  setTimeout(() => { // real cleanup
    // Let's use "removeChild" instead of "remove" because of IE 11 compatibility
    // https://stackoverflow.com/questions/20428877/javascript-remove-doesnt-work-in-ie
    state.sharingLoading.parentNode.removeChild(state.sharingLoading);
    state.sharingLoading = null;

    state.sharingLoadingStyle.parentNode.removeChild(state.sharingLoadingStyle);
    state.sharingLoadingStyle = null;
  }, styles.TRANSITION_DURATION_IN_SECONDS * 1000);
}

function isApiTester (pathForEntityType) {
  return [
    sharingPaths.OPEN_SHARING_FOR_API_TEST,
    sharingPaths.OPEN_SHARING_FOR_API_TEST_ENVIRONMENT,
  ].includes(pathForEntityType);
}

function isApiDesigner (pathForEntityType) {
  return [
    sharingPaths.OPEN_VERSION_SHARING_FOR_API_DESIGNER,
    sharingPaths.OPEN_API_SHARING_FOR_API_DESIGNER,
  ].includes(pathForEntityType);
}

function addEventListenerOnMessage (listener, { pathForEntityType }) {

  if (isApiTester(pathForEntityType)) {
    window.chrome.runtime.onMessage.addListener(listener);

  } else if (isApiDesigner(pathForEntityType)) {
    window.addEventListener('message', listener, false);

  } else {
    throw new Error('Unknown host application');
  }
}

function removeEventListenerOnMessage (listener, { pathForEntityType }) {

  if (isApiTester(pathForEntityType)) {
    window.chrome.runtime.onMessage.removeListener(listener);

  } else if (isApiDesigner(pathForEntityType)) {
    window.removeEventListener('message', listener, false);

  } else {
    throw new Error('Unknown host application');
  }
}

function listenerToMessage (messageType, fnToApply) {
  return ({ origin, data }) => {

    if (origin !== state.originOfIframe) {
      // eslint-disable-next-line no-console
      console.warn(`Received a message from an origin different from the sharing iframe: ${origin}`);
      return;
    }

    if (data && data.type === messageType) {
      fnToApply({
        origin,
        data,
      });
    }

  };
}

const listenerToLoadingModal = listenerToMessage(messageTypes.SHARING_MODAL_HAS_LOADED, () => {
  state.sharingIframe.style.opacity = 1;
  setTimeout(hideLoading, 250); // let's give time for the Sharing application to appear

  state.hasLoaded = true;
  clearTimeout(state.timeoutId);

  removeEventListenerOnMessage(listenerToLoadingModal, state);

  // eslint-disable-next-line no-use-before-define
  addEventListenerOnMessage(listenerToClosingModal, state);
});

const listenerToLoadedIFrame = listenerToMessage(messageTypes.SHARING_IFRAME_HAS_LOADED, () => {
  removeEventListenerOnMessage(listenerToLoadedIFrame, state);
  addEventListenerOnMessage(listenerToLoadingModal, state);

  const message = {
    type: messageTypes.CREDENTIALS_PROVIDED,
    accessToken: state.accessToken,
    userLanguage: state.userLanguage,
    resourceId: state.entityId,
    resourceName: state.entityName,
    resourceType: state.entityType,
  };

  // Compatible with Chrome extension and browsers
  state.sharingIframe.contentWindow.postMessage(message, state.originOfIframe);
});

function removeIframe () {
  state.sharingIframe.parentNode.removeChild(state.sharingIframe);
  state.sharingIframe = null;

  // eslint-disable-next-line no-use-before-define
  removeEventListenerOnMessage(listenerToClosingModal, state);
}

const listenerToClosingModal = listenerToMessage(messageTypes.SHARING_MODAL_CLOSE, ({ data }) => {
  const { status } = data;

  switch (status) {
    case MODAL_STATUS.SUCCESS:
      removeIframe();
      return state.deferred.resolve({
        status,
        message: data.message,
      });
    case MODAL_STATUS.CANCELED:
      removeIframe();
      return state.deferred.resolve({
        status,
      });
    case MODAL_STATUS.ERROR:
      // don't close the modal on errors
      return state.deferred.reject({
        status,
        message: data.message,
      });
    default:
      removeIframe();
      return state.deferred.resolve({
        status: MODAL_STATUS.UNKNOWN,
      });
  }
});

function checkIFrameIsLoaded () {
  if (!state.hasLoaded) {
    removeIframe();
    hideLoading();
    return state.deferred.reject({
      status: MODAL_STATUS.NOT_LOADED,
      message: 'The application sharing wasn\'t loaded.',
    });
  }

  return true;
}

/**
 *
 * @param sharingAppUrl e.g. `http://localhost:8786`
 *
 * @param pathForEntityType
 * it can be either
 * - `open_sharing_for_api_test` or
 * - `open_sharing_for_api_test_environment` or
 * - `open_sharing_for_api_design`,
 * see apimgmt-sharing-frontend routes configuration
 *
 * @param entityId
 * @param entityName
 * @param entityType one of the supported sharing entity types (cf SHARING_ENTITY_TYPE)
 * @param env optional, Tester only, it can be either 'DEV', 'STAGING' or 'PROD'
 * @param accessToken
 * @param userLanguage the user's preferred language
 * @param expectedPostMessageOrigin the expected origin of the message (must follow this exact format: <scheme>://<host>[:port])
 * @returns {Promise<any>}
 */
export function openModal ({
  sharingAppUrl,
  pathForEntityType,
  entityId,
  entityName,
  entityType,
  env,
  accessToken,
  userLanguage,
  expectedPostMessageOrigin,
}) {

  return new Promise((resolve, reject) => {

    state = {
      pathForEntityType,
      accessToken,
      userLanguage,
      entityId,
      entityName,
      entityType,
    }; // reset state

    state.deferred = {
      resolve,
      reject,
    };

    //
    // Give instant UI feedback to the user.
    // And let's wait until the Sharing application appears.
    //
    displayLoading();

    //
    // Init the probes to monitor the loading of the Sharing application.
    //
    state.hasLoaded = false;
    state.timeoutId = setTimeout(checkIFrameIsLoaded, 40 * 1000);
    addEventListenerOnMessage(listenerToLoadedIFrame, state);

    //
    // Let's load the Sharing application.
    //
    const baseUrl = sharingAppUrl.replace(/\/$/, ''); // remove trailing slash if any
    let url = `${baseUrl}/${pathForEntityType}/${entityId}`;

    if (isApiTester(pathForEntityType)) {
      const envQueryParam = env !== 'PROD' ? `#env=${env}` : '';
      url += envQueryParam;
    }

    // the expected origin of the message must follow this exact format: <scheme>://<host>[:port]
    // cf https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#targetorigin
    // needed for validation when listening to postMessage
    state.originOfIframe = expectedPostMessageOrigin;

    state.sharingIframe = newNodeIframeForSharingApplication();
    state.sharingIframe.setAttribute('src', url);
    document.body.appendChild(state.sharingIframe);
  });
}

const sharingAPI = {
  openModal,
  sharingPaths,
  _getCurrentState: () => state,
  _displayLoading: displayLoading,
  _hideLoading: hideLoading,
  /* API Designer/API Tester agnostic mode OFF */
  MODAL_STATUS,
  SHARING_ENTITY_TYPE,
  /* API Designer/API Tester agnostic mode ON */
};

window.RESTLET = window.RESTLET || {};
window.RESTLET.sharing = sharingAPI; // needed for Tester (to be used through JSNI)

export default sharingAPI;
