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

import { formatDistance, formatRelative, parseISO } from 'date-fns';
import {
  de, enUS, fr, ja,
} from 'date-fns/locale';

const availableLocales = {
  en: enUS,
  fr,
  ja,
  de,
};

const getLocaleWithFallback = (locale) => availableLocales[ locale ] || availableLocales.en;

function parseISOSafe (theDate) {
  // Note that `parseISO` doesn't throw an exception
  // but it returns an object `Invalid date` if a `null` is given.
  // As it creates an exception in GWT's bridge JSNI, let's prevent us from this case.

  if (!theDate) {
    return null;
  }

  return parseISO(theDate);
}

export const formatDistanceFromDate = (fromDate, locale) => {

  const fromDateOrNull = parseISOSafe(fromDate);
  if (!fromDateOrNull) {
    return '';
  }

  return formatDistance(fromDateOrNull, new Date(), {
    locale: getLocaleWithFallback(locale),
  });

};

export const formatRelativeFromDate = (fromDate, locale) => {

  const fromDateOrNull = parseISOSafe(fromDate);
  if (!fromDateOrNull) {
    return '';
  }

  return formatRelative(fromDateOrNull, new Date(), {
    locale: getLocaleWithFallback(locale),
  });

};

window.APP.dates = {
  formatDistanceFromDate,
  formatRelativeFromDate,
};
