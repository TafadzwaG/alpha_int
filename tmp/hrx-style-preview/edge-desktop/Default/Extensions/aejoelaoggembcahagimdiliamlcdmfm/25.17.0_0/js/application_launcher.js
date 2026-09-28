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

const { hash } = window.location;
const EXTENSION_ID = chrome.runtime.id;

const htmlPage = '/index.html';
const tabUrl = `chrome-extension://${EXTENSION_ID}${htmlPage}`;

// Uncomment to help you debug, displays the input in a div in the popup
// const debug = (text) => {
//   const textnode = document.createElement('div');
//   textnode.innerHTML = `${text}<br>`;
//   document.body.appendChild(textnode);
// };

chrome.windows.getCurrent((currentWindow) => {
  const extensionsTabs = chrome.extension.getViews({
    type: 'tab',
    windowId: currentWindow.id,
  });
  const launcher = extensionsTabs
    .find((extensionTab) => extensionTab.location.pathname === '/application_launcher.html');

  // Let's create the tab anyway and let it be handled in the `background.js`
  chrome.tabs.create({
    url: tabUrl + hash,
  });

  if (launcher) {
    launcher.close();
  }
  window.close();
});
