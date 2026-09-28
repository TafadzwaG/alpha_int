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

import { DOMParser } from '@xmldom/xmldom';
import addDays from 'date-fns/addDays';
import addHours from 'date-fns/addHours';
import addMinutes from 'date-fns/addMinutes';
import addMonths from 'date-fns/addMonths';
import addSeconds from 'date-fns/addSeconds';
import addWeeks from 'date-fns/addWeeks';
import addYears from 'date-fns/addYears';

import { Decimal } from 'decimal.js';
import cloneDeep from 'lodash/cloneDeep';

import concat from 'lodash/concat';
import map from 'lodash/map';
import reduce from 'lodash/reduce';
import set from 'lodash/set';
import xpath from 'xpath';
import { parse } from 'content-type';

const parseXml = (xmlAsString) => new DOMParser().parseFromString(xmlAsString);

export function evaluateXpath (xpathSelector, xmlAsString) {
  return xpath.evaluate(
    xpathSelector,
    parseXml(xmlAsString),
    null, // namespaceResolver
    xpath.XPathResult.ANY_TYPE, // resultType
    null,
  );
}

const XML_CHILD_TYPES = {
  ARRAY_ITEM: 'ARRAY_ITEM',
  SINGLE_ELEMENT: 'SINGLE_ELEMENT',
  ATTRIBUTE: 'ATTRIBUTE',
};

export function getXmlChildrenTags (parentSelector, xmlAsString) {
  const childrenKeys = map(evaluateXpath(`${parentSelector}/*`, xmlAsString).nodes, (node) => node.nodeName);

  const occurrencesByKey = reduce(
    childrenKeys,
    (seed, key) => {
      const newSeed = cloneDeep(seed);
      const total = seed[ key ] ? seed[ key ].total + 1 : 1;
      return set(newSeed, key, { index: 1, total });
    },
    {},
  );

  const childrenElements = map(childrenKeys, (key) => {
    if (occurrencesByKey[ key ].total > 1) {
      const index = occurrencesByKey[ key ].index++;
      return {
        type: XML_CHILD_TYPES.ARRAY_ITEM,
        key,
        index,
        selector: `/${key}[${index}]`,
      };
    }

    return {
      type: XML_CHILD_TYPES.SINGLE_ELEMENT,
      key,
      selector: `/${key}`,
    };
  });

  const attributeElements = map(
    evaluateXpath(`${parentSelector}/@*`, xmlAsString).nodes,
    (node) => {
      const key = node.nodeName;
      return {
        type: XML_CHILD_TYPES.ATTRIBUTE,
        key,
        selector: `/@${key}`,
      };
    },
  );

  return concat(childrenElements, attributeElements);
}

export function evaluateXpathWithRhino (xpathSelector, xmlAsString) {
  const result = evaluateXpath(xpathSelector, xmlAsString);

  let resultType;
  switch (result.resultType) {
    case 0:
      resultType = 'Any';
      break;
    case 1:
      resultType = 'Number';
      break;
    case 2:
      resultType = 'String';
      break;
    case 3:
      resultType = 'Boolean';
      break;
    case 4:
      resultType = 'UnorderedNodeIterator';
      break;
    case 5:
      resultType = 'OrderedNodeIterator';
      break;
    case 6:
      resultType = 'UnorderedNodeSnapshot';
      break;
    case 7:
      resultType = 'OrderedNodeSnapshot';
      break;
    case 8:
      resultType = 'AnyUnorderedNode';
      break;
    case 9:
      resultType = 'FirstOrderedNode';
      break;

    default:
      throw new Error(`Unsupported XPath result type ${result.resultType}`);
  }

  return JSON.stringify({
    resultType,
    booleanValue: result.booleanValue,
    stringValue: result.stringValue,
    numberValue: result.numberValue,
    matchingNodes: result.nodes
      ? result.nodes.map((n) => ({ name: n.name, stringValue: n.toString() }))
      : [],
  });
}

export const dateFns = {
  addYears, addMonths, addWeeks, addDays, addHours, addMinutes, addSeconds,
};

export const math = {
  add: (a, b) => Decimal.add(a, b),
  subtract: (a, b) => Decimal.add(a, Decimal.mul(b, -1)),
  multiply: (a, b) => Decimal.mul(a, b),
  divide: (a, b) => Decimal.div(a, b),
};

const LOWER_ALPHA = [ 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z' ];
const UPPER_ALPHA = [ 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z' ];
const NUMBERS = [ '0', '1', '2', '3', '4', '5', '6', '7', '8', '9' ];

const rollInteger = (excludedMaximum) => Math.floor(Math.random() * excludedMaximum);

export function randomString (length, lowerAlpha, upperAlpha, numbers) {
  const lexicon = [
    ...(lowerAlpha ? LOWER_ALPHA : []),
    ...(upperAlpha ? UPPER_ALPHA : []),
    ...(numbers ? NUMBERS : []),
  ];

  return Array(length)
    .fill(null)
    .map(() => rollInteger(lexicon.length))
    .map((index) => lexicon[ index ])
    .join('');
}

export function parseContentType (contentType) {
  return parse(contentType);
}
