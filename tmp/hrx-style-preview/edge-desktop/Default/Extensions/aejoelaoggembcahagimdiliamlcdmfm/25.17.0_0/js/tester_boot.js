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

const readFavoriteLanguageCallback = function (result) {
  const userFavoriteLanguage = (result && result.favoriteLanguage) || 'en';

  chrome.storage.local.set({ favoriteLanguage: userFavoriteLanguage }, () => {
    // create the GWT meta tag that allows the GWT bootstrap to choose the right permutation
    const gwtLocaleMetaTag = document.createElement('meta');
    gwtLocaleMetaTag.setAttribute('name', 'gwt:property');
    gwtLocaleMetaTag.content = `locale=${userFavoriteLanguage}`;
    document.head.appendChild(gwtLocaleMetaTag);

    // then inject the GWT bootstrap code
    const gwtBootstrapScriptTag = document.createElement('script');
    gwtBootstrapScriptTag.setAttribute('src', 'devhttpclient/devhttpclient.nocache.js');

    document.body.appendChild(gwtBootstrapScriptTag);
  });
};

chrome.storage.local.get('favoriteLanguage', readFavoriteLanguageCallback);
