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
import saveAs from 'file-saver';
import {
  BlobWriter,
  TextReader,
  ZipWriter,
} from '@zip.js/zip.js';

const registerBigNumberNotifier = (showWarningMessage) => {
  const bigIntWarning = (key, value) => {
    if (typeof value === 'number' && Math.abs(value) >= Number.MAX_SAFE_INTEGER) { showWarningMessage(); }
    return value;
  };

  const jsonParse = JSON.parse;
  JSON.parse = (input) => jsonParse(input, bigIntWarning);
};

/**
 * Returns a brand new ZipWriter (cf https://www.npmjs.com/package/@zip.js/zip.js).
 * @returns {ZipWriter<unknown>}
 */
const createZipWriter = () => {
  // Creates a BlobWriter object where the zip content will be written.
  const zipFileWriter = new BlobWriter();
  return new ZipWriter(zipFileWriter);
};

const createZipTextEntry = (text) => new TextReader(text);

window.APP = {
  // The object commons is added on window by commons.bundle.js for
  // usage in both the extension and the maven plugin.
  commons: window.commons,
  _,
  saveAs,
  createZipWriter,
  createZipTextEntry,

  // Called from JSNI to allow using the NotificationService to display
  // a warning when a BigNumber is found at deserialization.
  registerBigNumberNotifier,
};
