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

// Assumes that the URL contains the query parameters
const extractQueryParameters = (url) => {
  const queryString = url.substring(url.indexOf('?') + 1);
  return queryString.split('&')
    .map((queryParameterAndValue) => queryParameterAndValue.split('='))
    .reduce((seed, pair) => ({ ...seed, [ pair[ 0 ] ]: pair[ 1 ] }), {});
};

const oauthLink = (githubOauthAppId, state) => {
  const { translate } = window.APP.i18n;
  const redirectUrl = window.chrome.identity.getRedirectURL();
  const url = `https://github.com/login/oauth/authorize?client_id=${githubOauthAppId}&scope=repo&redirect_uri=${encodeURIComponent(redirectUrl)}&state=${state}`;

  return new Promise(((resolve, reject) => {
    window.chrome.identity.launchWebAuthFlow(
      {
        url,
        interactive: true,
      },
      (callbackUrl) => {
        if (!callbackUrl) {
          return reject(Error(translate('GITHUB_PROJECT_SETTINGS_LINK_YOUR_ACCOUNT_COULD_NOT_CONNECT_TO_GITHUB_ERROR')));
        }

        const queryParameters = extractQueryParameters(callbackUrl);
        if (queryParameters.error) {
          // eslint-disable-next-line no-console
          console.log('GitHub threw an error: ', queryParameters.error_description);
          return reject(Error(translate('GITHUB_PROJECT_SETTINGS_LINK_YOUR_ACCOUNT_UNEXPECTED_ERROR')));
        }

        if (queryParameters.state !== state) {
          return reject(Error(translate('GITHUB_PROJECT_SETTINGS_LINK_YOUR_ACCOUNT_SUSPICIOUS_ERROR')));
        }

        return resolve({
          linked: true,
          appId: githubOauthAppId,
          code: queryParameters.code,
          state,
        });
      },
    );
  }));
};

window.APP.github = {
  oauthLink,
};
