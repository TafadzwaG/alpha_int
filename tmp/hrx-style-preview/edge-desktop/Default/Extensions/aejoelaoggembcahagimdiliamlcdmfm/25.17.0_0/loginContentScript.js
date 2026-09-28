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

(() => {
  const EXTENSION_ID = chrome.runtime.id;

  const { log } = console;

  window.addEventListener('message', (event) => {
    log('Received message', event.data);

    if (event.source !== window) {
      log('Message is ignored since it is from the wrong window');
      return;
    }

    if (!event.data) {
      log('Message is ignored since it is empty');
      return;
    }

    if (!event.data.type) {
      log("Message is ignored since 'type' property is missing");
      return;
    }

    if (event.data.target !== EXTENSION_ID) {
      log('Message is ignored since mother-extension is not its target');
      return;
    }

    log('Message is valid, delegating it to API Tester');

    const { data } = event;
    data.location = document.location;

    chrome.runtime.sendMessage(data, () => {});
  }, false);
})();
