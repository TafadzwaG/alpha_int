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

import _ from 'lodash';

const { crypto } = window;

const CRYPTO_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.-~'; // DON'T ADD CHARACTERS THAT GET URL-ENCODED IN THE ALPHABET. WOULD BREAK REGEXES
const CRYPTO_ALPHABET_SIZE = _.size(CRYPTO_ALPHABET);

const generateCryptoSecureRandomString = (size) => {
  const array = crypto.getRandomValues(new Uint32Array(size));
  return _(array)
    .map((number) => CRYPTO_ALPHABET.charAt(number % CRYPTO_ALPHABET_SIZE))
    .join('');
};

//
//
//
/**
 * Base64-URL-encoding is a minor variation on the typical Base64 encoding method.
 * Take the Base64-encoded string, and change + to -, and / to _, then trim the trailing = from the end.
 * Implementation comes from https://www.oauth.com/oauth2-servers/pkce/authorization-request/
 * @param arrayBuffer
 * @returns {string}
 */
const base64UrlEncodeArrayBuffer = (arrayBuffer) => btoa(String.fromCharCode.apply(
  null,
  new Uint8Array(arrayBuffer),
))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

/**
 * Generates a digest of the given data using "SHA-256" algorithm.
 * @param message
 * @returns {Promise<ArrayBuffer>}
 */
const sha256DigestMessage = (message) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  return crypto.subtle.digest('SHA-256', data);
};

/**
 * Code challenge is a Base64-URL-encoded string of the SHA256 hash of the code verifier
 * cf https://www.oauth.com/oauth2-servers/pkce/authorization-request/
 * @param codeVerifier
 * @returns {Promise<string>}
 */
const generatePkceCodeChallenge = (codeVerifier) => sha256DigestMessage(codeVerifier)
  .then((digest) => base64UrlEncodeArrayBuffer(digest));

const logout = (url) => {
  const options = {
    method: 'GET',
    credentials: 'include',
  };

  return fetch(url, options)
    .then((response) => {
      if (response.ok) {
        return;
      }

      throw Error('Logout failed');
    });
};

window.APP.authService = {
  generateCryptoSecureRandomString,
  generatePkceCodeChallenge,
  logout,
};
