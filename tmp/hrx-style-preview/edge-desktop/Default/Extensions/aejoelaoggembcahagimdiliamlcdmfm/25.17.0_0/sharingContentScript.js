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

/* eslint-disable no-console */

const EXTENSION_ID = chrome.runtime.id;

const { log } = console;

window.addEventListener('message', (event) => {

  const { source, data, origin } = event;

  log('Received message', data);

  if (source !== window) {
    log('Message is ignored since it is from the wrong window');
    return;
  }

  if (!data) {
    log('Message is ignored since it is empty');
    return;
  }

  const { type, target } = data;

  if (!type) {
    log("Message is ignored since 'type' property is missing");
    return;
  }

  if (target !== EXTENSION_ID) {
    log(`Message is ignored since mother-extension is not its target: ${target}`);
    return;
  }

  log('Message is valid, delegating it to Restlet Client');

  const COMPATIBLE_EVENTS = [
    'SHARING_IFRAME_HAS_LOADED',
    'CREDENTIALS_PROVIDED',
    'SHARING_MODAL_HAS_LOADED',
    'SHARING_MODAL_CLOSE',
  ];

  if (COMPATIBLE_EVENTS.indexOf(type) !== -1) {
    chrome.runtime.sendMessage({ origin, data });
  }

}, false);
