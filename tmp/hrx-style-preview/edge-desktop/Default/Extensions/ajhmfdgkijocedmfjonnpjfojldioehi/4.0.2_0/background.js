var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/rfc4648/lib/index.js
var require_lib = __commonJS({
  "node_modules/rfc4648/lib/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function parse(string, encoding, opts) {
      var _opts$out;
      if (opts === void 0) {
        opts = {};
      }
      if (!encoding.codes) {
        encoding.codes = {};
        for (var i = 0; i < encoding.chars.length; ++i) {
          encoding.codes[encoding.chars[i]] = i;
        }
      }
      if (!opts.loose && string.length * encoding.bits & 7) {
        throw new SyntaxError("Invalid padding");
      }
      var end = string.length;
      while (string[end - 1] === "=") {
        --end;
        if (!opts.loose && !((string.length - end) * encoding.bits & 7)) {
          throw new SyntaxError("Invalid padding");
        }
      }
      var out = new ((_opts$out = opts.out) != null ? _opts$out : Uint8Array)(end * encoding.bits / 8 | 0);
      var bits = 0;
      var buffer = 0;
      var written = 0;
      for (var _i = 0; _i < end; ++_i) {
        var value = encoding.codes[string[_i]];
        if (value === void 0) {
          throw new SyntaxError("Invalid character " + string[_i]);
        }
        buffer = buffer << encoding.bits | value;
        bits += encoding.bits;
        if (bits >= 8) {
          bits -= 8;
          out[written++] = 255 & buffer >> bits;
        }
      }
      if (bits >= encoding.bits || 255 & buffer << 8 - bits) {
        throw new SyntaxError("Unexpected end of data");
      }
      return out;
    }
    function stringify(data, encoding, opts) {
      if (opts === void 0) {
        opts = {};
      }
      var _opts = opts, _opts$pad = _opts.pad, pad = _opts$pad === void 0 ? true : _opts$pad;
      var mask = (1 << encoding.bits) - 1;
      var out = "";
      var bits = 0;
      var buffer = 0;
      for (var i = 0; i < data.length; ++i) {
        buffer = buffer << 8 | 255 & data[i];
        bits += 8;
        while (bits > encoding.bits) {
          bits -= encoding.bits;
          out += encoding.chars[mask & buffer >> bits];
        }
      }
      if (bits) {
        out += encoding.chars[mask & buffer << encoding.bits - bits];
      }
      if (pad) {
        while (out.length * encoding.bits & 7) {
          out += "=";
        }
      }
      return out;
    }
    var base16Encoding = {
      chars: "0123456789ABCDEF",
      bits: 4
    };
    var base32Encoding = {
      chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
      bits: 5
    };
    var base32HexEncoding = {
      chars: "0123456789ABCDEFGHIJKLMNOPQRSTUV",
      bits: 5
    };
    var base64Encoding = {
      chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
      bits: 6
    };
    var base64UrlEncoding = {
      chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
      bits: 6
    };
    var base162 = {
      parse: function parse$1(string, opts) {
        return parse(string.toUpperCase(), base16Encoding, opts);
      },
      stringify: function stringify$1(data, opts) {
        return stringify(data, base16Encoding, opts);
      }
    };
    var base322 = {
      parse: function parse$1(string, opts) {
        if (opts === void 0) {
          opts = {};
        }
        return parse(opts.loose ? string.toUpperCase().replace(/0/g, "O").replace(/1/g, "L").replace(/8/g, "B") : string, base32Encoding, opts);
      },
      stringify: function stringify$1(data, opts) {
        return stringify(data, base32Encoding, opts);
      }
    };
    var base32hex2 = {
      parse: function parse$1(string, opts) {
        return parse(string, base32HexEncoding, opts);
      },
      stringify: function stringify$1(data, opts) {
        return stringify(data, base32HexEncoding, opts);
      }
    };
    var base642 = {
      parse: function parse$1(string, opts) {
        return parse(string, base64Encoding, opts);
      },
      stringify: function stringify$1(data, opts) {
        return stringify(data, base64Encoding, opts);
      }
    };
    var base64url2 = {
      parse: function parse$1(string, opts) {
        return parse(string, base64UrlEncoding, opts);
      },
      stringify: function stringify$1(data, opts) {
        return stringify(data, base64UrlEncoding, opts);
      }
    };
    var codec2 = {
      parse,
      stringify
    };
    exports.base16 = base162;
    exports.base32 = base322;
    exports.base32hex = base32hex2;
    exports.base64 = base642;
    exports.base64url = base64url2;
    exports.codec = codec2;
  }
});

// node_modules/pvtsutils/build/index.js
var require_build = __commonJS({
  "node_modules/pvtsutils/build/index.js"(exports) {
    "use strict";
    var ARRAY_BUFFER_NAME = "[object ArrayBuffer]";
    var BufferSourceConverter2 = class _BufferSourceConverter {
      static isArrayBuffer(data) {
        return Object.prototype.toString.call(data) === ARRAY_BUFFER_NAME;
      }
      static toArrayBuffer(data) {
        if (this.isArrayBuffer(data)) {
          return data;
        }
        if (data.byteLength === data.buffer.byteLength) {
          return data.buffer;
        }
        if (data.byteOffset === 0 && data.byteLength === data.buffer.byteLength) {
          return data.buffer;
        }
        return this.toUint8Array(data.buffer).slice(data.byteOffset, data.byteOffset + data.byteLength).buffer;
      }
      static toUint8Array(data) {
        return this.toView(data, Uint8Array);
      }
      static toView(data, type) {
        if (data.constructor === type) {
          return data;
        }
        if (this.isArrayBuffer(data)) {
          return new type(data);
        }
        if (this.isArrayBufferView(data)) {
          return new type(data.buffer, data.byteOffset, data.byteLength);
        }
        throw new TypeError("The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
      }
      static isBufferSource(data) {
        return this.isArrayBufferView(data) || this.isArrayBuffer(data);
      }
      static isArrayBufferView(data) {
        return ArrayBuffer.isView(data) || data && this.isArrayBuffer(data.buffer);
      }
      static isEqual(a, b) {
        const aView = _BufferSourceConverter.toUint8Array(a);
        const bView = _BufferSourceConverter.toUint8Array(b);
        if (aView.length !== bView.byteLength) {
          return false;
        }
        for (let i = 0; i < aView.length; i++) {
          if (aView[i] !== bView[i]) {
            return false;
          }
        }
        return true;
      }
      static concat(...args) {
        let buffers;
        if (Array.isArray(args[0]) && !(args[1] instanceof Function)) {
          buffers = args[0];
        } else if (Array.isArray(args[0]) && args[1] instanceof Function) {
          buffers = args[0];
        } else {
          if (args[args.length - 1] instanceof Function) {
            buffers = args.slice(0, args.length - 1);
          } else {
            buffers = args;
          }
        }
        let size = 0;
        for (const buffer of buffers) {
          size += buffer.byteLength;
        }
        const res = new Uint8Array(size);
        let offset = 0;
        for (const buffer of buffers) {
          const view = this.toUint8Array(buffer);
          res.set(view, offset);
          offset += view.length;
        }
        if (args[args.length - 1] instanceof Function) {
          return this.toView(res, args[args.length - 1]);
        }
        return res.buffer;
      }
    };
    var STRING_TYPE = "string";
    var HEX_REGEX = /^[0-9a-f]+$/i;
    var BASE64_REGEX = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    var BASE64URL_REGEX = /^[a-zA-Z0-9-_]+$/;
    var Utf8Converter = class {
      static fromString(text) {
        const s = unescape(encodeURIComponent(text));
        const uintArray = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) {
          uintArray[i] = s.charCodeAt(i);
        }
        return uintArray.buffer;
      }
      static toString(buffer) {
        const buf = BufferSourceConverter2.toUint8Array(buffer);
        let encodedString = "";
        for (let i = 0; i < buf.length; i++) {
          encodedString += String.fromCharCode(buf[i]);
        }
        const decodedString = decodeURIComponent(escape(encodedString));
        return decodedString;
      }
    };
    var Utf16Converter = class {
      static toString(buffer, littleEndian = false) {
        const arrayBuffer = BufferSourceConverter2.toArrayBuffer(buffer);
        const dataView = new DataView(arrayBuffer);
        let res = "";
        for (let i = 0; i < arrayBuffer.byteLength; i += 2) {
          const code = dataView.getUint16(i, littleEndian);
          res += String.fromCharCode(code);
        }
        return res;
      }
      static fromString(text, littleEndian = false) {
        const res = new ArrayBuffer(text.length * 2);
        const dataView = new DataView(res);
        for (let i = 0; i < text.length; i++) {
          dataView.setUint16(i * 2, text.charCodeAt(i), littleEndian);
        }
        return res;
      }
    };
    var Convert2 = class _Convert {
      static isHex(data) {
        return typeof data === STRING_TYPE && HEX_REGEX.test(data);
      }
      static isBase64(data) {
        return typeof data === STRING_TYPE && BASE64_REGEX.test(data);
      }
      static isBase64Url(data) {
        return typeof data === STRING_TYPE && BASE64URL_REGEX.test(data);
      }
      static ToString(buffer, enc = "utf8") {
        const buf = BufferSourceConverter2.toUint8Array(buffer);
        switch (enc.toLowerCase()) {
          case "utf8":
            return this.ToUtf8String(buf);
          case "binary":
            return this.ToBinary(buf);
          case "hex":
            return this.ToHex(buf);
          case "base64":
            return this.ToBase64(buf);
          case "base64url":
            return this.ToBase64Url(buf);
          case "utf16le":
            return Utf16Converter.toString(buf, true);
          case "utf16":
          case "utf16be":
            return Utf16Converter.toString(buf);
          default:
            throw new Error(`Unknown type of encoding '${enc}'`);
        }
      }
      static FromString(str, enc = "utf8") {
        if (!str) {
          return new ArrayBuffer(0);
        }
        switch (enc.toLowerCase()) {
          case "utf8":
            return this.FromUtf8String(str);
          case "binary":
            return this.FromBinary(str);
          case "hex":
            return this.FromHex(str);
          case "base64":
            return this.FromBase64(str);
          case "base64url":
            return this.FromBase64Url(str);
          case "utf16le":
            return Utf16Converter.fromString(str, true);
          case "utf16":
          case "utf16be":
            return Utf16Converter.fromString(str);
          default:
            throw new Error(`Unknown type of encoding '${enc}'`);
        }
      }
      static ToBase64(buffer) {
        const buf = BufferSourceConverter2.toUint8Array(buffer);
        if (typeof btoa !== "undefined") {
          const binary = this.ToString(buf, "binary");
          return btoa(binary);
        } else {
          return Buffer.from(buf).toString("base64");
        }
      }
      static FromBase64(base642) {
        const formatted = this.formatString(base642);
        if (!formatted) {
          return new ArrayBuffer(0);
        }
        if (!_Convert.isBase64(formatted)) {
          throw new TypeError("Argument 'base64Text' is not Base64 encoded");
        }
        if (typeof atob !== "undefined") {
          return this.FromBinary(atob(formatted));
        } else {
          return new Uint8Array(Buffer.from(formatted, "base64")).buffer;
        }
      }
      static FromBase64Url(base64url2) {
        const formatted = this.formatString(base64url2);
        if (!formatted) {
          return new ArrayBuffer(0);
        }
        if (!_Convert.isBase64Url(formatted)) {
          throw new TypeError("Argument 'base64url' is not Base64Url encoded");
        }
        return this.FromBase64(this.Base64Padding(formatted.replace(/\-/g, "+").replace(/\_/g, "/")));
      }
      static ToBase64Url(data) {
        return this.ToBase64(data).replace(/\+/g, "-").replace(/\//g, "_").replace(/\=/g, "");
      }
      static FromUtf8String(text, encoding = _Convert.DEFAULT_UTF8_ENCODING) {
        switch (encoding) {
          case "ascii":
            return this.FromBinary(text);
          case "utf8":
            return Utf8Converter.fromString(text);
          case "utf16":
          case "utf16be":
            return Utf16Converter.fromString(text);
          case "utf16le":
          case "usc2":
            return Utf16Converter.fromString(text, true);
          default:
            throw new Error(`Unknown type of encoding '${encoding}'`);
        }
      }
      static ToUtf8String(buffer, encoding = _Convert.DEFAULT_UTF8_ENCODING) {
        switch (encoding) {
          case "ascii":
            return this.ToBinary(buffer);
          case "utf8":
            return Utf8Converter.toString(buffer);
          case "utf16":
          case "utf16be":
            return Utf16Converter.toString(buffer);
          case "utf16le":
          case "usc2":
            return Utf16Converter.toString(buffer, true);
          default:
            throw new Error(`Unknown type of encoding '${encoding}'`);
        }
      }
      static FromBinary(text) {
        const stringLength = text.length;
        const resultView = new Uint8Array(stringLength);
        for (let i = 0; i < stringLength; i++) {
          resultView[i] = text.charCodeAt(i);
        }
        return resultView.buffer;
      }
      static ToBinary(buffer) {
        const buf = BufferSourceConverter2.toUint8Array(buffer);
        let res = "";
        for (let i = 0; i < buf.length; i++) {
          res += String.fromCharCode(buf[i]);
        }
        return res;
      }
      static ToHex(buffer) {
        const buf = BufferSourceConverter2.toUint8Array(buffer);
        let result = "";
        const len = buf.length;
        for (let i = 0; i < len; i++) {
          const byte = buf[i];
          if (byte < 16) {
            result += "0";
          }
          result += byte.toString(16);
        }
        return result;
      }
      static FromHex(hexString) {
        let formatted = this.formatString(hexString);
        if (!formatted) {
          return new ArrayBuffer(0);
        }
        if (!_Convert.isHex(formatted)) {
          throw new TypeError("Argument 'hexString' is not HEX encoded");
        }
        if (formatted.length % 2) {
          formatted = `0${formatted}`;
        }
        const res = new Uint8Array(formatted.length / 2);
        for (let i = 0; i < formatted.length; i = i + 2) {
          const c = formatted.slice(i, i + 2);
          res[i / 2] = parseInt(c, 16);
        }
        return res.buffer;
      }
      static ToUtf16String(buffer, littleEndian = false) {
        return Utf16Converter.toString(buffer, littleEndian);
      }
      static FromUtf16String(text, littleEndian = false) {
        return Utf16Converter.fromString(text, littleEndian);
      }
      static Base64Padding(base642) {
        const padCount = 4 - base642.length % 4;
        if (padCount < 4) {
          for (let i = 0; i < padCount; i++) {
            base642 += "=";
          }
        }
        return base642;
      }
      static formatString(data) {
        return (data === null || data === void 0 ? void 0 : data.replace(/[\n\r\t ]/g, "")) || "";
      }
    };
    Convert2.DEFAULT_UTF8_ENCODING = "utf8";
    function assign(target, ...sources) {
      const res = arguments[0];
      for (let i = 1; i < arguments.length; i++) {
        const obj = arguments[i];
        for (const prop in obj) {
          res[prop] = obj[prop];
        }
      }
      return res;
    }
    function combine(...buf) {
      const totalByteLength = buf.map((item) => item.byteLength).reduce((prev, cur) => prev + cur);
      const res = new Uint8Array(totalByteLength);
      let currentPos = 0;
      buf.map((item) => new Uint8Array(item)).forEach((arr) => {
        for (const item2 of arr) {
          res[currentPos++] = item2;
        }
      });
      return res.buffer;
    }
    function isEqual(bytes1, bytes2) {
      if (!(bytes1 && bytes2)) {
        return false;
      }
      if (bytes1.byteLength !== bytes2.byteLength) {
        return false;
      }
      const b1 = new Uint8Array(bytes1);
      const b2 = new Uint8Array(bytes2);
      for (let i = 0; i < bytes1.byteLength; i++) {
        if (b1[i] !== b2[i]) {
          return false;
        }
      }
      return true;
    }
    exports.BufferSourceConverter = BufferSourceConverter2;
    exports.Convert = Convert2;
    exports.assign = assign;
    exports.combine = combine;
    exports.isEqual = isEqual;
  }
});

// src/common/const.ts
var STORAGE_ID_ATTESTER_CONFIGURATION = "attesters_by_issuer_key";

// src/common/settings.ts
var SETTING_NAMES = {
  SERVICE_WORKER_MODE: "serviceWorkerMode",
  ATTESTERS: "attesters"
};
var settings = {};
var rawSettingToSettingAttester = (attestersRaw) => {
  return attestersRaw.split(/[\n,]+/).filter((attester) => {
    try {
      new URL(attester);
      return true;
    } catch (_) {
      return false;
    }
  });
};
function getRawSettings(storage) {
  return new Promise(
    (resolve) => storage.get(Object.values(SETTING_NAMES), async (items) => {
      if (Object.entries(items).length < 2) {
        await resetSettings(storage);
        const settings2 = getSettings();
        resolve({
          attesters: settings2.attesters.join("\n"),
          serviceWorkerMode: settings2.serviceWorkerMode
        });
      } else {
        const rawSettings = items;
        settings = {
          serviceWorkerMode: rawSettings.serviceWorkerMode,
          attesters: rawSettingToSettingAttester(rawSettings.attesters)
        };
        resolve(rawSettings);
      }
    })
  );
}
function getSettings() {
  return settings;
}
var refreshAttesterLookupByIssuerKey = async (storage) => {
  const attestersByIssuerKey = /* @__PURE__ */ new Map();
  const { attesters, serviceWorkerMode: mode } = getSettings();
  const logger = getLogger(mode);
  for (const attester of attesters) {
    const nowTimestamp = Date.now();
    const response = await fetch(`${attester}/v1/private-token-issuer-directory`);
    if (!response.ok) {
      logger.log(`"${attester}" issuer keys not available, attester will not be used.`);
      return;
    }
    const directory = await response.json();
    for (const { "token-keys": tokenKeys } of Object.values(directory)) {
      for (const key of tokenKeys) {
        const notBefore = key["not-before"];
        if (!notBefore || notBefore > nowTimestamp) {
          continue;
        }
        attestersByIssuerKey.set(key["token-key"], attester);
      }
    }
    storage.set({
      [STORAGE_ID_ATTESTER_CONFIGURATION]: Object.fromEntries(attestersByIssuerKey)
    });
  }
  logger.info("Attester lookup by Issuer key populated");
};
async function saveSettings(storage, name, value) {
  switch (name) {
    case "attesters":
      settings[name] = rawSettingToSettingAttester(value);
      await refreshAttesterLookupByIssuerKey(storage);
      break;
    case "serviceWorkerMode":
      if (Object.values(SERVICE_WORKER_MODE).map((s) => s).includes(value)) {
        settings[name] = value;
      }
  }
  return storage.set({ [name]: value });
}
async function resetSettings(storage) {
  const DEFAULT = {
    serviceWorkerMode: SERVICE_WORKER_MODE.PRODUCTION,
    attesters: [
      "https://pp-attester-turnstile.research.cloudflare.com",
      "https://pp-attester-turnstile-dev.research.cloudflare.com"
    ]
  };
  await saveSettings(storage, "serviceWorkerMode", DEFAULT.serviceWorkerMode);
  await saveSettings(storage, "attesters", DEFAULT.attesters.join("\n"));
}
var SERVICE_WORKER_MODE = {
  PRODUCTION: "production",
  DEVELOPMENT: "development",
  DEMO: "demo"
};

// src/common/logger.ts
var ConsoleLogger = class {
  constructor() {
    this.info = (...obj) => {
      console.info(...obj);
    };
    this.error = (...obj) => {
      console.error(...obj);
    };
    this.debug = (...obj) => {
      console.debug(...obj);
    };
    this.warn = (...obj) => {
      console.warn(...obj);
    };
    this.log = (...obj) => {
      console.log(...obj);
    };
  }
};
var ModeLogger = class _ModeLogger extends ConsoleLogger {
  constructor(mode) {
    super();
    this.mode = mode;
    this.info = (...obj) => {
      if (!_ModeLogger.ALLOWED_CALLS.INFO.includes(this.mode)) {
        return;
      }
      console.info(...obj);
    };
    this.error = (...obj) => {
      if (!_ModeLogger.ALLOWED_CALLS.ERROR.includes(this.mode)) {
        return;
      }
      console.error(...obj);
    };
    this.debug = (...obj) => {
      if (!_ModeLogger.ALLOWED_CALLS.DEBUG.includes(this.mode)) {
        return;
      }
      console.debug(...obj);
    };
    this.warn = (...obj) => {
      if (!_ModeLogger.ALLOWED_CALLS.WARN.includes(this.mode)) {
        return;
      }
      console.warn(...obj);
    };
    this.log = (...obj) => {
      if (!_ModeLogger.ALLOWED_CALLS.LOG.includes(this.mode)) {
        return;
      }
      console.log(...obj);
    };
  }
  static {
    this.ALLOWED_CALLS = {
      INFO: [SERVICE_WORKER_MODE.DEVELOPMENT],
      ERROR: [
        SERVICE_WORKER_MODE.DEMO,
        SERVICE_WORKER_MODE.DEVELOPMENT,
        SERVICE_WORKER_MODE.PRODUCTION
      ],
      DEBUG: [SERVICE_WORKER_MODE.DEVELOPMENT],
      WARN: [SERVICE_WORKER_MODE.DEVELOPMENT],
      LOG: [
        SERVICE_WORKER_MODE.DEMO,
        SERVICE_WORKER_MODE.DEVELOPMENT,
        SERVICE_WORKER_MODE.PRODUCTION
      ]
    };
  }
};
function getLogger(mode) {
  return new ModeLogger(mode);
}

// src/background/const.ts
var BROWSERS = {
  CHROME: "Chrome",
  FIREFOX: "Firefox",
  EDGE: "Edge"
};
var PRIVACY_PASS_API_REPLAY_HEADER = "private-token-client-replay";
var PRIVACY_PASS_API_REPLAY_URI = "https://no-reply.private-token.research.cloudflare.com";

// src/background/attesters.ts
var keyToAttesterURI = async (storage, key) => {
  const storageItem = await new Promise(
    (resolve) => storage.get([STORAGE_ID_ATTESTER_CONFIGURATION], resolve)
  );
  const attestersByIssuerKey = storageItem[STORAGE_ID_ATTESTER_CONFIGURATION];
  return attestersByIssuerKey[key];
};

// node_modules/@cloudflare/blindrsa-ts/lib/src/sjcl/index.js
var sjcl = {
  /**
   * Symmetric ciphers.
   * @namespace
   */
  cipher: {},
  /**
   * Hash functions.  Right now only SHA256 is implemented.
   * @namespace
   */
  hash: {},
  /**
   * Key exchange functions.  Right now only SRP is implemented.
   * @namespace
   */
  keyexchange: {},
  /**
   * Cipher modes of operation.
   * @namespace
   */
  mode: {},
  /**
   * Miscellaneous.  HMAC and PBKDF2.
   * @namespace
   */
  misc: {},
  /**
   * Bit array encoders and decoders.
   * @namespace
   *
   * @description
   * The members of this namespace are functions which translate between
   * SJCL's bitArrays and other objects (usually strings).  Because it
   * isn't always clear which direction is encoding and which is decoding,
   * the method names are "fromBits" and "toBits".
   */
  codec: {},
  /**
   * Exceptions.
   * @namespace
   */
  exception: {
    /**
     * Ciphertext is corrupt.
     * @constructor
     */
    corrupt: function(message) {
      this.toString = function() {
        return "CORRUPT: " + this.message;
      };
      this.message = message;
    },
    /**
     * Invalid parameter.
     * @constructor
     */
    invalid: function(message) {
      this.toString = function() {
        return "INVALID: " + this.message;
      };
      this.message = message;
    },
    /**
     * Bug or missing feature in SJCL.
     * @constructor
     */
    bug: function(message) {
      this.toString = function() {
        return "BUG: " + this.message;
      };
      this.message = message;
    },
    /**
     * Something isn't ready.
     * @constructor
     */
    notReady: function(message) {
      this.toString = function() {
        return "NOT READY: " + this.message;
      };
      this.message = message;
    }
  }
};
sjcl.cipher.aes = function(key) {
  if (!this._tables[0][0][0]) {
    this._precompute();
  }
  var i, j, tmp, encKey, decKey, sbox = this._tables[0][4], decTable = this._tables[1], keyLen = key.length, rcon = 1;
  if (keyLen !== 4 && keyLen !== 6 && keyLen !== 8) {
    throw new sjcl.exception.invalid("invalid aes key size");
  }
  this._key = [encKey = key.slice(0), decKey = []];
  for (i = keyLen; i < 4 * keyLen + 28; i++) {
    tmp = encKey[i - 1];
    if (i % keyLen === 0 || keyLen === 8 && i % keyLen === 4) {
      tmp = sbox[tmp >>> 24] << 24 ^ sbox[tmp >> 16 & 255] << 16 ^ sbox[tmp >> 8 & 255] << 8 ^ sbox[tmp & 255];
      if (i % keyLen === 0) {
        tmp = tmp << 8 ^ tmp >>> 24 ^ rcon << 24;
        rcon = rcon << 1 ^ (rcon >> 7) * 283;
      }
    }
    encKey[i] = encKey[i - keyLen] ^ tmp;
  }
  for (j = 0; i; j++, i--) {
    tmp = encKey[j & 3 ? i : i - 4];
    if (i <= 4 || j < 4) {
      decKey[j] = tmp;
    } else {
      decKey[j] = decTable[0][sbox[tmp >>> 24]] ^ decTable[1][sbox[tmp >> 16 & 255]] ^ decTable[2][sbox[tmp >> 8 & 255]] ^ decTable[3][sbox[tmp & 255]];
    }
  }
};
sjcl.cipher.aes.prototype = {
  // public
  /* Something like this might appear here eventually
  name: "AES",
  blockSize: 4,
  keySizes: [4,6,8],
  */
  /**
   * Encrypt an array of 4 big-endian words.
   * @param {Array} data The plaintext.
   * @return {Array} The ciphertext.
   */
  encrypt: function(data) {
    return this._crypt(data, 0);
  },
  /**
   * Decrypt an array of 4 big-endian words.
   * @param {Array} data The ciphertext.
   * @return {Array} The plaintext.
   */
  decrypt: function(data) {
    return this._crypt(data, 1);
  },
  /**
   * The expanded S-box and inverse S-box tables.  These will be computed
   * on the client so that we don't have to send them down the wire.
   *
   * There are two tables, _tables[0] is for encryption and
   * _tables[1] is for decryption.
   *
   * The first 4 sub-tables are the expanded S-box with MixColumns.  The
   * last (_tables[01][4]) is the S-box itself.
   *
   * @private
   */
  _tables: [[[], [], [], [], []], [[], [], [], [], []]],
  /**
   * Expand the S-box tables.
   *
   * @private
   */
  _precompute: function() {
    var encTable = this._tables[0], decTable = this._tables[1], sbox = encTable[4], sboxInv = decTable[4], i, x, xInv, d = [], th = [], x2, x4, x8, s, tEnc, tDec;
    for (i = 0; i < 256; i++) {
      th[(d[i] = i << 1 ^ (i >> 7) * 283) ^ i] = i;
    }
    for (x = xInv = 0; !sbox[x]; x ^= x2 || 1, xInv = th[xInv] || 1) {
      s = xInv ^ xInv << 1 ^ xInv << 2 ^ xInv << 3 ^ xInv << 4;
      s = s >> 8 ^ s & 255 ^ 99;
      sbox[x] = s;
      sboxInv[s] = x;
      x8 = d[x4 = d[x2 = d[x]]];
      tDec = x8 * 16843009 ^ x4 * 65537 ^ x2 * 257 ^ x * 16843008;
      tEnc = d[s] * 257 ^ s * 16843008;
      for (i = 0; i < 4; i++) {
        encTable[i][x] = tEnc = tEnc << 24 ^ tEnc >>> 8;
        decTable[i][s] = tDec = tDec << 24 ^ tDec >>> 8;
      }
    }
    for (i = 0; i < 5; i++) {
      encTable[i] = encTable[i].slice(0);
      decTable[i] = decTable[i].slice(0);
    }
  },
  /**
   * Encryption and decryption core.
   * @param {Array} input Four words to be encrypted or decrypted.
   * @param dir The direction, 0 for encrypt and 1 for decrypt.
   * @return {Array} The four encrypted or decrypted words.
   * @private
   */
  _crypt: function(input, dir) {
    if (input.length !== 4) {
      throw new sjcl.exception.invalid("invalid aes block size");
    }
    var key = this._key[dir], a = input[0] ^ key[0], b = input[dir ? 3 : 1] ^ key[1], c = input[2] ^ key[2], d = input[dir ? 1 : 3] ^ key[3], a2, b2, c2, nInnerRounds = key.length / 4 - 2, i, kIndex = 4, out = [0, 0, 0, 0], table = this._tables[dir], t0 = table[0], t1 = table[1], t2 = table[2], t3 = table[3], sbox = table[4];
    for (i = 0; i < nInnerRounds; i++) {
      a2 = t0[a >>> 24] ^ t1[b >> 16 & 255] ^ t2[c >> 8 & 255] ^ t3[d & 255] ^ key[kIndex];
      b2 = t0[b >>> 24] ^ t1[c >> 16 & 255] ^ t2[d >> 8 & 255] ^ t3[a & 255] ^ key[kIndex + 1];
      c2 = t0[c >>> 24] ^ t1[d >> 16 & 255] ^ t2[a >> 8 & 255] ^ t3[b & 255] ^ key[kIndex + 2];
      d = t0[d >>> 24] ^ t1[a >> 16 & 255] ^ t2[b >> 8 & 255] ^ t3[c & 255] ^ key[kIndex + 3];
      kIndex += 4;
      a = a2;
      b = b2;
      c = c2;
    }
    for (i = 0; i < 4; i++) {
      out[dir ? 3 & -i : i] = sbox[a >>> 24] << 24 ^ sbox[b >> 16 & 255] << 16 ^ sbox[c >> 8 & 255] << 8 ^ sbox[d & 255] ^ key[kIndex++];
      a2 = a;
      a = b;
      b = c;
      c = d;
      d = a2;
    }
    return out;
  }
};
sjcl.bitArray = {
  /**
   * Array slices in units of bits.
   * @param {bitArray} a The array to slice.
   * @param {Number} bstart The offset to the start of the slice, in bits.
   * @param {Number} bend The offset to the end of the slice, in bits.  If this is undefined,
   * slice until the end of the array.
   * @return {bitArray} The requested slice.
   */
  bitSlice: function(a, bstart, bend) {
    a = sjcl.bitArray._shiftRight(a.slice(bstart / 32), 32 - (bstart & 31)).slice(1);
    return bend === void 0 ? a : sjcl.bitArray.clamp(a, bend - bstart);
  },
  /**
   * Extract a number packed into a bit array.
   * @param {bitArray} a The array to slice.
   * @param {Number} bstart The offset to the start of the slice, in bits.
   * @param {Number} blength The length of the number to extract.
   * @return {Number} The requested slice.
   */
  extract: function(a, bstart, blength) {
    var x, sh = Math.floor(-bstart - blength & 31);
    if ((bstart + blength - 1 ^ bstart) & -32) {
      x = a[bstart / 32 | 0] << 32 - sh ^ a[bstart / 32 + 1 | 0] >>> sh;
    } else {
      x = a[bstart / 32 | 0] >>> sh;
    }
    return x & (1 << blength) - 1;
  },
  /**
   * Concatenate two bit arrays.
   * @param {bitArray} a1 The first array.
   * @param {bitArray} a2 The second array.
   * @return {bitArray} The concatenation of a1 and a2.
   */
  concat: function(a1, a2) {
    if (a1.length === 0 || a2.length === 0) {
      return a1.concat(a2);
    }
    var last = a1[a1.length - 1], shift = sjcl.bitArray.getPartial(last);
    if (shift === 32) {
      return a1.concat(a2);
    } else {
      return sjcl.bitArray._shiftRight(a2, shift, last | 0, a1.slice(0, a1.length - 1));
    }
  },
  /**
   * Find the length of an array of bits.
   * @param {bitArray} a The array.
   * @return {Number} The length of a, in bits.
   */
  bitLength: function(a) {
    var l = a.length, x;
    if (l === 0) {
      return 0;
    }
    x = a[l - 1];
    return (l - 1) * 32 + sjcl.bitArray.getPartial(x);
  },
  /**
   * Truncate an array.
   * @param {bitArray} a The array.
   * @param {Number} len The length to truncate to, in bits.
   * @return {bitArray} A new array, truncated to len bits.
   */
  clamp: function(a, len) {
    if (a.length * 32 < len) {
      return a;
    }
    a = a.slice(0, Math.ceil(len / 32));
    var l = a.length;
    len = len & 31;
    if (l > 0 && len) {
      a[l - 1] = sjcl.bitArray.partial(len, a[l - 1] & 2147483648 >> len - 1, 1);
    }
    return a;
  },
  /**
   * Make a partial word for a bit array.
   * @param {Number} len The number of bits in the word.
   * @param {Number} x The bits.
   * @param {Number} [_end=0] Pass 1 if x has already been shifted to the high side.
   * @return {Number} The partial word.
   */
  partial: function(len, x, _end) {
    if (len === 32) {
      return x;
    }
    return (_end ? x | 0 : x << 32 - len) + len * 1099511627776;
  },
  /**
   * Get the number of bits used by a partial word.
   * @param {Number} x The partial word.
   * @return {Number} The number of bits used by the partial word.
   */
  getPartial: function(x) {
    return Math.round(x / 1099511627776) || 32;
  },
  /**
   * Compare two arrays for equality in a predictable amount of time.
   * @param {bitArray} a The first array.
   * @param {bitArray} b The second array.
   * @return {boolean} true if a == b; false otherwise.
   */
  equal: function(a, b) {
    if (sjcl.bitArray.bitLength(a) !== sjcl.bitArray.bitLength(b)) {
      return false;
    }
    var x = 0, i;
    for (i = 0; i < a.length; i++) {
      x |= a[i] ^ b[i];
    }
    return x === 0;
  },
  /** Shift an array right.
   * @param {bitArray} a The array to shift.
   * @param {Number} shift The number of bits to shift.
   * @param {Number} [carry=0] A byte to carry in
   * @param {bitArray} [out=[]] An array to prepend to the output.
   * @private
   */
  _shiftRight: function(a, shift, carry, out) {
    var i, last2 = 0, shift2;
    if (out === void 0) {
      out = [];
    }
    for (; shift >= 32; shift -= 32) {
      out.push(carry);
      carry = 0;
    }
    if (shift === 0) {
      return out.concat(a);
    }
    for (i = 0; i < a.length; i++) {
      out.push(carry | a[i] >>> shift);
      carry = a[i] << 32 - shift;
    }
    last2 = a.length ? a[a.length - 1] : 0;
    shift2 = sjcl.bitArray.getPartial(last2);
    out.push(sjcl.bitArray.partial(shift + shift2 & 31, shift + shift2 > 32 ? carry : out.pop(), 1));
    return out;
  },
  /** xor a block of 4 words together.
   * @private
   */
  _xor4: function(x, y) {
    return [x[0] ^ y[0], x[1] ^ y[1], x[2] ^ y[2], x[3] ^ y[3]];
  },
  /** byteswap a word array inplace.
   * (does not handle partial words)
   * @param {sjcl.bitArray} a word array
   * @return {sjcl.bitArray} byteswapped array
   */
  byteswapM: function(a) {
    var i, v, m = 65280;
    for (i = 0; i < a.length; ++i) {
      v = a[i];
      a[i] = v >>> 24 | v >>> 8 & m | (v & m) << 8 | v << 24;
    }
    return a;
  }
};
sjcl.codec.utf8String = {
  /** Convert from a bitArray to a UTF-8 string. */
  fromBits: function(arr) {
    var out = "", bl = sjcl.bitArray.bitLength(arr), i, tmp;
    for (i = 0; i < bl / 8; i++) {
      if ((i & 3) === 0) {
        tmp = arr[i / 4];
      }
      out += String.fromCharCode(tmp >>> 8 >>> 8 >>> 8);
      tmp <<= 8;
    }
    return decodeURIComponent(escape(out));
  },
  /** Convert from a UTF-8 string to a bitArray. */
  toBits: function(str) {
    str = unescape(encodeURIComponent(str));
    var out = [], i, tmp = 0;
    for (i = 0; i < str.length; i++) {
      tmp = tmp << 8 | str.charCodeAt(i);
      if ((i & 3) === 3) {
        out.push(tmp);
        tmp = 0;
      }
    }
    if (i & 3) {
      out.push(sjcl.bitArray.partial(8 * (i & 3), tmp));
    }
    return out;
  }
};
sjcl.codec.hex = {
  /** Convert from a bitArray to a hex string. */
  fromBits: function(arr) {
    var out = "", i;
    for (i = 0; i < arr.length; i++) {
      out += ((arr[i] | 0) + 263882790666240).toString(16).substr(4);
    }
    return out.substr(0, sjcl.bitArray.bitLength(arr) / 4);
  },
  /** Convert from a hex string to a bitArray. */
  toBits: function(str) {
    var i, out = [], len;
    str = str.replace(/\s|0x/g, "");
    len = str.length;
    str = str + "00000000";
    for (i = 0; i < str.length; i += 8) {
      out.push(parseInt(str.substr(i, 8), 16) ^ 0);
    }
    return sjcl.bitArray.clamp(out, len * 4);
  }
};
sjcl.codec.base64 = {
  /** The base64 alphabet.
   * @private
   */
  _chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  /** Convert from a bitArray to a base64 string. */
  fromBits: function(arr, _noEquals, _url) {
    var out = "", i, bits = 0, c = sjcl.codec.base64._chars, ta = 0, bl = sjcl.bitArray.bitLength(arr);
    if (_url) {
      c = c.substr(0, 62) + "-_";
    }
    for (i = 0; out.length * 6 < bl; ) {
      out += c.charAt((ta ^ arr[i] >>> bits) >>> 26);
      if (bits < 6) {
        ta = arr[i] << 6 - bits;
        bits += 26;
        i++;
      } else {
        ta <<= 6;
        bits -= 6;
      }
    }
    while (out.length & 3 && !_noEquals) {
      out += "=";
    }
    return out;
  },
  /** Convert from a base64 string to a bitArray */
  toBits: function(str, _url) {
    str = str.replace(/\s|=/g, "");
    var out = [], i, bits = 0, c = sjcl.codec.base64._chars, ta = 0, x;
    if (_url) {
      c = c.substr(0, 62) + "-_";
    }
    for (i = 0; i < str.length; i++) {
      x = c.indexOf(str.charAt(i));
      if (x < 0) {
        throw new sjcl.exception.invalid("this isn't base64!");
      }
      if (bits > 26) {
        bits -= 26;
        out.push(ta ^ x >>> bits);
        ta = x << 32 - bits;
      } else {
        bits += 6;
        ta ^= x << 32 - bits;
      }
    }
    if (bits & 56) {
      out.push(sjcl.bitArray.partial(bits & 56, ta, 1));
    }
    return out;
  }
};
sjcl.codec.base64url = {
  fromBits: function(arr) {
    return sjcl.codec.base64.fromBits(arr, 1, 1);
  },
  toBits: function(str) {
    return sjcl.codec.base64.toBits(str, 1);
  }
};
sjcl.codec.bytes = {
  /** Convert from a bitArray to an array of bytes. */
  fromBits: function(arr) {
    var out = [], bl = sjcl.bitArray.bitLength(arr), i, tmp;
    for (i = 0; i < bl / 8; i++) {
      if ((i & 3) === 0) {
        tmp = arr[i / 4];
      }
      out.push(tmp >>> 24);
      tmp <<= 8;
    }
    return out;
  },
  /** Convert from an array of bytes to a bitArray. */
  toBits: function(bytes) {
    var out = [], i, tmp = 0;
    for (i = 0; i < bytes.length; i++) {
      tmp = tmp << 8 | bytes[i];
      if ((i & 3) === 3) {
        out.push(tmp);
        tmp = 0;
      }
    }
    if (i & 3) {
      out.push(sjcl.bitArray.partial(8 * (i & 3), tmp));
    }
    return out;
  }
};
sjcl.hash.sha256 = function(hash) {
  if (!this._key[0]) {
    this._precompute();
  }
  if (hash) {
    this._h = hash._h.slice(0);
    this._buffer = hash._buffer.slice(0);
    this._length = hash._length;
  } else {
    this.reset();
  }
};
sjcl.hash.sha256.hash = function(data) {
  return new sjcl.hash.sha256().update(data).finalize();
};
sjcl.hash.sha256.prototype = {
  /**
   * The hash's block size, in bits.
   * @constant
   */
  blockSize: 512,
  /**
   * Reset the hash state.
   * @return this
   */
  reset: function() {
    this._h = this._init.slice(0);
    this._buffer = [];
    this._length = 0;
    return this;
  },
  /**
   * Input several words to the hash.
   * @param {bitArray|String} data the data to hash.
   * @return this
   */
  update: function(data) {
    if (typeof data === "string") {
      data = sjcl.codec.utf8String.toBits(data);
    }
    var i, b = this._buffer = sjcl.bitArray.concat(this._buffer, data), ol = this._length, nl = this._length = ol + sjcl.bitArray.bitLength(data);
    if (nl > 9007199254740991) {
      throw new sjcl.exception.invalid("Cannot hash more than 2^53 - 1 bits");
    }
    if (typeof Uint32Array !== "undefined") {
      var c = new Uint32Array(b);
      var j = 0;
      for (i = 512 + ol - (512 + ol & 511); i <= nl; i += 512) {
        this._block(c.subarray(16 * j, 16 * (j + 1)));
        j += 1;
      }
      b.splice(0, 16 * j);
    } else {
      for (i = 512 + ol - (512 + ol & 511); i <= nl; i += 512) {
        this._block(b.splice(0, 16));
      }
    }
    return this;
  },
  /**
   * Complete hashing and output the hash value.
   * @return {bitArray} The hash value, an array of 8 big-endian words.
   */
  finalize: function() {
    var i, b = this._buffer, h = this._h;
    b = sjcl.bitArray.concat(b, [sjcl.bitArray.partial(1, 1)]);
    for (i = b.length + 2; i & 15; i++) {
      b.push(0);
    }
    b.push(Math.floor(this._length / 4294967296));
    b.push(this._length | 0);
    while (b.length) {
      this._block(b.splice(0, 16));
    }
    this.reset();
    return h;
  },
  /**
   * The SHA-256 initialization vector, to be precomputed.
   * @private
   */
  _init: [],
  /*
  _init:[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19],
  */
  /**
   * The SHA-256 hash key, to be precomputed.
   * @private
   */
  _key: [],
  /*
  _key:
    [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
     0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
     0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
     0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
     0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
     0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
     0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
     0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2],
  */
  /**
   * Function to precompute _init and _key.
   * @private
   */
  _precompute: function() {
    var i = 0, prime = 2, factor, isPrime;
    function frac(x) {
      return (x - Math.floor(x)) * 4294967296 | 0;
    }
    for (; i < 64; prime++) {
      isPrime = true;
      for (factor = 2; factor * factor <= prime; factor++) {
        if (prime % factor === 0) {
          isPrime = false;
          break;
        }
      }
      if (isPrime) {
        if (i < 8) {
          this._init[i] = frac(Math.pow(prime, 1 / 2));
        }
        this._key[i] = frac(Math.pow(prime, 1 / 3));
        i++;
      }
    }
  },
  /**
   * Perform one cycle of SHA-256.
   * @param {Uint32Array|bitArray} w one block of words.
   * @private
   */
  _block: function(w) {
    var i, tmp, a, b, h = this._h, k = this._key, h0 = h[0], h1 = h[1], h2 = h[2], h3 = h[3], h4 = h[4], h5 = h[5], h6 = h[6], h7 = h[7];
    for (i = 0; i < 64; i++) {
      if (i < 16) {
        tmp = w[i];
      } else {
        a = w[i + 1 & 15];
        b = w[i + 14 & 15];
        tmp = w[i & 15] = (a >>> 7 ^ a >>> 18 ^ a >>> 3 ^ a << 25 ^ a << 14) + (b >>> 17 ^ b >>> 19 ^ b >>> 10 ^ b << 15 ^ b << 13) + w[i & 15] + w[i + 9 & 15] | 0;
      }
      tmp = tmp + h7 + (h4 >>> 6 ^ h4 >>> 11 ^ h4 >>> 25 ^ h4 << 26 ^ h4 << 21 ^ h4 << 7) + (h6 ^ h4 & (h5 ^ h6)) + k[i];
      h7 = h6;
      h6 = h5;
      h5 = h4;
      h4 = h3 + tmp | 0;
      h3 = h2;
      h2 = h1;
      h1 = h0;
      h0 = tmp + (h1 & h2 ^ h3 & (h1 ^ h2)) + (h1 >>> 2 ^ h1 >>> 13 ^ h1 >>> 22 ^ h1 << 30 ^ h1 << 19 ^ h1 << 10) | 0;
    }
    h[0] = h[0] + h0 | 0;
    h[1] = h[1] + h1 | 0;
    h[2] = h[2] + h2 | 0;
    h[3] = h[3] + h3 | 0;
    h[4] = h[4] + h4 | 0;
    h[5] = h[5] + h5 | 0;
    h[6] = h[6] + h6 | 0;
    h[7] = h[7] + h7 | 0;
  }
};
sjcl.mode.ccm = {
  /** The name of the mode.
   * @constant
   */
  name: "ccm",
  _progressListeners: [],
  listenProgress: function(cb) {
    sjcl.mode.ccm._progressListeners.push(cb);
  },
  unListenProgress: function(cb) {
    var index = sjcl.mode.ccm._progressListeners.indexOf(cb);
    if (index > -1) {
      sjcl.mode.ccm._progressListeners.splice(index, 1);
    }
  },
  _callProgressListener: function(val) {
    var p = sjcl.mode.ccm._progressListeners.slice(), i;
    for (i = 0; i < p.length; i += 1) {
      p[i](val);
    }
  },
  /** Encrypt in CCM mode.
   * @static
   * @param {Object} prf The pseudorandom function.  It must have a block size of 16 bytes.
   * @param {bitArray} plaintext The plaintext data.
   * @param {bitArray} iv The initialization value.
   * @param {bitArray} [adata=[]] The authenticated data.
   * @param {Number} [tlen=64] the desired tag length, in bits.
   * @return {bitArray} The encrypted data, an array of bytes.
   */
  encrypt: function(prf, plaintext, iv, adata, tlen) {
    var L, out = plaintext.slice(0), tag, w = sjcl.bitArray, ivl = w.bitLength(iv) / 8, ol = w.bitLength(out) / 8;
    tlen = tlen || 64;
    adata = adata || [];
    if (ivl < 7) {
      throw new sjcl.exception.invalid("ccm: iv must be at least 7 bytes");
    }
    for (L = 2; L < 4 && ol >>> 8 * L; L++) {
    }
    if (L < 15 - ivl) {
      L = 15 - ivl;
    }
    iv = w.clamp(iv, 8 * (15 - L));
    tag = sjcl.mode.ccm._computeTag(prf, plaintext, iv, adata, tlen, L);
    out = sjcl.mode.ccm._ctrMode(prf, out, iv, tag, tlen, L);
    return w.concat(out.data, out.tag);
  },
  /** Decrypt in CCM mode.
   * @static
   * @param {Object} prf The pseudorandom function.  It must have a block size of 16 bytes.
   * @param {bitArray} ciphertext The ciphertext data.
   * @param {bitArray} iv The initialization value.
   * @param {bitArray} [adata=[]] adata The authenticated data.
   * @param {Number} [tlen=64] tlen the desired tag length, in bits.
   * @return {bitArray} The decrypted data.
   */
  decrypt: function(prf, ciphertext, iv, adata, tlen) {
    tlen = tlen || 64;
    adata = adata || [];
    var L, w = sjcl.bitArray, ivl = w.bitLength(iv) / 8, ol = w.bitLength(ciphertext), out = w.clamp(ciphertext, ol - tlen), tag = w.bitSlice(ciphertext, ol - tlen), tag2;
    ol = (ol - tlen) / 8;
    if (ivl < 7) {
      throw new sjcl.exception.invalid("ccm: iv must be at least 7 bytes");
    }
    for (L = 2; L < 4 && ol >>> 8 * L; L++) {
    }
    if (L < 15 - ivl) {
      L = 15 - ivl;
    }
    iv = w.clamp(iv, 8 * (15 - L));
    out = sjcl.mode.ccm._ctrMode(prf, out, iv, tag, tlen, L);
    tag2 = sjcl.mode.ccm._computeTag(prf, out.data, iv, adata, tlen, L);
    if (!w.equal(out.tag, tag2)) {
      throw new sjcl.exception.corrupt("ccm: tag doesn't match");
    }
    return out.data;
  },
  _macAdditionalData: function(prf, adata, iv, tlen, ol, L) {
    var mac, tmp, i, macData = [], w = sjcl.bitArray, xor2 = w._xor4;
    mac = [w.partial(8, (adata.length ? 1 << 6 : 0) | tlen - 2 << 2 | L - 1)];
    mac = w.concat(mac, iv);
    mac[3] |= ol;
    mac = prf.encrypt(mac);
    if (adata.length) {
      tmp = w.bitLength(adata) / 8;
      if (tmp <= 65279) {
        macData = [w.partial(16, tmp)];
      } else if (tmp <= 4294967295) {
        macData = w.concat([w.partial(16, 65534)], [tmp]);
      }
      macData = w.concat(macData, adata);
      for (i = 0; i < macData.length; i += 4) {
        mac = prf.encrypt(xor2(mac, macData.slice(i, i + 4).concat([0, 0, 0])));
      }
    }
    return mac;
  },
  /* Compute the (unencrypted) authentication tag, according to the CCM specification
   * @param {Object} prf The pseudorandom function.
   * @param {bitArray} plaintext The plaintext data.
   * @param {bitArray} iv The initialization value.
   * @param {bitArray} adata The authenticated data.
   * @param {Number} tlen the desired tag length, in bits.
   * @return {bitArray} The tag, but not yet encrypted.
   * @private
   */
  _computeTag: function(prf, plaintext, iv, adata, tlen, L) {
    var mac, i, w = sjcl.bitArray, xor2 = w._xor4;
    tlen /= 8;
    if (tlen % 2 || tlen < 4 || tlen > 16) {
      throw new sjcl.exception.invalid("ccm: invalid tag length");
    }
    if (adata.length > 4294967295 || plaintext.length > 4294967295) {
      throw new sjcl.exception.bug("ccm: can't deal with 4GiB or more data");
    }
    mac = sjcl.mode.ccm._macAdditionalData(prf, adata, iv, tlen, w.bitLength(plaintext) / 8, L);
    for (i = 0; i < plaintext.length; i += 4) {
      mac = prf.encrypt(xor2(mac, plaintext.slice(i, i + 4).concat([0, 0, 0])));
    }
    return w.clamp(mac, tlen * 8);
  },
  /** CCM CTR mode.
   * Encrypt or decrypt data and tag with the prf in CCM-style CTR mode.
   * May mutate its arguments.
   * @param {Object} prf The PRF.
   * @param {bitArray} data The data to be encrypted or decrypted.
   * @param {bitArray} iv The initialization vector.
   * @param {bitArray} tag The authentication tag.
   * @param {Number} tlen The length of th etag, in bits.
   * @param {Number} L The CCM L value.
   * @return {Object} An object with data and tag, the en/decryption of data and tag values.
   * @private
   */
  _ctrMode: function(prf, data, iv, tag, tlen, L) {
    var enc, i, w = sjcl.bitArray, xor2 = w._xor4, ctr, l = data.length, bl = w.bitLength(data), n = l / 50, p = n;
    ctr = w.concat([w.partial(8, L - 1)], iv).concat([0, 0, 0]).slice(0, 4);
    tag = w.bitSlice(xor2(tag, prf.encrypt(ctr)), 0, tlen);
    if (!l) {
      return { tag, data: [] };
    }
    for (i = 0; i < l; i += 4) {
      if (i > n) {
        sjcl.mode.ccm._callProgressListener(i / l);
        n += p;
      }
      ctr[3]++;
      enc = prf.encrypt(ctr);
      data[i] ^= enc[0];
      data[i + 1] ^= enc[1];
      data[i + 2] ^= enc[2];
      data[i + 3] ^= enc[3];
    }
    return { tag, data: w.clamp(data, bl) };
  }
};
sjcl.misc.hmac = function(key, Hash) {
  this._hash = Hash = Hash || sjcl.hash.sha256;
  var exKey = [[], []], i, bs = Hash.prototype.blockSize / 32;
  this._baseHash = [new Hash(), new Hash()];
  if (key.length > bs) {
    key = Hash.hash(key);
  }
  for (i = 0; i < bs; i++) {
    exKey[0][i] = key[i] ^ 909522486;
    exKey[1][i] = key[i] ^ 1549556828;
  }
  this._baseHash[0].update(exKey[0]);
  this._baseHash[1].update(exKey[1]);
  this._resultHash = new Hash(this._baseHash[0]);
};
sjcl.misc.hmac.prototype.encrypt = sjcl.misc.hmac.prototype.mac = function(data) {
  if (!this._updated) {
    this.update(data);
    return this.digest(data);
  } else {
    throw new sjcl.exception.invalid("encrypt on already updated hmac called!");
  }
};
sjcl.misc.hmac.prototype.reset = function() {
  this._resultHash = new this._hash(this._baseHash[0]);
  this._updated = false;
};
sjcl.misc.hmac.prototype.update = function(data) {
  this._updated = true;
  this._resultHash.update(data);
};
sjcl.misc.hmac.prototype.digest = function() {
  var w = this._resultHash.finalize(), result = new this._hash(this._baseHash[1]).update(w).finalize();
  this.reset();
  return result;
};
sjcl.misc.pbkdf2 = function(password, salt, count, length, Prff) {
  count = count || 1e4;
  if (length < 0 || count < 0) {
    throw new sjcl.exception.invalid("invalid params to pbkdf2");
  }
  if (typeof password === "string") {
    password = sjcl.codec.utf8String.toBits(password);
  }
  if (typeof salt === "string") {
    salt = sjcl.codec.utf8String.toBits(salt);
  }
  Prff = Prff || sjcl.misc.hmac;
  var prf = new Prff(password), u, ui, i, j, k, out = [], b = sjcl.bitArray;
  for (k = 1; 32 * out.length < (length || 1); k++) {
    u = ui = prf.encrypt(b.concat(salt, [k]));
    for (i = 1; i < count; i++) {
      ui = prf.encrypt(ui);
      for (j = 0; j < ui.length; j++) {
        u[j] ^= ui[j];
      }
    }
    out = out.concat(u);
  }
  if (length) {
    out = b.clamp(out, length);
  }
  return out;
};
sjcl.prng = function(defaultParanoia) {
  this._pools = [new sjcl.hash.sha256()];
  this._poolEntropy = [0];
  this._reseedCount = 0;
  this._robins = {};
  this._eventId = 0;
  this._collectorIds = {};
  this._collectorIdNext = 0;
  this._strength = 0;
  this._poolStrength = 0;
  this._nextReseed = 0;
  this._key = [0, 0, 0, 0, 0, 0, 0, 0];
  this._counter = [0, 0, 0, 0];
  this._cipher = void 0;
  this._defaultParanoia = defaultParanoia;
  this._collectorsStarted = false;
  this._callbacks = { progress: {}, seeded: {} };
  this._callbackI = 0;
  this._NOT_READY = 0;
  this._READY = 1;
  this._REQUIRES_RESEED = 2;
  this._MAX_WORDS_PER_BURST = 65536;
  this._PARANOIA_LEVELS = [0, 48, 64, 96, 128, 192, 256, 384, 512, 768, 1024];
  this._MILLISECONDS_PER_RESEED = 3e4;
  this._BITS_PER_RESEED = 80;
};
sjcl.prng.prototype = {
  /** Generate several random words, and return them in an array.
   * A word consists of 32 bits (4 bytes)
   * @param {Number} nwords The number of words to generate.
   */
  randomWords: function(nwords, paranoia) {
    var out = [], i, readiness = this.isReady(paranoia), g;
    if (readiness === this._NOT_READY) {
      throw new sjcl.exception.notReady("generator isn't seeded");
    } else if (readiness & this._REQUIRES_RESEED) {
      this._reseedFromPools(!(readiness & this._READY));
    }
    for (i = 0; i < nwords; i += 4) {
      if ((i + 1) % this._MAX_WORDS_PER_BURST === 0) {
        this._gate();
      }
      g = this._gen4words();
      out.push(g[0], g[1], g[2], g[3]);
    }
    this._gate();
    return out.slice(0, nwords);
  },
  setDefaultParanoia: function(paranoia, allowZeroParanoia) {
    if (paranoia === 0 && allowZeroParanoia !== "Setting paranoia=0 will ruin your security; use it only for testing") {
      throw new sjcl.exception.invalid("Setting paranoia=0 will ruin your security; use it only for testing");
    }
    this._defaultParanoia = paranoia;
  },
  /**
   * Add entropy to the pools.
   * @param data The entropic value.  Should be a 32-bit integer, array of 32-bit integers, or string
   * @param {Number} estimatedEntropy The estimated entropy of data, in bits
   * @param {String} source The source of the entropy, eg "mouse"
   */
  addEntropy: function(data, estimatedEntropy, source) {
    source = source || "user";
    var id, i, tmp, t = (/* @__PURE__ */ new Date()).valueOf(), robin = this._robins[source], oldReady = this.isReady(), err = 0, objName;
    id = this._collectorIds[source];
    if (id === void 0) {
      id = this._collectorIds[source] = this._collectorIdNext++;
    }
    if (robin === void 0) {
      robin = this._robins[source] = 0;
    }
    this._robins[source] = (this._robins[source] + 1) % this._pools.length;
    switch (typeof data) {
      case "number":
        if (estimatedEntropy === void 0) {
          estimatedEntropy = 1;
        }
        this._pools[robin].update([id, this._eventId++, 1, estimatedEntropy, t, 1, data | 0]);
        break;
      case "object":
        objName = Object.prototype.toString.call(data);
        if (objName === "[object Uint32Array]") {
          tmp = [];
          for (i = 0; i < data.length; i++) {
            tmp.push(data[i]);
          }
          data = tmp;
        } else {
          if (objName !== "[object Array]") {
            err = 1;
          }
          for (i = 0; i < data.length && !err; i++) {
            if (typeof data[i] !== "number") {
              err = 1;
            }
          }
        }
        if (!err) {
          if (estimatedEntropy === void 0) {
            estimatedEntropy = 0;
            for (i = 0; i < data.length; i++) {
              tmp = data[i];
              while (tmp > 0) {
                estimatedEntropy++;
                tmp = tmp >>> 1;
              }
            }
          }
          this._pools[robin].update([id, this._eventId++, 2, estimatedEntropy, t, data.length].concat(data));
        }
        break;
      case "string":
        if (estimatedEntropy === void 0) {
          estimatedEntropy = data.length;
        }
        this._pools[robin].update([id, this._eventId++, 3, estimatedEntropy, t, data.length]);
        this._pools[robin].update(data);
        break;
      default:
        err = 1;
    }
    if (err) {
      throw new sjcl.exception.bug("random: addEntropy only supports number, array of numbers or string");
    }
    this._poolEntropy[robin] += estimatedEntropy;
    this._poolStrength += estimatedEntropy;
    if (oldReady === this._NOT_READY) {
      if (this.isReady() !== this._NOT_READY) {
        this._fireEvent("seeded", Math.max(this._strength, this._poolStrength));
      }
      this._fireEvent("progress", this.getProgress());
    }
  },
  /** Is the generator ready? */
  isReady: function(paranoia) {
    var entropyRequired = this._PARANOIA_LEVELS[paranoia !== void 0 ? paranoia : this._defaultParanoia];
    if (this._strength && this._strength >= entropyRequired) {
      return this._poolEntropy[0] > this._BITS_PER_RESEED && (/* @__PURE__ */ new Date()).valueOf() > this._nextReseed ? this._REQUIRES_RESEED | this._READY : this._READY;
    } else {
      return this._poolStrength >= entropyRequired ? this._REQUIRES_RESEED | this._NOT_READY : this._NOT_READY;
    }
  },
  /** Get the generator's progress toward readiness, as a fraction */
  getProgress: function(paranoia) {
    var entropyRequired = this._PARANOIA_LEVELS[paranoia ? paranoia : this._defaultParanoia];
    if (this._strength >= entropyRequired) {
      return 1;
    } else {
      return this._poolStrength > entropyRequired ? 1 : this._poolStrength / entropyRequired;
    }
  },
  /** start the built-in entropy collectors */
  startCollectors: function() {
    if (this._collectorsStarted) {
      return;
    }
    this._eventListener = {
      loadTimeCollector: this._bind(this._loadTimeCollector),
      mouseCollector: this._bind(this._mouseCollector),
      keyboardCollector: this._bind(this._keyboardCollector),
      accelerometerCollector: this._bind(this._accelerometerCollector),
      touchCollector: this._bind(this._touchCollector)
    };
    if (window.addEventListener) {
      window.addEventListener("load", this._eventListener.loadTimeCollector, false);
      window.addEventListener("mousemove", this._eventListener.mouseCollector, false);
      window.addEventListener("keypress", this._eventListener.keyboardCollector, false);
      window.addEventListener("devicemotion", this._eventListener.accelerometerCollector, false);
      window.addEventListener("touchmove", this._eventListener.touchCollector, false);
    } else if (document.attachEvent) {
      document.attachEvent("onload", this._eventListener.loadTimeCollector);
      document.attachEvent("onmousemove", this._eventListener.mouseCollector);
      document.attachEvent("keypress", this._eventListener.keyboardCollector);
    } else {
      throw new sjcl.exception.bug("can't attach event");
    }
    this._collectorsStarted = true;
  },
  /** stop the built-in entropy collectors */
  stopCollectors: function() {
    if (!this._collectorsStarted) {
      return;
    }
    if (window.removeEventListener) {
      window.removeEventListener("load", this._eventListener.loadTimeCollector, false);
      window.removeEventListener("mousemove", this._eventListener.mouseCollector, false);
      window.removeEventListener("keypress", this._eventListener.keyboardCollector, false);
      window.removeEventListener("devicemotion", this._eventListener.accelerometerCollector, false);
      window.removeEventListener("touchmove", this._eventListener.touchCollector, false);
    } else if (document.detachEvent) {
      document.detachEvent("onload", this._eventListener.loadTimeCollector);
      document.detachEvent("onmousemove", this._eventListener.mouseCollector);
      document.detachEvent("keypress", this._eventListener.keyboardCollector);
    }
    this._collectorsStarted = false;
  },
  /* use a cookie to store entropy.
  useCookie: function (all_cookies) {
      throw new sjcl.exception.bug("random: useCookie is unimplemented");
  },*/
  /** add an event listener for progress or seeded-ness. */
  addEventListener: function(name, callback) {
    this._callbacks[name][this._callbackI++] = callback;
  },
  /** remove an event listener for progress or seeded-ness */
  removeEventListener: function(name, cb) {
    var i, j, cbs = this._callbacks[name], jsTemp = [];
    for (j in cbs) {
      if (cbs.hasOwnProperty(j) && cbs[j] === cb) {
        jsTemp.push(j);
      }
    }
    for (i = 0; i < jsTemp.length; i++) {
      j = jsTemp[i];
      delete cbs[j];
    }
  },
  _bind: function(func) {
    var that = this;
    return function() {
      func.apply(that, arguments);
    };
  },
  /** Generate 4 random words, no reseed, no gate.
   * @private
   */
  _gen4words: function() {
    for (var i = 0; i < 4; i++) {
      this._counter[i] = this._counter[i] + 1 | 0;
      if (this._counter[i]) {
        break;
      }
    }
    return this._cipher.encrypt(this._counter);
  },
  /* Rekey the AES instance with itself after a request, or every _MAX_WORDS_PER_BURST words.
   * @private
   */
  _gate: function() {
    this._key = this._gen4words().concat(this._gen4words());
    this._cipher = new sjcl.cipher.aes(this._key);
  },
  /** Reseed the generator with the given words
   * @private
   */
  _reseed: function(seedWords) {
    this._key = sjcl.hash.sha256.hash(this._key.concat(seedWords));
    this._cipher = new sjcl.cipher.aes(this._key);
    for (var i = 0; i < 4; i++) {
      this._counter[i] = this._counter[i] + 1 | 0;
      if (this._counter[i]) {
        break;
      }
    }
  },
  /** reseed the data from the entropy pools
   * @param full If set, use all the entropy pools in the reseed.
   */
  _reseedFromPools: function(full) {
    var reseedData = [], strength = 0, i;
    this._nextReseed = reseedData[0] = (/* @__PURE__ */ new Date()).valueOf() + this._MILLISECONDS_PER_RESEED;
    for (i = 0; i < 16; i++) {
      reseedData.push(Math.random() * 4294967296 | 0);
    }
    for (i = 0; i < this._pools.length; i++) {
      reseedData = reseedData.concat(this._pools[i].finalize());
      strength += this._poolEntropy[i];
      this._poolEntropy[i] = 0;
      if (!full && this._reseedCount & 1 << i) {
        break;
      }
    }
    if (this._reseedCount >= 1 << this._pools.length) {
      this._pools.push(new sjcl.hash.sha256());
      this._poolEntropy.push(0);
    }
    this._poolStrength -= strength;
    if (strength > this._strength) {
      this._strength = strength;
    }
    this._reseedCount++;
    this._reseed(reseedData);
  },
  _keyboardCollector: function() {
    this._addCurrentTimeToEntropy(1);
  },
  _mouseCollector: function(ev) {
    var x, y;
    try {
      x = ev.x || ev.clientX || ev.offsetX || 0;
      y = ev.y || ev.clientY || ev.offsetY || 0;
    } catch (err) {
      x = 0;
      y = 0;
    }
    if (x != 0 && y != 0) {
      this.addEntropy([x, y], 2, "mouse");
    }
    this._addCurrentTimeToEntropy(0);
  },
  _touchCollector: function(ev) {
    var touch = ev.touches[0] || ev.changedTouches[0];
    var x = touch.pageX || touch.clientX, y = touch.pageY || touch.clientY;
    this.addEntropy([x, y], 1, "touch");
    this._addCurrentTimeToEntropy(0);
  },
  _loadTimeCollector: function() {
    this._addCurrentTimeToEntropy(2);
  },
  _addCurrentTimeToEntropy: function(estimatedEntropy) {
    if (typeof window !== "undefined" && window.performance && typeof window.performance.now === "function") {
      this.addEntropy(window.performance.now(), estimatedEntropy, "loadtime");
    } else {
      this.addEntropy((/* @__PURE__ */ new Date()).valueOf(), estimatedEntropy, "loadtime");
    }
  },
  _accelerometerCollector: function(ev) {
    var ac = ev.accelerationIncludingGravity.x || ev.accelerationIncludingGravity.y || ev.accelerationIncludingGravity.z;
    if (window.orientation) {
      var or = window.orientation;
      if (typeof or === "number") {
        this.addEntropy(or, 1, "accelerometer");
      }
    }
    if (ac) {
      this.addEntropy(ac, 2, "accelerometer");
    }
    this._addCurrentTimeToEntropy(0);
  },
  _fireEvent: function(name, arg) {
    var j, cbs = sjcl.random._callbacks[name], cbsTemp = [];
    for (j in cbs) {
      if (cbs.hasOwnProperty(j)) {
        cbsTemp.push(cbs[j]);
      }
    }
    for (j = 0; j < cbsTemp.length; j++) {
      cbsTemp[j](arg);
    }
  }
};
sjcl.random = new sjcl.prng(6);
(function() {
  function getCryptoModule() {
    try {
      return __require("crypto");
    } catch (e) {
      return null;
    }
  }
  try {
    var buf, crypt, ab;
    if (typeof module !== "undefined" && module.exports && (crypt = getCryptoModule()) && crypt.randomBytes) {
      buf = crypt.randomBytes(1024 / 8);
      buf = new Uint32Array(new Uint8Array(buf).buffer);
      sjcl.random.addEntropy(buf, 1024, "crypto.randomBytes");
    } else if (typeof window !== "undefined" && typeof Uint32Array !== "undefined") {
      ab = new Uint32Array(32);
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(ab);
      } else if (window.msCrypto && window.msCrypto.getRandomValues) {
        window.msCrypto.getRandomValues(ab);
      } else {
        return;
      }
      sjcl.random.addEntropy(ab, 1024, "crypto.getRandomValues");
    } else {
    }
  } catch (e) {
    if (typeof window !== "undefined" && window.console) {
      console.log("There was an error collecting entropy from the browser:");
      console.log(e);
    }
  }
})();
sjcl.json = {
  /** Default values for encryption */
  defaults: { v: 1, iter: 1e4, ks: 128, ts: 64, mode: "ccm", adata: "", cipher: "aes" },
  /** Simple encryption function.
   * @param {String|bitArray} password The password or key.
   * @param {String} plaintext The data to encrypt.
   * @param {Object} [params] The parameters including tag, iv and salt.
   * @param {Object} [rp] A returned version with filled-in parameters.
   * @return {Object} The cipher raw data.
   * @throws {sjcl.exception.invalid} if a parameter is invalid.
   */
  _encrypt: function(password, plaintext, params, rp) {
    params = params || {};
    rp = rp || {};
    var j = sjcl.json, p = j._add({ iv: sjcl.random.randomWords(4, 0) }, j.defaults), tmp, prp, adata;
    j._add(p, params);
    adata = p.adata;
    if (typeof p.salt === "string") {
      p.salt = sjcl.codec.base64.toBits(p.salt);
    }
    if (typeof p.iv === "string") {
      p.iv = sjcl.codec.base64.toBits(p.iv);
    }
    if (!sjcl.mode[p.mode] || !sjcl.cipher[p.cipher] || typeof password === "string" && p.iter <= 100 || p.ts !== 64 && p.ts !== 96 && p.ts !== 128 || p.ks !== 128 && p.ks !== 192 && p.ks !== 256 || (p.iv.length < 2 || p.iv.length > 4)) {
      throw new sjcl.exception.invalid("json encrypt: invalid parameters");
    }
    if (typeof password === "string") {
      tmp = sjcl.misc.cachedPbkdf2(password, p);
      password = tmp.key.slice(0, p.ks / 32);
      p.salt = tmp.salt;
    } else if (sjcl.ecc && password instanceof sjcl.ecc.elGamal.publicKey) {
      tmp = password.kem();
      p.kemtag = tmp.tag;
      password = tmp.key.slice(0, p.ks / 32);
    }
    if (typeof plaintext === "string") {
      plaintext = sjcl.codec.utf8String.toBits(plaintext);
    }
    if (typeof adata === "string") {
      p.adata = adata = sjcl.codec.utf8String.toBits(adata);
    }
    prp = new sjcl.cipher[p.cipher](password);
    j._add(rp, p);
    rp.key = password;
    if (p.mode === "ccm" && sjcl.arrayBuffer && sjcl.arrayBuffer.ccm && plaintext instanceof ArrayBuffer) {
      p.ct = sjcl.arrayBuffer.ccm.encrypt(prp, plaintext, p.iv, adata, p.ts);
    } else {
      p.ct = sjcl.mode[p.mode].encrypt(prp, plaintext, p.iv, adata, p.ts);
    }
    return p;
  },
  /** Simple encryption function.
   * @param {String|bitArray} password The password or key.
   * @param {String} plaintext The data to encrypt.
   * @param {Object} [params] The parameters including tag, iv and salt.
   * @param {Object} [rp] A returned version with filled-in parameters.
   * @return {String} The ciphertext serialized data.
   * @throws {sjcl.exception.invalid} if a parameter is invalid.
   */
  encrypt: function(password, plaintext, params, rp) {
    var j = sjcl.json, p = j._encrypt.apply(j, arguments);
    return j.encode(p);
  },
  /** Simple decryption function.
   * @param {String|bitArray} password The password or key.
   * @param {Object} ciphertext The cipher raw data to decrypt.
   * @param {Object} [params] Additional non-default parameters.
   * @param {Object} [rp] A returned object with filled parameters.
   * @return {String} The plaintext.
   * @throws {sjcl.exception.invalid} if a parameter is invalid.
   * @throws {sjcl.exception.corrupt} if the ciphertext is corrupt.
   */
  _decrypt: function(password, ciphertext, params, rp) {
    params = params || {};
    rp = rp || {};
    var j = sjcl.json, p = j._add(j._add(j._add({}, j.defaults), ciphertext), params, true), ct, tmp, prp, adata = p.adata;
    if (typeof p.salt === "string") {
      p.salt = sjcl.codec.base64.toBits(p.salt);
    }
    if (typeof p.iv === "string") {
      p.iv = sjcl.codec.base64.toBits(p.iv);
    }
    if (!sjcl.mode[p.mode] || !sjcl.cipher[p.cipher] || typeof password === "string" && p.iter <= 100 || p.ts !== 64 && p.ts !== 96 && p.ts !== 128 || p.ks !== 128 && p.ks !== 192 && p.ks !== 256 || !p.iv || (p.iv.length < 2 || p.iv.length > 4)) {
      throw new sjcl.exception.invalid("json decrypt: invalid parameters");
    }
    if (typeof password === "string") {
      tmp = sjcl.misc.cachedPbkdf2(password, p);
      password = tmp.key.slice(0, p.ks / 32);
      p.salt = tmp.salt;
    } else if (sjcl.ecc && password instanceof sjcl.ecc.elGamal.secretKey) {
      password = password.unkem(sjcl.codec.base64.toBits(p.kemtag)).slice(0, p.ks / 32);
    }
    if (typeof adata === "string") {
      adata = sjcl.codec.utf8String.toBits(adata);
    }
    prp = new sjcl.cipher[p.cipher](password);
    if (p.mode === "ccm" && sjcl.arrayBuffer && sjcl.arrayBuffer.ccm && p.ct instanceof ArrayBuffer) {
      ct = sjcl.arrayBuffer.ccm.decrypt(prp, p.ct, p.iv, p.tag, adata, p.ts);
    } else {
      ct = sjcl.mode[p.mode].decrypt(prp, p.ct, p.iv, adata, p.ts);
    }
    j._add(rp, p);
    rp.key = password;
    if (params.raw === 1) {
      return ct;
    } else {
      return sjcl.codec.utf8String.fromBits(ct);
    }
  },
  /** Simple decryption function.
   * @param {String|bitArray} password The password or key.
   * @param {String} ciphertext The ciphertext to decrypt.
   * @param {Object} [params] Additional non-default parameters.
   * @param {Object} [rp] A returned object with filled parameters.
   * @return {String} The plaintext.
   * @throws {sjcl.exception.invalid} if a parameter is invalid.
   * @throws {sjcl.exception.corrupt} if the ciphertext is corrupt.
   */
  decrypt: function(password, ciphertext, params, rp) {
    var j = sjcl.json;
    return j._decrypt(password, j.decode(ciphertext), params, rp);
  },
  /** Encode a flat structure into a JSON string.
   * @param {Object} obj The structure to encode.
   * @return {String} A JSON string.
   * @throws {sjcl.exception.invalid} if obj has a non-alphanumeric property.
   * @throws {sjcl.exception.bug} if a parameter has an unsupported type.
   */
  encode: function(obj) {
    var i, out = "{", comma = "";
    for (i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (!i.match(/^[a-z0-9]+$/i)) {
          throw new sjcl.exception.invalid("json encode: invalid property name");
        }
        out += comma + '"' + i + '":';
        comma = ",";
        switch (typeof obj[i]) {
          case "number":
          case "boolean":
            out += obj[i];
            break;
          case "string":
            out += '"' + escape(obj[i]) + '"';
            break;
          case "object":
            out += '"' + sjcl.codec.base64.fromBits(obj[i], 0) + '"';
            break;
          default:
            throw new sjcl.exception.bug("json encode: unsupported type");
        }
      }
    }
    return out + "}";
  },
  /** Decode a simple (flat) JSON string into a structure.  The ciphertext,
   * adata, salt and iv will be base64-decoded.
   * @param {String} str The string.
   * @return {Object} The decoded structure.
   * @throws {sjcl.exception.invalid} if str isn't (simple) JSON.
   */
  decode: function(str) {
    str = str.replace(/\s/g, "");
    if (!str.match(/^\{.*\}$/)) {
      throw new sjcl.exception.invalid("json decode: this isn't json!");
    }
    var a = str.replace(/^\{|\}$/g, "").split(/,/), out = {}, i, m;
    for (i = 0; i < a.length; i++) {
      if (!(m = a[i].match(/^\s*(?:(["']?)([a-z][a-z0-9]*)\1)\s*:\s*(?:(-?\d+)|"([a-z0-9+\/%*_.@=\-]*)"|(true|false))$/i))) {
        throw new sjcl.exception.invalid("json decode: this isn't json!");
      }
      if (m[3] != null) {
        out[m[2]] = parseInt(m[3], 10);
      } else if (m[4] != null) {
        out[m[2]] = m[2].match(/^(ct|adata|salt|iv)$/) ? sjcl.codec.base64.toBits(m[4]) : unescape(m[4]);
      } else if (m[5] != null) {
        out[m[2]] = m[5] === "true";
      }
    }
    return out;
  },
  /** Insert all elements of src into target, modifying and returning target.
   * @param {Object} target The object to be modified.
   * @param {Object} src The object to pull data from.
   * @param {boolean} [requireSame=false] If true, throw an exception if any field of target differs from corresponding field of src.
   * @return {Object} target.
   * @private
   */
  _add: function(target, src, requireSame) {
    if (target === void 0) {
      target = {};
    }
    if (src === void 0) {
      return target;
    }
    var i;
    for (i in src) {
      if (src.hasOwnProperty(i)) {
        if (requireSame && target[i] !== void 0 && target[i] !== src[i]) {
          throw new sjcl.exception.invalid("required parameter overridden");
        }
        target[i] = src[i];
      }
    }
    return target;
  },
  /** Remove all elements of minus from plus.  Does not modify plus.
   * @private
   */
  _subtract: function(plus, minus) {
    var out = {}, i;
    for (i in plus) {
      if (plus.hasOwnProperty(i) && plus[i] !== minus[i]) {
        out[i] = plus[i];
      }
    }
    return out;
  },
  /** Return only the specified elements of src.
   * @private
   */
  _filter: function(src, filter) {
    var out = {}, i;
    for (i = 0; i < filter.length; i++) {
      if (src[filter[i]] !== void 0) {
        out[filter[i]] = src[filter[i]];
      }
    }
    return out;
  }
};
sjcl.encrypt = sjcl.json.encrypt;
sjcl.decrypt = sjcl.json.decrypt;
sjcl.misc._pbkdf2Cache = {};
sjcl.misc.cachedPbkdf2 = function(password, obj) {
  var cache = sjcl.misc._pbkdf2Cache, c, cp, str, salt, iter;
  obj = obj || {};
  iter = obj.iter || 1e3;
  cp = cache[password] = cache[password] || {};
  c = cp[iter] = cp[iter] || { firstSalt: obj.salt && obj.salt.length ? obj.salt.slice(0) : sjcl.random.randomWords(2, 0) };
  salt = obj.salt === void 0 ? c.firstSalt : obj.salt;
  c[salt] = c[salt] || sjcl.misc.pbkdf2(password, salt, obj.iter);
  return { key: c[salt].slice(0), salt: salt.slice(0) };
};
sjcl.bn = function(it) {
  this.initWith(it);
};
sjcl.bn.prototype = {
  radix: 24,
  maxMul: 8,
  _class: sjcl.bn,
  copy: function() {
    return new this._class(this);
  },
  /**
   * Initializes this with it, either as a bn, a number, or a hex string.
   */
  initWith: function(it) {
    var i = 0, k;
    switch (typeof it) {
      case "object":
        this.limbs = it.limbs.slice(0);
        break;
      case "number":
        this.limbs = [it];
        this.normalize();
        break;
      case "string":
        it = it.replace(/^0x/, "");
        this.limbs = [];
        k = this.radix / 4;
        for (i = 0; i < it.length; i += k) {
          this.limbs.push(parseInt(it.substring(Math.max(it.length - i - k, 0), it.length - i), 16));
        }
        break;
      default:
        this.limbs = [0];
    }
    return this;
  },
  /**
   * Returns true if "this" and "that" are equal.  Calls fullReduce().
   * Equality test is in constant time.
   */
  equals: function(that) {
    if (typeof that === "number") {
      that = new this._class(that);
    }
    var difference = 0, i;
    this.fullReduce();
    that.fullReduce();
    for (i = 0; i < this.limbs.length || i < that.limbs.length; i++) {
      difference |= this.getLimb(i) ^ that.getLimb(i);
    }
    return difference === 0;
  },
  /**
   * Get the i'th limb of this, zero if i is too large.
   */
  getLimb: function(i) {
    return i >= this.limbs.length ? 0 : this.limbs[i];
  },
  /**
   * Constant time comparison function.
   * Returns 1 if this >= that, or zero otherwise.
   */
  greaterEquals: function(that) {
    if (typeof that === "number") {
      that = new this._class(that);
    }
    var less = 0, greater = 0, i, a, b;
    i = Math.max(this.limbs.length, that.limbs.length) - 1;
    for (; i >= 0; i--) {
      a = this.getLimb(i);
      b = that.getLimb(i);
      greater |= b - a & ~less;
      less |= a - b & ~greater;
    }
    return (greater | ~less) >>> 31;
  },
  /**
   * Convert to a hex string.
   */
  toString: function() {
    this.fullReduce();
    var out = "", i, s, l = this.limbs;
    for (i = 0; i < this.limbs.length; i++) {
      s = l[i].toString(16);
      while (i < this.limbs.length - 1 && s.length < 6) {
        s = "0" + s;
      }
      out = s + out;
    }
    return "0x" + out;
  },
  /** this += that.  Does not normalize. */
  addM: function(that) {
    if (typeof that !== "object") {
      that = new this._class(that);
    }
    var i, l = this.limbs, ll = that.limbs;
    for (i = l.length; i < ll.length; i++) {
      l[i] = 0;
    }
    for (i = 0; i < ll.length; i++) {
      l[i] += ll[i];
    }
    return this;
  },
  /** this *= 2.  Requires normalized; ends up normalized. */
  doubleM: function() {
    var i, carry = 0, tmp, r = this.radix, m = this.radixMask, l = this.limbs;
    for (i = 0; i < l.length; i++) {
      tmp = l[i];
      tmp = tmp + tmp + carry;
      l[i] = tmp & m;
      carry = tmp >> r;
    }
    if (carry) {
      l.push(carry);
    }
    return this;
  },
  /** this /= 2, rounded down.  Requires normalized; ends up normalized. */
  halveM: function() {
    var i, carry = 0, tmp, r = this.radix, l = this.limbs;
    for (i = l.length - 1; i >= 0; i--) {
      tmp = l[i];
      l[i] = tmp + carry >> 1;
      carry = (tmp & 1) << r;
    }
    if (!l[l.length - 1]) {
      l.pop();
    }
    return this;
  },
  /** this -= that.  Does not normalize. */
  subM: function(that) {
    if (typeof that !== "object") {
      that = new this._class(that);
    }
    var i, l = this.limbs, ll = that.limbs;
    for (i = l.length; i < ll.length; i++) {
      l[i] = 0;
    }
    for (i = 0; i < ll.length; i++) {
      l[i] -= ll[i];
    }
    return this;
  },
  mod: function(that) {
    var neg = !this.greaterEquals(new sjcl.bn(0));
    that = new sjcl.bn(that).normalize();
    var out = new sjcl.bn(this).normalize(), ci = 0;
    if (neg)
      out = new sjcl.bn(0).subM(out).normalize();
    for (; out.greaterEquals(that); ci++) {
      that.doubleM();
    }
    if (neg)
      out = that.sub(out).normalize();
    for (; ci > 0; ci--) {
      that.halveM();
      if (out.greaterEquals(that)) {
        out.subM(that).normalize();
      }
    }
    return out.trim();
  },
  /** return inverse mod prime p.  p must be odd. Binary extended Euclidean algorithm mod p. */
  inverseMod: function(p) {
    var a = new sjcl.bn(1), b = new sjcl.bn(0), x = new sjcl.bn(this), y = new sjcl.bn(p), tmp, i, nz = 1;
    if (!(p.limbs[0] & 1)) {
      throw new sjcl.exception.invalid("inverseMod: p must be odd");
    }
    do {
      if (x.limbs[0] & 1) {
        if (!x.greaterEquals(y)) {
          tmp = x;
          x = y;
          y = tmp;
          tmp = a;
          a = b;
          b = tmp;
        }
        x.subM(y);
        x.normalize();
        if (!a.greaterEquals(b)) {
          a.addM(p);
        }
        a.subM(b);
      }
      x.halveM();
      if (a.limbs[0] & 1) {
        a.addM(p);
      }
      a.normalize();
      a.halveM();
      for (i = nz = 0; i < x.limbs.length; i++) {
        nz |= x.limbs[i];
      }
    } while (nz);
    if (!y.equals(1)) {
      throw new sjcl.exception.invalid("inverseMod: p and x must be relatively prime");
    }
    return b;
  },
  /** this + that.  Does not normalize. */
  add: function(that) {
    return this.copy().addM(that);
  },
  /** this - that.  Does not normalize. */
  sub: function(that) {
    return this.copy().subM(that);
  },
  /** this * that.  Normalizes and reduces. */
  mul: function(that) {
    if (typeof that === "number") {
      that = new this._class(that);
    } else {
      that.normalize();
    }
    this.normalize();
    var i, j, a = this.limbs, b = that.limbs, al = a.length, bl = b.length, out = new this._class(), c = out.limbs, ai, ii = this.maxMul;
    for (i = 0; i < this.limbs.length + that.limbs.length + 1; i++) {
      c[i] = 0;
    }
    for (i = 0; i < al; i++) {
      ai = a[i];
      for (j = 0; j < bl; j++) {
        c[i + j] += ai * b[j];
      }
      if (!--ii) {
        ii = this.maxMul;
        out.cnormalize();
      }
    }
    return out.cnormalize().reduce();
  },
  /** this ^ 2.  Normalizes and reduces. */
  square: function() {
    return this.mul(this);
  },
  /** this ^ n.  Uses square-and-multiply.  Normalizes and reduces. */
  power: function(l) {
    l = new sjcl.bn(l).normalize().trim().limbs;
    var i, j, out = new this._class(1), pow = this;
    for (i = 0; i < l.length; i++) {
      for (j = 0; j < this.radix; j++) {
        if (l[i] & 1 << j) {
          out = out.mul(pow);
        }
        if (i == l.length - 1 && l[i] >> j + 1 == 0) {
          break;
        }
        pow = pow.square();
      }
    }
    return out;
  },
  /** this * that mod N */
  mulmod: function(that, N) {
    return this.mod(N).mul(that.mod(N)).mod(N);
  },
  /** this ^ x mod N */
  powermod: function(x, N) {
    x = new sjcl.bn(x);
    N = new sjcl.bn(N);
    if ((N.limbs[0] & 1) == 1) {
      var montOut = this.montpowermod(x, N);
      if (montOut != false) {
        return montOut;
      }
    }
    var i, j, l = x.normalize().trim().limbs, out = new this._class(1), pow = this;
    for (i = 0; i < l.length; i++) {
      for (j = 0; j < this.radix; j++) {
        if (l[i] & 1 << j) {
          out = out.mulmod(pow, N);
        }
        if (i == l.length - 1 && l[i] >> j + 1 == 0) {
          break;
        }
        pow = pow.mulmod(pow, N);
      }
    }
    return out;
  },
  /** this ^ x mod N with Montomery reduction */
  montpowermod: function(x, N) {
    x = new sjcl.bn(x).normalize().trim();
    N = new sjcl.bn(N);
    var i, j, radix = this.radix, out = new this._class(1), pow = this.copy();
    var R, s, wind, bitsize = x.bitLength();
    R = new sjcl.bn({
      limbs: N.copy().normalize().trim().limbs.map(function() {
        return 0;
      })
    });
    for (s = this.radix; s > 0; s--) {
      if ((N.limbs[N.limbs.length - 1] >> s & 1) == 1) {
        R.limbs[R.limbs.length - 1] = 1 << s;
        break;
      }
    }
    if (bitsize == 0) {
      return this;
    } else if (bitsize < 18) {
      wind = 1;
    } else if (bitsize < 48) {
      wind = 3;
    } else if (bitsize < 144) {
      wind = 4;
    } else if (bitsize < 768) {
      wind = 5;
    } else {
      wind = 6;
    }
    var RR = R.copy(), NN = N.copy(), RP = new sjcl.bn(1), NP = new sjcl.bn(0), RT = R.copy();
    while (RT.greaterEquals(1)) {
      RT.halveM();
      if ((RP.limbs[0] & 1) == 0) {
        RP.halveM();
        NP.halveM();
      } else {
        RP.addM(NN);
        RP.halveM();
        NP.halveM();
        NP.addM(RR);
      }
    }
    RP = RP.normalize();
    NP = NP.normalize();
    RR.doubleM();
    var R2 = RR.mulmod(RR, N);
    if (!RR.mul(RP).sub(N.mul(NP)).equals(1)) {
      return false;
    }
    var montIn = function(c) {
      return montMul(c, R2);
    }, montMul = function(a, b) {
      var k, ab, right, abBar, mask = (1 << s + 1) - 1;
      ab = a.mul(b);
      right = ab.mul(NP);
      right.limbs = right.limbs.slice(0, R.limbs.length);
      if (right.limbs.length == R.limbs.length) {
        right.limbs[R.limbs.length - 1] &= mask;
      }
      right = right.mul(N);
      abBar = ab.add(right).normalize().trim();
      abBar.limbs = abBar.limbs.slice(R.limbs.length - 1);
      for (k = 0; k < abBar.limbs.length; k++) {
        if (k > 0) {
          abBar.limbs[k - 1] |= (abBar.limbs[k] & mask) << radix - s - 1;
        }
        abBar.limbs[k] = abBar.limbs[k] >> s + 1;
      }
      if (abBar.greaterEquals(N)) {
        abBar.subM(N);
      }
      return abBar;
    }, montOut = function(c) {
      return montMul(c, 1);
    };
    pow = montIn(pow);
    out = montIn(out);
    var h, precomp = {}, cap = (1 << wind - 1) - 1;
    precomp[1] = pow.copy();
    precomp[2] = montMul(pow, pow);
    for (h = 1; h <= cap; h++) {
      precomp[2 * h + 1] = montMul(precomp[2 * h - 1], precomp[2]);
    }
    var getBit = function(exp, i2) {
      var off = i2 % exp.radix;
      return (exp.limbs[Math.floor(i2 / exp.radix)] & 1 << off) >> off;
    };
    for (i = x.bitLength() - 1; i >= 0; ) {
      if (getBit(x, i) == 0) {
        out = montMul(out, out);
        i = i - 1;
      } else {
        var l = i - wind + 1;
        while (getBit(x, l) == 0) {
          l++;
        }
        var indx = 0;
        for (j = l; j <= i; j++) {
          indx += getBit(x, j) << j - l;
          out = montMul(out, out);
        }
        out = montMul(out, precomp[indx]);
        i = l - 1;
      }
    }
    return montOut(out);
  },
  trim: function() {
    var l = this.limbs, p;
    do {
      p = l.pop();
    } while (l.length && p === 0);
    l.push(p);
    return this;
  },
  /** Reduce mod a modulus.  Stubbed for subclassing. */
  reduce: function() {
    return this;
  },
  /** Reduce and normalize. */
  fullReduce: function() {
    return this.normalize();
  },
  /** Propagate carries. */
  normalize: function() {
    var carry = 0, i, pv = this.placeVal, ipv = this.ipv, l, m, limbs = this.limbs, ll = limbs.length, mask = this.radixMask;
    for (i = 0; i < ll || carry !== 0 && carry !== -1; i++) {
      l = (limbs[i] || 0) + carry;
      m = limbs[i] = l & mask;
      carry = (l - m) * ipv;
    }
    if (carry === -1) {
      limbs[i - 1] -= pv;
    }
    this.trim();
    return this;
  },
  /** Constant-time normalize. Does not allocate additional space. */
  cnormalize: function() {
    var carry = 0, i, ipv = this.ipv, l, m, limbs = this.limbs, ll = limbs.length, mask = this.radixMask;
    for (i = 0; i < ll - 1; i++) {
      l = limbs[i] + carry;
      m = limbs[i] = l & mask;
      carry = (l - m) * ipv;
    }
    limbs[i] += carry;
    return this;
  },
  /** Serialize to a bit array */
  toBits: function(len) {
    this.fullReduce();
    len = len || this.exponent || this.bitLength();
    var i = Math.floor((len - 1) / 24), w = sjcl.bitArray, e = (len + 7 & -8) % this.radix || this.radix, out = [w.partial(e, this.getLimb(i))];
    for (i--; i >= 0; i--) {
      out = w.concat(out, [w.partial(Math.min(this.radix, len), this.getLimb(i))]);
      len -= this.radix;
    }
    return out;
  },
  /** Return the length in bits, rounded up to the nearest byte. */
  bitLength: function() {
    this.fullReduce();
    var out = this.radix * (this.limbs.length - 1), b = this.limbs[this.limbs.length - 1];
    for (; b; b >>>= 1) {
      out++;
    }
    return out + 7 & -8;
  }
};
sjcl.bn.fromBits = function(bits) {
  var Class = this, out = new Class(), words = [], w = sjcl.bitArray, t = this.prototype, l = Math.min(this.bitLength || 4294967296, w.bitLength(bits)), e = l % t.radix || t.radix;
  words[0] = w.extract(bits, 0, e);
  for (; e < l; e += t.radix) {
    words.unshift(w.extract(bits, e, t.radix));
  }
  out.limbs = words;
  return out;
};
sjcl.bn.prototype.ipv = 1 / (sjcl.bn.prototype.placeVal = Math.pow(2, sjcl.bn.prototype.radix));
sjcl.bn.prototype.radixMask = (1 << sjcl.bn.prototype.radix) - 1;
sjcl.bn.pseudoMersennePrime = function(exponent, coeff) {
  function p(it) {
    this.initWith(it);
  }
  var ppr = p.prototype = new sjcl.bn(), i, tmp, mo;
  mo = ppr.modOffset = Math.ceil(tmp = exponent / ppr.radix);
  ppr.exponent = exponent;
  ppr.offset = [];
  ppr.factor = [];
  ppr.minOffset = mo;
  ppr.fullMask = 0;
  ppr.fullOffset = [];
  ppr.fullFactor = [];
  ppr.modulus = p.modulus = new sjcl.bn(Math.pow(2, exponent));
  ppr.fullMask = 0 | -Math.pow(2, exponent % ppr.radix);
  for (i = 0; i < coeff.length; i++) {
    ppr.offset[i] = Math.floor(coeff[i][0] / ppr.radix - tmp);
    ppr.fullOffset[i] = Math.floor(coeff[i][0] / ppr.radix) - mo + 1;
    ppr.factor[i] = coeff[i][1] * Math.pow(1 / 2, exponent - coeff[i][0] + ppr.offset[i] * ppr.radix);
    ppr.fullFactor[i] = coeff[i][1] * Math.pow(1 / 2, exponent - coeff[i][0] + ppr.fullOffset[i] * ppr.radix);
    ppr.modulus.addM(new sjcl.bn(Math.pow(2, coeff[i][0]) * coeff[i][1]));
    ppr.minOffset = Math.min(ppr.minOffset, -ppr.offset[i]);
  }
  ppr._class = p;
  ppr.modulus.cnormalize();
  ppr.reduce = function() {
    var i2, k, l, mo2 = this.modOffset, limbs = this.limbs, off = this.offset, ol = this.offset.length, fac = this.factor, ll;
    i2 = this.minOffset;
    while (limbs.length > mo2) {
      l = limbs.pop();
      ll = limbs.length;
      for (k = 0; k < ol; k++) {
        limbs[ll + off[k]] -= fac[k] * l;
      }
      i2--;
      if (!i2) {
        limbs.push(0);
        this.cnormalize();
        i2 = this.minOffset;
      }
    }
    this.cnormalize();
    return this;
  };
  ppr._strongReduce = ppr.fullMask === -1 ? ppr.reduce : function() {
    var limbs = this.limbs, i2 = limbs.length - 1, k, l;
    this.reduce();
    if (i2 === this.modOffset - 1) {
      l = limbs[i2] & this.fullMask;
      limbs[i2] -= l;
      for (k = 0; k < this.fullOffset.length; k++) {
        limbs[i2 + this.fullOffset[k]] -= this.fullFactor[k] * l;
      }
      this.normalize();
    }
  };
  ppr.fullReduce = function() {
    var greater, i2;
    this._strongReduce();
    this.addM(this.modulus);
    this.addM(this.modulus);
    this.normalize();
    this._strongReduce();
    for (i2 = this.limbs.length; i2 < this.modOffset; i2++) {
      this.limbs[i2] = 0;
    }
    greater = this.greaterEquals(this.modulus);
    for (i2 = 0; i2 < this.limbs.length; i2++) {
      this.limbs[i2] -= this.modulus.limbs[i2] * greater;
    }
    this.cnormalize();
    return this;
  };
  ppr.inverse = function() {
    return this.power(this.modulus.sub(2));
  };
  p.fromBits = sjcl.bn.fromBits;
  return p;
};
var sbp = sjcl.bn.pseudoMersennePrime;
sjcl.bn.prime = {
  p127: sbp(127, [[0, -1]]),
  // Bernstein's prime for Curve25519
  p25519: sbp(255, [[0, -19]]),
  // Koblitz primes
  p192k: sbp(192, [[32, -1], [12, -1], [8, -1], [7, -1], [6, -1], [3, -1], [0, -1]]),
  p224k: sbp(224, [[32, -1], [12, -1], [11, -1], [9, -1], [7, -1], [4, -1], [1, -1], [0, -1]]),
  p256k: sbp(256, [[32, -1], [9, -1], [8, -1], [7, -1], [6, -1], [4, -1], [0, -1]]),
  // NIST primes
  p192: sbp(192, [[0, -1], [64, -1]]),
  p224: sbp(224, [[0, 1], [96, -1]]),
  p256: sbp(256, [[0, -1], [96, 1], [192, 1], [224, -1]]),
  p384: sbp(384, [[0, -1], [32, 1], [96, -1], [128, -1]]),
  p521: sbp(521, [[0, -1]])
};
sjcl.bn.random = function(modulus, paranoia) {
  if (typeof modulus !== "object") {
    modulus = new sjcl.bn(modulus);
  }
  var words, i, l = modulus.limbs.length, m = modulus.limbs[l - 1] + 1, out = new sjcl.bn();
  while (true) {
    do {
      words = sjcl.random.randomWords(l, paranoia);
      if (words[l - 1] < 0) {
        words[l - 1] += 4294967296;
      }
    } while (Math.floor(words[l - 1] / m) === Math.floor(4294967296 / m));
    words[l - 1] %= m;
    for (i = 0; i < l - 1; i++) {
      words[i] &= modulus.radixMask;
    }
    out.limbs = words;
    if (!out.greaterEquals(modulus)) {
      return out;
    }
  }
};
if (typeof ArrayBuffer === "undefined") {
  (function(globals) {
    "use strict";
    globals.ArrayBuffer = function() {
    };
    globals.DataView = function() {
    };
  })(void 0);
}
sjcl.codec.arrayBuffer = {
  /** Convert from a bitArray to an ArrayBuffer.
   * Will default to 8byte padding if padding is undefined*/
  fromBits: function(arr, padding, padding_count) {
    var out, i, ol, tmp, smallest;
    padding = padding == void 0 ? true : padding;
    padding_count = padding_count || 8;
    if (arr.length === 0) {
      return new ArrayBuffer(0);
    }
    ol = sjcl.bitArray.bitLength(arr) / 8;
    if (sjcl.bitArray.bitLength(arr) % 8 !== 0) {
      throw new sjcl.exception.invalid("Invalid bit size, must be divisble by 8 to fit in an arraybuffer correctly");
    }
    if (padding && ol % padding_count !== 0) {
      ol += padding_count - ol % padding_count;
    }
    tmp = new DataView(new ArrayBuffer(arr.length * 4));
    for (i = 0; i < arr.length; i++) {
      tmp.setUint32(i * 4, arr[i] << 32);
    }
    out = new DataView(new ArrayBuffer(ol));
    if (out.byteLength === tmp.byteLength) {
      return tmp.buffer;
    }
    smallest = tmp.byteLength < out.byteLength ? tmp.byteLength : out.byteLength;
    for (i = 0; i < smallest; i++) {
      out.setUint8(i, tmp.getUint8(i));
    }
    return out.buffer;
  },
  /** Convert from an ArrayBuffer to a bitArray. */
  toBits: function(buffer) {
    var i, out = [], len, inView, tmp;
    if (buffer.byteLength === 0) {
      return [];
    }
    inView = new DataView(buffer);
    len = inView.byteLength - inView.byteLength % 4;
    for (var i = 0; i < len; i += 4) {
      out.push(inView.getUint32(i));
    }
    if (inView.byteLength % 4 != 0) {
      tmp = new DataView(new ArrayBuffer(4));
      for (var i = 0, l = inView.byteLength % 4; i < l; i++) {
        tmp.setUint8(i + 4 - l, inView.getUint8(len + i));
      }
      out.push(sjcl.bitArray.partial(inView.byteLength % 4 * 8, tmp.getUint32(0)));
    }
    return out;
  },
  /** Prints a hex output of the buffer contents, akin to hexdump **/
  hexDumpBuffer: function(buffer) {
    var stringBufferView = new DataView(buffer);
    var string = "";
    var pad = function(n, width) {
      n = n + "";
      return n.length >= width ? n : new Array(width - n.length + 1).join("0") + n;
    };
    for (var i = 0; i < stringBufferView.byteLength; i += 2) {
      if (i % 16 == 0)
        string += "\n" + i.toString(16) + "	";
      string += pad(stringBufferView.getUint16(i).toString(16), 4) + " ";
    }
    if (typeof console === void 0) {
      console = console || { log: function() {
      } };
    }
    console.log(string.toUpperCase());
  }
};
if (typeof module !== "undefined" && module.exports) {
  module.exports = sjcl;
}
if (typeof define === "function") {
  define([], function() {
    return sjcl;
  });
}
var sjcl_default = sjcl;

// node_modules/@cloudflare/blindrsa-ts/lib/src/util.js
function assertNever(name, x) {
  throw new Error(`unexpected ${name} identifier: ${x}`);
}
function getHashParams(hash) {
  switch (hash) {
    case "SHA-1":
      return { name: hash, hLen: 20 };
    case "SHA-256":
      return { name: hash, hLen: 32 };
    case "SHA-384":
      return { name: hash, hLen: 48 };
    case "SHA-512":
      return { name: hash, hLen: 64 };
    default:
      assertNever("Hash", hash);
  }
}
function os2ip(bytes) {
  return sjcl_default.bn.fromBits(sjcl_default.codec.bytes.toBits(bytes));
}
function i2osp(num, byteLength) {
  if (Math.ceil(num.bitLength() / 8) > byteLength) {
    throw new Error(`number does not fit in ${byteLength} bytes`);
  }
  const bytes = new Uint8Array(byteLength);
  const unpadded = new Uint8Array(sjcl_default.codec.bytes.fromBits(num.toBits(void 0), false));
  bytes.set(unpadded, byteLength - unpadded.length);
  return bytes;
}
function joinAll(a) {
  let size = 0;
  for (let i = 0; i < a.length; i++) {
    size += a[i].length;
  }
  const ret = new Uint8Array(new ArrayBuffer(size));
  for (let i = 0, offset = 0; i < a.length; i++) {
    ret.set(a[i], offset);
    offset += a[i].length;
  }
  return ret;
}
function xor(a, b) {
  if (a.length !== b.length || a.length === 0) {
    throw new Error("arrays of different length");
  }
  const n = a.length;
  const c = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    c[i] = a[i] ^ b[i];
  }
  return c;
}
function incCounter(c) {
  c[3]++;
  if (c[3] != 0) {
    return;
  }
  c[2]++;
  if (c[2] != 0) {
    return;
  }
  c[1]++;
  if (c[1] != 0) {
    return;
  }
  c[0]++;
  return;
}
async function mgf1(h, seed, mLen) {
  const n = Math.ceil(mLen / h.hLen);
  if (n > Math.pow(2, 32)) {
    throw new Error("mask too long");
  }
  let T = new Uint8Array();
  const counter = new Uint8Array(4);
  for (let i = 0; i < n; i++) {
    const hash = new Uint8Array(await crypto.subtle.digest(h.name, joinAll([seed, counter])));
    T = joinAll([T, hash]);
    incCounter(counter);
  }
  return T.subarray(0, mLen);
}
async function emsa_pss_encode(msg, emBits, opts, mgf = mgf1) {
  const { hash, sLen } = opts;
  const hashParams = getHashParams(hash);
  const { hLen } = hashParams;
  const emLen = Math.ceil(emBits / 8);
  const mHash = new Uint8Array(await crypto.subtle.digest(hash, msg));
  if (emLen < hLen + sLen + 2) {
    throw new Error("encoding error");
  }
  const salt = crypto.getRandomValues(new Uint8Array(sLen));
  const mPrime = joinAll([new Uint8Array(8), mHash, salt]);
  const h = new Uint8Array(await crypto.subtle.digest(hash, mPrime));
  const ps = new Uint8Array(emLen - sLen - hLen - 2);
  const db = joinAll([ps, Uint8Array.of(1), salt]);
  const dbMask = await mgf(hashParams, h, emLen - hLen - 1);
  const maskedDB = xor(db, dbMask);
  maskedDB[0] &= 255 >> 8 * emLen - emBits;
  const em = joinAll([maskedDB, h, Uint8Array.of(188)]);
  return em;
}
function rsavp1(pkS, s) {
  if (!s.greaterEquals(new sjcl_default.bn(0)) || s.greaterEquals(pkS.n) == 1) {
    throw new Error("signature representative out of range");
  }
  const m = s.powermod(pkS.e, pkS.n);
  return m;
}
function rsasp1(skS, m) {
  if (!m.greaterEquals(new sjcl_default.bn(0)) || m.greaterEquals(skS.n) == 1) {
    throw new Error("signature representative out of range");
  }
  const s = m.powermod(skS.d, skS.n);
  return s;
}
function is_coprime(x, n) {
  try {
    x.inverseMod(n);
  } catch (_) {
    return false;
  }
  return true;
}
function random_integer_uniform(n, kLen) {
  const MAX_NUM_TRIES = 8;
  for (let i = 0; i < MAX_NUM_TRIES; i++) {
    const r = os2ip(crypto.getRandomValues(new Uint8Array(kLen)));
    if (!(r.greaterEquals(n) || r.equals(0))) {
      return r;
    }
  }
  throw new Error("reached maximum tries for random integer generation");
}

// node_modules/@cloudflare/blindrsa-ts/lib/src/blindrsa.js
var PrepareType;
(function(PrepareType2) {
  PrepareType2[PrepareType2["Deterministic"] = 0] = "Deterministic";
  PrepareType2[PrepareType2["Randomized"] = 32] = "Randomized";
})(PrepareType || (PrepareType = {}));
var BlindRSA = class _BlindRSA {
  constructor(hash, saltLength, prepareType) {
    this.hash = hash;
    this.saltLength = saltLength;
    this.prepareType = prepareType;
    switch (this.prepareType) {
      case PrepareType.Deterministic:
      case PrepareType.Randomized:
        return;
      default:
        assertNever("PrepareType", prepareType);
    }
  }
  toString() {
    return `RSABSSA-${this.hash.replace("-", "")}-PSS${this.saltLength === 0 ? "ZERO" : ""}-${PrepareType[this.prepareType]}`;
  }
  prepare(msg) {
    const msg_prefix_len = this.prepareType;
    const msg_prefix = crypto.getRandomValues(new Uint8Array(msg_prefix_len));
    return joinAll([msg_prefix, msg]);
  }
  // Returns the parameters of the input key: the JSONWebKey data, the length
  // in bits and in bytes of the modulus, and the hash function used.
  async extractKeyParams(key, type) {
    if (key.type !== type || key.algorithm.name !== _BlindRSA.NAME) {
      throw new Error(`key is not ${_BlindRSA.NAME}`);
    }
    if (!key.extractable) {
      throw new Error("key is not extractable");
    }
    const { modulusLength: modulusLengthBits, hash: hashFn } = key.algorithm;
    const modulusLengthBytes = Math.ceil(modulusLengthBits / 8);
    const hash = hashFn.name;
    if (hash.toLowerCase() !== this.hash.toLowerCase()) {
      throw new Error(`hash is not ${this.hash}`);
    }
    const jwkKey = await crypto.subtle.exportKey("jwk", key);
    return { jwkKey, modulusLengthBits, modulusLengthBytes, hash };
  }
  async blind(publicKey, msg) {
    const { jwkKey, modulusLengthBits: modulusLength, modulusLengthBytes: kLen, hash } = await this.extractKeyParams(publicKey, "public");
    if (!jwkKey.n || !jwkKey.e) {
      throw new Error("key has invalid parameters");
    }
    const n = sjcl_default.bn.fromBits(sjcl_default.codec.base64url.toBits(jwkKey.n));
    const e = sjcl_default.bn.fromBits(sjcl_default.codec.base64url.toBits(jwkKey.e));
    const pk = { e, n };
    const opts = { sLen: this.saltLength, hash };
    const encoded_msg = await emsa_pss_encode(msg, modulusLength - 1, opts);
    const m = os2ip(encoded_msg);
    const c = is_coprime(m, n);
    if (c === false) {
      throw new Error("invalid input");
    }
    const r = random_integer_uniform(n, kLen);
    let inv;
    try {
      inv = i2osp(r.inverseMod(n), kLen);
    } catch (e2) {
      throw new Error(`blinding error: ${e2.toString()}`);
    }
    const x = rsavp1(pk, r);
    const z = m.mulmod(x, n);
    const blindedMsg = i2osp(z, kLen);
    return { blindedMsg, inv };
  }
  async blindSign(privateKey, blindMsg) {
    const { jwkKey, modulusLengthBytes: kLen } = await this.extractKeyParams(privateKey, "private");
    if (!jwkKey.n || !jwkKey.d) {
      throw new Error("key has invalid parameters");
    }
    const n = sjcl_default.bn.fromBits(sjcl_default.codec.base64url.toBits(jwkKey.n));
    const d = sjcl_default.bn.fromBits(sjcl_default.codec.base64url.toBits(jwkKey.d));
    const e = sjcl_default.bn.fromBits(sjcl_default.codec.base64url.toBits(jwkKey.e));
    const sk = { n, d };
    const pk = { n, e };
    const m = os2ip(blindMsg);
    const s = rsasp1(sk, m);
    const mp = rsavp1(pk, s);
    if (m.equals(mp) === false) {
      throw new Error("signing failure");
    }
    return i2osp(s, kLen);
  }
  async finalize(publicKey, msg, blindSig, inv) {
    const { jwkKey, modulusLengthBytes: kLen } = await this.extractKeyParams(publicKey, "public");
    if (!jwkKey.n) {
      throw new Error("key has invalid parameters");
    }
    const n = sjcl_default.bn.fromBits(sjcl_default.codec.base64url.toBits(jwkKey.n));
    if (inv.length != kLen) {
      throw new Error("unexpected input size");
    }
    const rInv = os2ip(inv);
    if (blindSig.length != kLen) {
      throw new Error("unexpected input size");
    }
    const z = os2ip(blindSig);
    const s = z.mulmod(rInv, n);
    const sig = i2osp(s, kLen);
    const algorithm = { name: _BlindRSA.NAME, saltLength: this.saltLength };
    if (!await crypto.subtle.verify(algorithm, publicKey, sig, msg)) {
      throw new Error("invalid signature");
    }
    return sig;
  }
  generateKey(algorithm, extractable, keyUsages) {
    return crypto.subtle.generateKey({ ...algorithm, name: _BlindRSA.NAME, hash: this.hash }, extractable, keyUsages);
  }
  verify(publicKey, signature, message) {
    return crypto.subtle.verify({ name: _BlindRSA.NAME, saltLength: this.saltLength }, publicKey, signature, message);
  }
};
BlindRSA.NAME = "RSA-PSS";

// node_modules/@cloudflare/blindrsa-ts/lib/src/index.js
var SUITES = {
  SHA384: {
    PSS: {
      Randomized: () => new BlindRSA("SHA-384", 48, PrepareType.Randomized),
      Deterministic: () => new BlindRSA("SHA-384", 48, PrepareType.Deterministic)
    },
    PSSZero: {
      Randomized: () => new BlindRSA("SHA-384", 0, PrepareType.Randomized),
      Deterministic: () => new BlindRSA("SHA-384", 0, PrepareType.Deterministic)
    }
  }
};

// node_modules/rfc4648/lib/index.mjs
var import_index = __toESM(require_lib(), 1);
var base16 = import_index.default.base16;
var base32 = import_index.default.base32;
var base32hex = import_index.default.base32hex;
var base64 = import_index.default.base64;
var base64url = import_index.default.base64url;
var codec = import_index.default.codec;

// node_modules/asn1js/build/index.es.js
var pvtsutils = __toESM(require_build());

// node_modules/pvutils/build/utils.es.js
function utilFromBase(inputBuffer, inputBase) {
  let result = 0;
  if (inputBuffer.length === 1) {
    return inputBuffer[0];
  }
  for (let i = inputBuffer.length - 1; i >= 0; i--) {
    result += inputBuffer[inputBuffer.length - 1 - i] * Math.pow(2, inputBase * i);
  }
  return result;
}
function utilToBase(value, base, reserved = -1) {
  const internalReserved = reserved;
  let internalValue = value;
  let result = 0;
  let biggest = Math.pow(2, base);
  for (let i = 1; i < 8; i++) {
    if (value < biggest) {
      let retBuf;
      if (internalReserved < 0) {
        retBuf = new ArrayBuffer(i);
        result = i;
      } else {
        if (internalReserved < i) {
          return new ArrayBuffer(0);
        }
        retBuf = new ArrayBuffer(internalReserved);
        result = internalReserved;
      }
      const retView = new Uint8Array(retBuf);
      for (let j = i - 1; j >= 0; j--) {
        const basis = Math.pow(2, j * base);
        retView[result - j - 1] = Math.floor(internalValue / basis);
        internalValue -= retView[result - j - 1] * basis;
      }
      return retBuf;
    }
    biggest *= Math.pow(2, base);
  }
  return new ArrayBuffer(0);
}
function utilConcatView(...views) {
  let outputLength = 0;
  let prevLength = 0;
  for (const view of views) {
    outputLength += view.length;
  }
  const retBuf = new ArrayBuffer(outputLength);
  const retView = new Uint8Array(retBuf);
  for (const view of views) {
    retView.set(view, prevLength);
    prevLength += view.length;
  }
  return retView;
}
function utilDecodeTC() {
  const buf = new Uint8Array(this.valueHex);
  if (this.valueHex.byteLength >= 2) {
    const condition1 = buf[0] === 255 && buf[1] & 128;
    const condition2 = buf[0] === 0 && (buf[1] & 128) === 0;
    if (condition1 || condition2) {
      this.warnings.push("Needlessly long format");
    }
  }
  const bigIntBuffer = new ArrayBuffer(this.valueHex.byteLength);
  const bigIntView = new Uint8Array(bigIntBuffer);
  for (let i = 0; i < this.valueHex.byteLength; i++) {
    bigIntView[i] = 0;
  }
  bigIntView[0] = buf[0] & 128;
  const bigInt = utilFromBase(bigIntView, 8);
  const smallIntBuffer = new ArrayBuffer(this.valueHex.byteLength);
  const smallIntView = new Uint8Array(smallIntBuffer);
  for (let j = 0; j < this.valueHex.byteLength; j++) {
    smallIntView[j] = buf[j];
  }
  smallIntView[0] &= 127;
  const smallInt = utilFromBase(smallIntView, 8);
  return smallInt - bigInt;
}
function utilEncodeTC(value) {
  const modValue = value < 0 ? value * -1 : value;
  let bigInt = 128;
  for (let i = 1; i < 8; i++) {
    if (modValue <= bigInt) {
      if (value < 0) {
        const smallInt = bigInt - modValue;
        const retBuf2 = utilToBase(smallInt, 8, i);
        const retView2 = new Uint8Array(retBuf2);
        retView2[0] |= 128;
        return retBuf2;
      }
      let retBuf = utilToBase(modValue, 8, i);
      let retView = new Uint8Array(retBuf);
      if (retView[0] & 128) {
        const tempBuf = retBuf.slice(0);
        const tempView = new Uint8Array(tempBuf);
        retBuf = new ArrayBuffer(retBuf.byteLength + 1);
        retView = new Uint8Array(retBuf);
        for (let k = 0; k < tempBuf.byteLength; k++) {
          retView[k + 1] = tempView[k];
        }
        retView[0] = 0;
      }
      return retBuf;
    }
    bigInt *= Math.pow(2, 8);
  }
  return new ArrayBuffer(0);
}
function isEqualBuffer(inputBuffer1, inputBuffer2) {
  if (inputBuffer1.byteLength !== inputBuffer2.byteLength) {
    return false;
  }
  const view1 = new Uint8Array(inputBuffer1);
  const view2 = new Uint8Array(inputBuffer2);
  for (let i = 0; i < view1.length; i++) {
    if (view1[i] !== view2[i]) {
      return false;
    }
  }
  return true;
}
function padNumber(inputNumber, fullLength) {
  const str = inputNumber.toString(10);
  if (fullLength < str.length) {
    return "";
  }
  const dif = fullLength - str.length;
  const padding = new Array(dif);
  for (let i = 0; i < dif; i++) {
    padding[i] = "0";
  }
  const paddingString = padding.join("");
  return paddingString.concat(str);
}
var log2 = Math.log(2);

// node_modules/asn1js/build/index.es.js
function assertBigInt() {
  if (typeof BigInt === "undefined") {
    throw new Error("BigInt is not defined. Your environment doesn't implement BigInt.");
  }
}
function concat(buffers) {
  let outputLength = 0;
  let prevLength = 0;
  for (let i = 0; i < buffers.length; i++) {
    const buffer = buffers[i];
    outputLength += buffer.byteLength;
  }
  const retView = new Uint8Array(outputLength);
  for (let i = 0; i < buffers.length; i++) {
    const buffer = buffers[i];
    retView.set(new Uint8Array(buffer), prevLength);
    prevLength += buffer.byteLength;
  }
  return retView.buffer;
}
function checkBufferParams(baseBlock, inputBuffer, inputOffset, inputLength) {
  if (!(inputBuffer instanceof Uint8Array)) {
    baseBlock.error = "Wrong parameter: inputBuffer must be 'Uint8Array'";
    return false;
  }
  if (!inputBuffer.byteLength) {
    baseBlock.error = "Wrong parameter: inputBuffer has zero length";
    return false;
  }
  if (inputOffset < 0) {
    baseBlock.error = "Wrong parameter: inputOffset less than zero";
    return false;
  }
  if (inputLength < 0) {
    baseBlock.error = "Wrong parameter: inputLength less than zero";
    return false;
  }
  if (inputBuffer.byteLength - inputOffset - inputLength < 0) {
    baseBlock.error = "End of input reached before message was fully decoded (inconsistent offset and length values)";
    return false;
  }
  return true;
}
var ViewWriter = class {
  constructor() {
    this.items = [];
  }
  write(buf) {
    this.items.push(buf);
  }
  final() {
    return concat(this.items);
  }
};
var powers2 = [new Uint8Array([1])];
var digitsString = "0123456789";
var NAME = "name";
var VALUE_HEX_VIEW = "valueHexView";
var IS_HEX_ONLY = "isHexOnly";
var ID_BLOCK = "idBlock";
var TAG_CLASS = "tagClass";
var TAG_NUMBER = "tagNumber";
var IS_CONSTRUCTED = "isConstructed";
var FROM_BER = "fromBER";
var TO_BER = "toBER";
var LOCAL = "local";
var EMPTY_STRING = "";
var EMPTY_BUFFER = new ArrayBuffer(0);
var EMPTY_VIEW = new Uint8Array(0);
var END_OF_CONTENT_NAME = "EndOfContent";
var OCTET_STRING_NAME = "OCTET STRING";
var BIT_STRING_NAME = "BIT STRING";
function HexBlock(BaseClass) {
  var _a2;
  return _a2 = class Some extends BaseClass {
    constructor(...args) {
      var _a3;
      super(...args);
      const params = args[0] || {};
      this.isHexOnly = (_a3 = params.isHexOnly) !== null && _a3 !== void 0 ? _a3 : false;
      this.valueHexView = params.valueHex ? pvtsutils.BufferSourceConverter.toUint8Array(params.valueHex) : EMPTY_VIEW;
    }
    get valueHex() {
      return this.valueHexView.slice().buffer;
    }
    set valueHex(value) {
      this.valueHexView = new Uint8Array(value);
    }
    fromBER(inputBuffer, inputOffset, inputLength) {
      const view = inputBuffer instanceof ArrayBuffer ? new Uint8Array(inputBuffer) : inputBuffer;
      if (!checkBufferParams(this, view, inputOffset, inputLength)) {
        return -1;
      }
      const endLength = inputOffset + inputLength;
      this.valueHexView = view.subarray(inputOffset, endLength);
      if (!this.valueHexView.length) {
        this.warnings.push("Zero buffer length");
        return inputOffset;
      }
      this.blockLength = inputLength;
      return endLength;
    }
    toBER(sizeOnly = false) {
      if (!this.isHexOnly) {
        this.error = "Flag 'isHexOnly' is not set, abort";
        return EMPTY_BUFFER;
      }
      if (sizeOnly) {
        return new ArrayBuffer(this.valueHexView.byteLength);
      }
      return this.valueHexView.byteLength === this.valueHexView.buffer.byteLength ? this.valueHexView.buffer : this.valueHexView.slice().buffer;
    }
    toJSON() {
      return {
        ...super.toJSON(),
        isHexOnly: this.isHexOnly,
        valueHex: pvtsutils.Convert.ToHex(this.valueHexView)
      };
    }
  }, _a2.NAME = "hexBlock", _a2;
}
var LocalBaseBlock = class {
  constructor({ blockLength = 0, error = EMPTY_STRING, warnings = [], valueBeforeDecode = EMPTY_VIEW } = {}) {
    this.blockLength = blockLength;
    this.error = error;
    this.warnings = warnings;
    this.valueBeforeDecodeView = pvtsutils.BufferSourceConverter.toUint8Array(valueBeforeDecode);
  }
  static blockName() {
    return this.NAME;
  }
  get valueBeforeDecode() {
    return this.valueBeforeDecodeView.slice().buffer;
  }
  set valueBeforeDecode(value) {
    this.valueBeforeDecodeView = new Uint8Array(value);
  }
  toJSON() {
    return {
      blockName: this.constructor.NAME,
      blockLength: this.blockLength,
      error: this.error,
      warnings: this.warnings,
      valueBeforeDecode: pvtsutils.Convert.ToHex(this.valueBeforeDecodeView)
    };
  }
};
LocalBaseBlock.NAME = "baseBlock";
var ValueBlock = class extends LocalBaseBlock {
  fromBER(inputBuffer, inputOffset, inputLength) {
    throw TypeError("User need to make a specific function in a class which extends 'ValueBlock'");
  }
  toBER(sizeOnly, writer) {
    throw TypeError("User need to make a specific function in a class which extends 'ValueBlock'");
  }
};
ValueBlock.NAME = "valueBlock";
var LocalIdentificationBlock = class extends HexBlock(LocalBaseBlock) {
  constructor({ idBlock = {} } = {}) {
    var _a2, _b, _c, _d;
    super();
    if (idBlock) {
      this.isHexOnly = (_a2 = idBlock.isHexOnly) !== null && _a2 !== void 0 ? _a2 : false;
      this.valueHexView = idBlock.valueHex ? pvtsutils.BufferSourceConverter.toUint8Array(idBlock.valueHex) : EMPTY_VIEW;
      this.tagClass = (_b = idBlock.tagClass) !== null && _b !== void 0 ? _b : -1;
      this.tagNumber = (_c = idBlock.tagNumber) !== null && _c !== void 0 ? _c : -1;
      this.isConstructed = (_d = idBlock.isConstructed) !== null && _d !== void 0 ? _d : false;
    } else {
      this.tagClass = -1;
      this.tagNumber = -1;
      this.isConstructed = false;
    }
  }
  toBER(sizeOnly = false) {
    let firstOctet = 0;
    switch (this.tagClass) {
      case 1:
        firstOctet |= 0;
        break;
      case 2:
        firstOctet |= 64;
        break;
      case 3:
        firstOctet |= 128;
        break;
      case 4:
        firstOctet |= 192;
        break;
      default:
        this.error = "Unknown tag class";
        return EMPTY_BUFFER;
    }
    if (this.isConstructed)
      firstOctet |= 32;
    if (this.tagNumber < 31 && !this.isHexOnly) {
      const retView2 = new Uint8Array(1);
      if (!sizeOnly) {
        let number = this.tagNumber;
        number &= 31;
        firstOctet |= number;
        retView2[0] = firstOctet;
      }
      return retView2.buffer;
    }
    if (!this.isHexOnly) {
      const encodedBuf = utilToBase(this.tagNumber, 7);
      const encodedView = new Uint8Array(encodedBuf);
      const size = encodedBuf.byteLength;
      const retView2 = new Uint8Array(size + 1);
      retView2[0] = firstOctet | 31;
      if (!sizeOnly) {
        for (let i = 0; i < size - 1; i++)
          retView2[i + 1] = encodedView[i] | 128;
        retView2[size] = encodedView[size - 1];
      }
      return retView2.buffer;
    }
    const retView = new Uint8Array(this.valueHexView.byteLength + 1);
    retView[0] = firstOctet | 31;
    if (!sizeOnly) {
      const curView = this.valueHexView;
      for (let i = 0; i < curView.length - 1; i++)
        retView[i + 1] = curView[i] | 128;
      retView[this.valueHexView.byteLength] = curView[curView.length - 1];
    }
    return retView.buffer;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    const inputView = pvtsutils.BufferSourceConverter.toUint8Array(inputBuffer);
    if (!checkBufferParams(this, inputView, inputOffset, inputLength)) {
      return -1;
    }
    const intBuffer = inputView.subarray(inputOffset, inputOffset + inputLength);
    if (intBuffer.length === 0) {
      this.error = "Zero buffer length";
      return -1;
    }
    const tagClassMask = intBuffer[0] & 192;
    switch (tagClassMask) {
      case 0:
        this.tagClass = 1;
        break;
      case 64:
        this.tagClass = 2;
        break;
      case 128:
        this.tagClass = 3;
        break;
      case 192:
        this.tagClass = 4;
        break;
      default:
        this.error = "Unknown tag class";
        return -1;
    }
    this.isConstructed = (intBuffer[0] & 32) === 32;
    this.isHexOnly = false;
    const tagNumberMask = intBuffer[0] & 31;
    if (tagNumberMask !== 31) {
      this.tagNumber = tagNumberMask;
      this.blockLength = 1;
    } else {
      let count = 1;
      let intTagNumberBuffer = this.valueHexView = new Uint8Array(255);
      let tagNumberBufferMaxLength = 255;
      while (intBuffer[count] & 128) {
        intTagNumberBuffer[count - 1] = intBuffer[count] & 127;
        count++;
        if (count >= intBuffer.length) {
          this.error = "End of input reached before message was fully decoded";
          return -1;
        }
        if (count === tagNumberBufferMaxLength) {
          tagNumberBufferMaxLength += 255;
          const tempBufferView2 = new Uint8Array(tagNumberBufferMaxLength);
          for (let i = 0; i < intTagNumberBuffer.length; i++)
            tempBufferView2[i] = intTagNumberBuffer[i];
          intTagNumberBuffer = this.valueHexView = new Uint8Array(tagNumberBufferMaxLength);
        }
      }
      this.blockLength = count + 1;
      intTagNumberBuffer[count - 1] = intBuffer[count] & 127;
      const tempBufferView = new Uint8Array(count);
      for (let i = 0; i < count; i++)
        tempBufferView[i] = intTagNumberBuffer[i];
      intTagNumberBuffer = this.valueHexView = new Uint8Array(count);
      intTagNumberBuffer.set(tempBufferView);
      if (this.blockLength <= 9)
        this.tagNumber = utilFromBase(intTagNumberBuffer, 7);
      else {
        this.isHexOnly = true;
        this.warnings.push("Tag too long, represented as hex-coded");
      }
    }
    if (this.tagClass === 1 && this.isConstructed) {
      switch (this.tagNumber) {
        case 1:
        case 2:
        case 5:
        case 6:
        case 9:
        case 13:
        case 14:
        case 23:
        case 24:
        case 31:
        case 32:
        case 33:
        case 34:
          this.error = "Constructed encoding used for primitive type";
          return -1;
      }
    }
    return inputOffset + this.blockLength;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      tagClass: this.tagClass,
      tagNumber: this.tagNumber,
      isConstructed: this.isConstructed
    };
  }
};
LocalIdentificationBlock.NAME = "identificationBlock";
var LocalLengthBlock = class extends LocalBaseBlock {
  constructor({ lenBlock = {} } = {}) {
    var _a2, _b, _c;
    super();
    this.isIndefiniteForm = (_a2 = lenBlock.isIndefiniteForm) !== null && _a2 !== void 0 ? _a2 : false;
    this.longFormUsed = (_b = lenBlock.longFormUsed) !== null && _b !== void 0 ? _b : false;
    this.length = (_c = lenBlock.length) !== null && _c !== void 0 ? _c : 0;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    const view = pvtsutils.BufferSourceConverter.toUint8Array(inputBuffer);
    if (!checkBufferParams(this, view, inputOffset, inputLength)) {
      return -1;
    }
    const intBuffer = view.subarray(inputOffset, inputOffset + inputLength);
    if (intBuffer.length === 0) {
      this.error = "Zero buffer length";
      return -1;
    }
    if (intBuffer[0] === 255) {
      this.error = "Length block 0xFF is reserved by standard";
      return -1;
    }
    this.isIndefiniteForm = intBuffer[0] === 128;
    if (this.isIndefiniteForm) {
      this.blockLength = 1;
      return inputOffset + this.blockLength;
    }
    this.longFormUsed = !!(intBuffer[0] & 128);
    if (this.longFormUsed === false) {
      this.length = intBuffer[0];
      this.blockLength = 1;
      return inputOffset + this.blockLength;
    }
    const count = intBuffer[0] & 127;
    if (count > 8) {
      this.error = "Too big integer";
      return -1;
    }
    if (count + 1 > intBuffer.length) {
      this.error = "End of input reached before message was fully decoded";
      return -1;
    }
    const lenOffset = inputOffset + 1;
    const lengthBufferView = view.subarray(lenOffset, lenOffset + count);
    if (lengthBufferView[count - 1] === 0)
      this.warnings.push("Needlessly long encoded length");
    this.length = utilFromBase(lengthBufferView, 8);
    if (this.longFormUsed && this.length <= 127)
      this.warnings.push("Unnecessary usage of long length form");
    this.blockLength = count + 1;
    return inputOffset + this.blockLength;
  }
  toBER(sizeOnly = false) {
    let retBuf;
    let retView;
    if (this.length > 127)
      this.longFormUsed = true;
    if (this.isIndefiniteForm) {
      retBuf = new ArrayBuffer(1);
      if (sizeOnly === false) {
        retView = new Uint8Array(retBuf);
        retView[0] = 128;
      }
      return retBuf;
    }
    if (this.longFormUsed) {
      const encodedBuf = utilToBase(this.length, 8);
      if (encodedBuf.byteLength > 127) {
        this.error = "Too big length";
        return EMPTY_BUFFER;
      }
      retBuf = new ArrayBuffer(encodedBuf.byteLength + 1);
      if (sizeOnly)
        return retBuf;
      const encodedView = new Uint8Array(encodedBuf);
      retView = new Uint8Array(retBuf);
      retView[0] = encodedBuf.byteLength | 128;
      for (let i = 0; i < encodedBuf.byteLength; i++)
        retView[i + 1] = encodedView[i];
      return retBuf;
    }
    retBuf = new ArrayBuffer(1);
    if (sizeOnly === false) {
      retView = new Uint8Array(retBuf);
      retView[0] = this.length;
    }
    return retBuf;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      isIndefiniteForm: this.isIndefiniteForm,
      longFormUsed: this.longFormUsed,
      length: this.length
    };
  }
};
LocalLengthBlock.NAME = "lengthBlock";
var typeStore = {};
var BaseBlock = class extends LocalBaseBlock {
  constructor({ name = EMPTY_STRING, optional = false, primitiveSchema, ...parameters } = {}, valueBlockType) {
    super(parameters);
    this.name = name;
    this.optional = optional;
    if (primitiveSchema) {
      this.primitiveSchema = primitiveSchema;
    }
    this.idBlock = new LocalIdentificationBlock(parameters);
    this.lenBlock = new LocalLengthBlock(parameters);
    this.valueBlock = valueBlockType ? new valueBlockType(parameters) : new ValueBlock(parameters);
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    const resultOffset = this.valueBlock.fromBER(inputBuffer, inputOffset, this.lenBlock.isIndefiniteForm ? inputLength : this.lenBlock.length);
    if (resultOffset === -1) {
      this.error = this.valueBlock.error;
      return resultOffset;
    }
    if (!this.idBlock.error.length)
      this.blockLength += this.idBlock.blockLength;
    if (!this.lenBlock.error.length)
      this.blockLength += this.lenBlock.blockLength;
    if (!this.valueBlock.error.length)
      this.blockLength += this.valueBlock.blockLength;
    return resultOffset;
  }
  toBER(sizeOnly, writer) {
    const _writer = writer || new ViewWriter();
    if (!writer) {
      prepareIndefiniteForm(this);
    }
    const idBlockBuf = this.idBlock.toBER(sizeOnly);
    _writer.write(idBlockBuf);
    if (this.lenBlock.isIndefiniteForm) {
      _writer.write(new Uint8Array([128]).buffer);
      this.valueBlock.toBER(sizeOnly, _writer);
      _writer.write(new ArrayBuffer(2));
    } else {
      const valueBlockBuf = this.valueBlock.toBER(sizeOnly);
      this.lenBlock.length = valueBlockBuf.byteLength;
      const lenBlockBuf = this.lenBlock.toBER(sizeOnly);
      _writer.write(lenBlockBuf);
      _writer.write(valueBlockBuf);
    }
    if (!writer) {
      return _writer.final();
    }
    return EMPTY_BUFFER;
  }
  toJSON() {
    const object = {
      ...super.toJSON(),
      idBlock: this.idBlock.toJSON(),
      lenBlock: this.lenBlock.toJSON(),
      valueBlock: this.valueBlock.toJSON(),
      name: this.name,
      optional: this.optional
    };
    if (this.primitiveSchema)
      object.primitiveSchema = this.primitiveSchema.toJSON();
    return object;
  }
  toString(encoding = "ascii") {
    if (encoding === "ascii") {
      return this.onAsciiEncoding();
    }
    return pvtsutils.Convert.ToHex(this.toBER());
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME} : ${pvtsutils.Convert.ToHex(this.valueBlock.valueBeforeDecodeView)}`;
  }
  isEqual(other) {
    if (this === other) {
      return true;
    }
    if (!(other instanceof this.constructor)) {
      return false;
    }
    const thisRaw = this.toBER();
    const otherRaw = other.toBER();
    return isEqualBuffer(thisRaw, otherRaw);
  }
};
BaseBlock.NAME = "BaseBlock";
function prepareIndefiniteForm(baseBlock) {
  if (baseBlock instanceof typeStore.Constructed) {
    for (const value of baseBlock.valueBlock.value) {
      if (prepareIndefiniteForm(value)) {
        baseBlock.lenBlock.isIndefiniteForm = true;
      }
    }
  }
  return !!baseBlock.lenBlock.isIndefiniteForm;
}
var BaseStringBlock = class extends BaseBlock {
  constructor({ value = EMPTY_STRING, ...parameters } = {}, stringValueBlockType) {
    super(parameters, stringValueBlockType);
    if (value) {
      this.fromString(value);
    }
  }
  getValue() {
    return this.valueBlock.value;
  }
  setValue(value) {
    this.valueBlock.value = value;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    const resultOffset = this.valueBlock.fromBER(inputBuffer, inputOffset, this.lenBlock.isIndefiniteForm ? inputLength : this.lenBlock.length);
    if (resultOffset === -1) {
      this.error = this.valueBlock.error;
      return resultOffset;
    }
    this.fromBuffer(this.valueBlock.valueHexView);
    if (!this.idBlock.error.length)
      this.blockLength += this.idBlock.blockLength;
    if (!this.lenBlock.error.length)
      this.blockLength += this.lenBlock.blockLength;
    if (!this.valueBlock.error.length)
      this.blockLength += this.valueBlock.blockLength;
    return resultOffset;
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME} : '${this.valueBlock.value}'`;
  }
};
BaseStringBlock.NAME = "BaseStringBlock";
var LocalPrimitiveValueBlock = class extends HexBlock(ValueBlock) {
  constructor({ isHexOnly = true, ...parameters } = {}) {
    super(parameters);
    this.isHexOnly = isHexOnly;
  }
};
LocalPrimitiveValueBlock.NAME = "PrimitiveValueBlock";
var _a$w;
var Primitive = class extends BaseBlock {
  constructor(parameters = {}) {
    super(parameters, LocalPrimitiveValueBlock);
    this.idBlock.isConstructed = false;
  }
};
_a$w = Primitive;
(() => {
  typeStore.Primitive = _a$w;
})();
Primitive.NAME = "PRIMITIVE";
function localChangeType(inputObject, newType) {
  if (inputObject instanceof newType) {
    return inputObject;
  }
  const newObject = new newType();
  newObject.idBlock = inputObject.idBlock;
  newObject.lenBlock = inputObject.lenBlock;
  newObject.warnings = inputObject.warnings;
  newObject.valueBeforeDecodeView = inputObject.valueBeforeDecodeView;
  return newObject;
}
function localFromBER(inputBuffer, inputOffset = 0, inputLength = inputBuffer.length) {
  const incomingOffset = inputOffset;
  let returnObject = new BaseBlock({}, ValueBlock);
  const baseBlock = new LocalBaseBlock();
  if (!checkBufferParams(baseBlock, inputBuffer, inputOffset, inputLength)) {
    returnObject.error = baseBlock.error;
    return {
      offset: -1,
      result: returnObject
    };
  }
  const intBuffer = inputBuffer.subarray(inputOffset, inputOffset + inputLength);
  if (!intBuffer.length) {
    returnObject.error = "Zero buffer length";
    return {
      offset: -1,
      result: returnObject
    };
  }
  let resultOffset = returnObject.idBlock.fromBER(inputBuffer, inputOffset, inputLength);
  if (returnObject.idBlock.warnings.length) {
    returnObject.warnings.concat(returnObject.idBlock.warnings);
  }
  if (resultOffset === -1) {
    returnObject.error = returnObject.idBlock.error;
    return {
      offset: -1,
      result: returnObject
    };
  }
  inputOffset = resultOffset;
  inputLength -= returnObject.idBlock.blockLength;
  resultOffset = returnObject.lenBlock.fromBER(inputBuffer, inputOffset, inputLength);
  if (returnObject.lenBlock.warnings.length) {
    returnObject.warnings.concat(returnObject.lenBlock.warnings);
  }
  if (resultOffset === -1) {
    returnObject.error = returnObject.lenBlock.error;
    return {
      offset: -1,
      result: returnObject
    };
  }
  inputOffset = resultOffset;
  inputLength -= returnObject.lenBlock.blockLength;
  if (!returnObject.idBlock.isConstructed && returnObject.lenBlock.isIndefiniteForm) {
    returnObject.error = "Indefinite length form used for primitive encoding form";
    return {
      offset: -1,
      result: returnObject
    };
  }
  let newASN1Type = BaseBlock;
  switch (returnObject.idBlock.tagClass) {
    case 1:
      if (returnObject.idBlock.tagNumber >= 37 && returnObject.idBlock.isHexOnly === false) {
        returnObject.error = "UNIVERSAL 37 and upper tags are reserved by ASN.1 standard";
        return {
          offset: -1,
          result: returnObject
        };
      }
      switch (returnObject.idBlock.tagNumber) {
        case 0:
          if (returnObject.idBlock.isConstructed && returnObject.lenBlock.length > 0) {
            returnObject.error = "Type [UNIVERSAL 0] is reserved";
            return {
              offset: -1,
              result: returnObject
            };
          }
          newASN1Type = typeStore.EndOfContent;
          break;
        case 1:
          newASN1Type = typeStore.Boolean;
          break;
        case 2:
          newASN1Type = typeStore.Integer;
          break;
        case 3:
          newASN1Type = typeStore.BitString;
          break;
        case 4:
          newASN1Type = typeStore.OctetString;
          break;
        case 5:
          newASN1Type = typeStore.Null;
          break;
        case 6:
          newASN1Type = typeStore.ObjectIdentifier;
          break;
        case 10:
          newASN1Type = typeStore.Enumerated;
          break;
        case 12:
          newASN1Type = typeStore.Utf8String;
          break;
        case 13:
          newASN1Type = typeStore.RelativeObjectIdentifier;
          break;
        case 14:
          newASN1Type = typeStore.TIME;
          break;
        case 15:
          returnObject.error = "[UNIVERSAL 15] is reserved by ASN.1 standard";
          return {
            offset: -1,
            result: returnObject
          };
        case 16:
          newASN1Type = typeStore.Sequence;
          break;
        case 17:
          newASN1Type = typeStore.Set;
          break;
        case 18:
          newASN1Type = typeStore.NumericString;
          break;
        case 19:
          newASN1Type = typeStore.PrintableString;
          break;
        case 20:
          newASN1Type = typeStore.TeletexString;
          break;
        case 21:
          newASN1Type = typeStore.VideotexString;
          break;
        case 22:
          newASN1Type = typeStore.IA5String;
          break;
        case 23:
          newASN1Type = typeStore.UTCTime;
          break;
        case 24:
          newASN1Type = typeStore.GeneralizedTime;
          break;
        case 25:
          newASN1Type = typeStore.GraphicString;
          break;
        case 26:
          newASN1Type = typeStore.VisibleString;
          break;
        case 27:
          newASN1Type = typeStore.GeneralString;
          break;
        case 28:
          newASN1Type = typeStore.UniversalString;
          break;
        case 29:
          newASN1Type = typeStore.CharacterString;
          break;
        case 30:
          newASN1Type = typeStore.BmpString;
          break;
        case 31:
          newASN1Type = typeStore.DATE;
          break;
        case 32:
          newASN1Type = typeStore.TimeOfDay;
          break;
        case 33:
          newASN1Type = typeStore.DateTime;
          break;
        case 34:
          newASN1Type = typeStore.Duration;
          break;
        default: {
          const newObject = returnObject.idBlock.isConstructed ? new typeStore.Constructed() : new typeStore.Primitive();
          newObject.idBlock = returnObject.idBlock;
          newObject.lenBlock = returnObject.lenBlock;
          newObject.warnings = returnObject.warnings;
          returnObject = newObject;
        }
      }
      break;
    case 2:
    case 3:
    case 4:
    default: {
      newASN1Type = returnObject.idBlock.isConstructed ? typeStore.Constructed : typeStore.Primitive;
    }
  }
  returnObject = localChangeType(returnObject, newASN1Type);
  resultOffset = returnObject.fromBER(inputBuffer, inputOffset, returnObject.lenBlock.isIndefiniteForm ? inputLength : returnObject.lenBlock.length);
  returnObject.valueBeforeDecodeView = inputBuffer.subarray(incomingOffset, incomingOffset + returnObject.blockLength);
  return {
    offset: resultOffset,
    result: returnObject
  };
}
function checkLen(indefiniteLength, length) {
  if (indefiniteLength) {
    return 1;
  }
  return length;
}
var LocalConstructedValueBlock = class extends ValueBlock {
  constructor({ value = [], isIndefiniteForm = false, ...parameters } = {}) {
    super(parameters);
    this.value = value;
    this.isIndefiniteForm = isIndefiniteForm;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    const view = pvtsutils.BufferSourceConverter.toUint8Array(inputBuffer);
    if (!checkBufferParams(this, view, inputOffset, inputLength)) {
      return -1;
    }
    this.valueBeforeDecodeView = view.subarray(inputOffset, inputOffset + inputLength);
    if (this.valueBeforeDecodeView.length === 0) {
      this.warnings.push("Zero buffer length");
      return inputOffset;
    }
    let currentOffset = inputOffset;
    while (checkLen(this.isIndefiniteForm, inputLength) > 0) {
      const returnObject = localFromBER(view, currentOffset, inputLength);
      if (returnObject.offset === -1) {
        this.error = returnObject.result.error;
        this.warnings.concat(returnObject.result.warnings);
        return -1;
      }
      currentOffset = returnObject.offset;
      this.blockLength += returnObject.result.blockLength;
      inputLength -= returnObject.result.blockLength;
      this.value.push(returnObject.result);
      if (this.isIndefiniteForm && returnObject.result.constructor.NAME === END_OF_CONTENT_NAME) {
        break;
      }
    }
    if (this.isIndefiniteForm) {
      if (this.value[this.value.length - 1].constructor.NAME === END_OF_CONTENT_NAME) {
        this.value.pop();
      } else {
        this.warnings.push("No EndOfContent block encoded");
      }
    }
    return currentOffset;
  }
  toBER(sizeOnly, writer) {
    const _writer = writer || new ViewWriter();
    for (let i = 0; i < this.value.length; i++) {
      this.value[i].toBER(sizeOnly, _writer);
    }
    if (!writer) {
      return _writer.final();
    }
    return EMPTY_BUFFER;
  }
  toJSON() {
    const object = {
      ...super.toJSON(),
      isIndefiniteForm: this.isIndefiniteForm,
      value: []
    };
    for (const value of this.value) {
      object.value.push(value.toJSON());
    }
    return object;
  }
};
LocalConstructedValueBlock.NAME = "ConstructedValueBlock";
var _a$v;
var Constructed = class extends BaseBlock {
  constructor(parameters = {}) {
    super(parameters, LocalConstructedValueBlock);
    this.idBlock.isConstructed = true;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    this.valueBlock.isIndefiniteForm = this.lenBlock.isIndefiniteForm;
    const resultOffset = this.valueBlock.fromBER(inputBuffer, inputOffset, this.lenBlock.isIndefiniteForm ? inputLength : this.lenBlock.length);
    if (resultOffset === -1) {
      this.error = this.valueBlock.error;
      return resultOffset;
    }
    if (!this.idBlock.error.length)
      this.blockLength += this.idBlock.blockLength;
    if (!this.lenBlock.error.length)
      this.blockLength += this.lenBlock.blockLength;
    if (!this.valueBlock.error.length)
      this.blockLength += this.valueBlock.blockLength;
    return resultOffset;
  }
  onAsciiEncoding() {
    const values = [];
    for (const value of this.valueBlock.value) {
      values.push(value.toString("ascii").split("\n").map((o) => `  ${o}`).join("\n"));
    }
    const blockName = this.idBlock.tagClass === 3 ? `[${this.idBlock.tagNumber}]` : this.constructor.NAME;
    return values.length ? `${blockName} :
${values.join("\n")}` : `${blockName} :`;
  }
};
_a$v = Constructed;
(() => {
  typeStore.Constructed = _a$v;
})();
Constructed.NAME = "CONSTRUCTED";
var LocalEndOfContentValueBlock = class extends ValueBlock {
  fromBER(inputBuffer, inputOffset, inputLength) {
    return inputOffset;
  }
  toBER(sizeOnly) {
    return EMPTY_BUFFER;
  }
};
LocalEndOfContentValueBlock.override = "EndOfContentValueBlock";
var _a$u;
var EndOfContent = class extends BaseBlock {
  constructor(parameters = {}) {
    super(parameters, LocalEndOfContentValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 0;
  }
};
_a$u = EndOfContent;
(() => {
  typeStore.EndOfContent = _a$u;
})();
EndOfContent.NAME = END_OF_CONTENT_NAME;
var _a$t;
var Null = class extends BaseBlock {
  constructor(parameters = {}) {
    super(parameters, ValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 5;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    if (this.lenBlock.length > 0)
      this.warnings.push("Non-zero length of value block for Null type");
    if (!this.idBlock.error.length)
      this.blockLength += this.idBlock.blockLength;
    if (!this.lenBlock.error.length)
      this.blockLength += this.lenBlock.blockLength;
    this.blockLength += inputLength;
    if (inputOffset + inputLength > inputBuffer.byteLength) {
      this.error = "End of input reached before message was fully decoded (inconsistent offset and length values)";
      return -1;
    }
    return inputOffset + inputLength;
  }
  toBER(sizeOnly, writer) {
    const retBuf = new ArrayBuffer(2);
    if (!sizeOnly) {
      const retView = new Uint8Array(retBuf);
      retView[0] = 5;
      retView[1] = 0;
    }
    if (writer) {
      writer.write(retBuf);
    }
    return retBuf;
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME}`;
  }
};
_a$t = Null;
(() => {
  typeStore.Null = _a$t;
})();
Null.NAME = "NULL";
var LocalBooleanValueBlock = class extends HexBlock(ValueBlock) {
  constructor({ value, ...parameters } = {}) {
    super(parameters);
    if (parameters.valueHex) {
      this.valueHexView = pvtsutils.BufferSourceConverter.toUint8Array(parameters.valueHex);
    } else {
      this.valueHexView = new Uint8Array(1);
    }
    if (value) {
      this.value = value;
    }
  }
  get value() {
    for (const octet of this.valueHexView) {
      if (octet > 0) {
        return true;
      }
    }
    return false;
  }
  set value(value) {
    this.valueHexView[0] = value ? 255 : 0;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    const inputView = pvtsutils.BufferSourceConverter.toUint8Array(inputBuffer);
    if (!checkBufferParams(this, inputView, inputOffset, inputLength)) {
      return -1;
    }
    this.valueHexView = inputView.subarray(inputOffset, inputOffset + inputLength);
    if (inputLength > 1)
      this.warnings.push("Boolean value encoded in more then 1 octet");
    this.isHexOnly = true;
    utilDecodeTC.call(this);
    this.blockLength = inputLength;
    return inputOffset + inputLength;
  }
  toBER() {
    return this.valueHexView.slice();
  }
  toJSON() {
    return {
      ...super.toJSON(),
      value: this.value
    };
  }
};
LocalBooleanValueBlock.NAME = "BooleanValueBlock";
var _a$s;
var Boolean = class extends BaseBlock {
  constructor(parameters = {}) {
    super(parameters, LocalBooleanValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 1;
  }
  getValue() {
    return this.valueBlock.value;
  }
  setValue(value) {
    this.valueBlock.value = value;
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME} : ${this.getValue}`;
  }
};
_a$s = Boolean;
(() => {
  typeStore.Boolean = _a$s;
})();
Boolean.NAME = "BOOLEAN";
var LocalOctetStringValueBlock = class extends HexBlock(LocalConstructedValueBlock) {
  constructor({ isConstructed = false, ...parameters } = {}) {
    super(parameters);
    this.isConstructed = isConstructed;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    let resultOffset = 0;
    if (this.isConstructed) {
      this.isHexOnly = false;
      resultOffset = LocalConstructedValueBlock.prototype.fromBER.call(this, inputBuffer, inputOffset, inputLength);
      if (resultOffset === -1)
        return resultOffset;
      for (let i = 0; i < this.value.length; i++) {
        const currentBlockName = this.value[i].constructor.NAME;
        if (currentBlockName === END_OF_CONTENT_NAME) {
          if (this.isIndefiniteForm)
            break;
          else {
            this.error = "EndOfContent is unexpected, OCTET STRING may consists of OCTET STRINGs only";
            return -1;
          }
        }
        if (currentBlockName !== OCTET_STRING_NAME) {
          this.error = "OCTET STRING may consists of OCTET STRINGs only";
          return -1;
        }
      }
    } else {
      this.isHexOnly = true;
      resultOffset = super.fromBER(inputBuffer, inputOffset, inputLength);
      this.blockLength = inputLength;
    }
    return resultOffset;
  }
  toBER(sizeOnly, writer) {
    if (this.isConstructed)
      return LocalConstructedValueBlock.prototype.toBER.call(this, sizeOnly, writer);
    return sizeOnly ? new ArrayBuffer(this.valueHexView.byteLength) : this.valueHexView.slice().buffer;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      isConstructed: this.isConstructed
    };
  }
};
LocalOctetStringValueBlock.NAME = "OctetStringValueBlock";
var _a$r;
var OctetString = class _OctetString extends BaseBlock {
  constructor({ idBlock = {}, lenBlock = {}, ...parameters } = {}) {
    var _b, _c;
    (_b = parameters.isConstructed) !== null && _b !== void 0 ? _b : parameters.isConstructed = !!((_c = parameters.value) === null || _c === void 0 ? void 0 : _c.length);
    super({
      idBlock: {
        isConstructed: parameters.isConstructed,
        ...idBlock
      },
      lenBlock: {
        ...lenBlock,
        isIndefiniteForm: !!parameters.isIndefiniteForm
      },
      ...parameters
    }, LocalOctetStringValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 4;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    this.valueBlock.isConstructed = this.idBlock.isConstructed;
    this.valueBlock.isIndefiniteForm = this.lenBlock.isIndefiniteForm;
    if (inputLength === 0) {
      if (this.idBlock.error.length === 0)
        this.blockLength += this.idBlock.blockLength;
      if (this.lenBlock.error.length === 0)
        this.blockLength += this.lenBlock.blockLength;
      return inputOffset;
    }
    if (!this.valueBlock.isConstructed) {
      const view = inputBuffer instanceof ArrayBuffer ? new Uint8Array(inputBuffer) : inputBuffer;
      const buf = view.subarray(inputOffset, inputOffset + inputLength);
      try {
        if (buf.byteLength) {
          const asn = localFromBER(buf, 0, buf.byteLength);
          if (asn.offset !== -1 && asn.offset === inputLength) {
            this.valueBlock.value = [asn.result];
          }
        }
      } catch (e) {
      }
    }
    return super.fromBER(inputBuffer, inputOffset, inputLength);
  }
  onAsciiEncoding() {
    if (this.valueBlock.isConstructed || this.valueBlock.value && this.valueBlock.value.length) {
      return Constructed.prototype.onAsciiEncoding.call(this);
    }
    return `${this.constructor.NAME} : ${pvtsutils.Convert.ToHex(this.valueBlock.valueHexView)}`;
  }
  getValue() {
    if (!this.idBlock.isConstructed) {
      return this.valueBlock.valueHexView.slice().buffer;
    }
    const array = [];
    for (const content of this.valueBlock.value) {
      if (content instanceof _OctetString) {
        array.push(content.valueBlock.valueHexView);
      }
    }
    return pvtsutils.BufferSourceConverter.concat(array);
  }
};
_a$r = OctetString;
(() => {
  typeStore.OctetString = _a$r;
})();
OctetString.NAME = OCTET_STRING_NAME;
var LocalBitStringValueBlock = class extends HexBlock(LocalConstructedValueBlock) {
  constructor({ unusedBits = 0, isConstructed = false, ...parameters } = {}) {
    super(parameters);
    this.unusedBits = unusedBits;
    this.isConstructed = isConstructed;
    this.blockLength = this.valueHexView.byteLength;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    if (!inputLength) {
      return inputOffset;
    }
    let resultOffset = -1;
    if (this.isConstructed) {
      resultOffset = LocalConstructedValueBlock.prototype.fromBER.call(this, inputBuffer, inputOffset, inputLength);
      if (resultOffset === -1)
        return resultOffset;
      for (const value of this.value) {
        const currentBlockName = value.constructor.NAME;
        if (currentBlockName === END_OF_CONTENT_NAME) {
          if (this.isIndefiniteForm)
            break;
          else {
            this.error = "EndOfContent is unexpected, BIT STRING may consists of BIT STRINGs only";
            return -1;
          }
        }
        if (currentBlockName !== BIT_STRING_NAME) {
          this.error = "BIT STRING may consists of BIT STRINGs only";
          return -1;
        }
        const valueBlock = value.valueBlock;
        if (this.unusedBits > 0 && valueBlock.unusedBits > 0) {
          this.error = 'Using of "unused bits" inside constructive BIT STRING allowed for least one only';
          return -1;
        }
        this.unusedBits = valueBlock.unusedBits;
      }
      return resultOffset;
    }
    const inputView = pvtsutils.BufferSourceConverter.toUint8Array(inputBuffer);
    if (!checkBufferParams(this, inputView, inputOffset, inputLength)) {
      return -1;
    }
    const intBuffer = inputView.subarray(inputOffset, inputOffset + inputLength);
    this.unusedBits = intBuffer[0];
    if (this.unusedBits > 7) {
      this.error = "Unused bits for BitString must be in range 0-7";
      return -1;
    }
    if (!this.unusedBits) {
      const buf = intBuffer.subarray(1);
      try {
        if (buf.byteLength) {
          const asn = localFromBER(buf, 0, buf.byteLength);
          if (asn.offset !== -1 && asn.offset === inputLength - 1) {
            this.value = [asn.result];
          }
        }
      } catch (e) {
      }
    }
    this.valueHexView = intBuffer.subarray(1);
    this.blockLength = intBuffer.length;
    return inputOffset + inputLength;
  }
  toBER(sizeOnly, writer) {
    if (this.isConstructed) {
      return LocalConstructedValueBlock.prototype.toBER.call(this, sizeOnly, writer);
    }
    if (sizeOnly) {
      return new ArrayBuffer(this.valueHexView.byteLength + 1);
    }
    if (!this.valueHexView.byteLength) {
      return EMPTY_BUFFER;
    }
    const retView = new Uint8Array(this.valueHexView.length + 1);
    retView[0] = this.unusedBits;
    retView.set(this.valueHexView, 1);
    return retView.buffer;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      unusedBits: this.unusedBits,
      isConstructed: this.isConstructed
    };
  }
};
LocalBitStringValueBlock.NAME = "BitStringValueBlock";
var _a$q;
var BitString = class extends BaseBlock {
  constructor({ idBlock = {}, lenBlock = {}, ...parameters } = {}) {
    var _b, _c;
    (_b = parameters.isConstructed) !== null && _b !== void 0 ? _b : parameters.isConstructed = !!((_c = parameters.value) === null || _c === void 0 ? void 0 : _c.length);
    super({
      idBlock: {
        isConstructed: parameters.isConstructed,
        ...idBlock
      },
      lenBlock: {
        ...lenBlock,
        isIndefiniteForm: !!parameters.isIndefiniteForm
      },
      ...parameters
    }, LocalBitStringValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 3;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    this.valueBlock.isConstructed = this.idBlock.isConstructed;
    this.valueBlock.isIndefiniteForm = this.lenBlock.isIndefiniteForm;
    return super.fromBER(inputBuffer, inputOffset, inputLength);
  }
  onAsciiEncoding() {
    if (this.valueBlock.isConstructed || this.valueBlock.value && this.valueBlock.value.length) {
      return Constructed.prototype.onAsciiEncoding.call(this);
    } else {
      const bits = [];
      const valueHex = this.valueBlock.valueHexView;
      for (const byte of valueHex) {
        bits.push(byte.toString(2).padStart(8, "0"));
      }
      const bitsStr = bits.join("");
      return `${this.constructor.NAME} : ${bitsStr.substring(0, bitsStr.length - this.valueBlock.unusedBits)}`;
    }
  }
};
_a$q = BitString;
(() => {
  typeStore.BitString = _a$q;
})();
BitString.NAME = BIT_STRING_NAME;
var _a$p;
function viewAdd(first, second) {
  const c = new Uint8Array([0]);
  const firstView = new Uint8Array(first);
  const secondView = new Uint8Array(second);
  let firstViewCopy = firstView.slice(0);
  const firstViewCopyLength = firstViewCopy.length - 1;
  const secondViewCopy = secondView.slice(0);
  const secondViewCopyLength = secondViewCopy.length - 1;
  let value = 0;
  const max = secondViewCopyLength < firstViewCopyLength ? firstViewCopyLength : secondViewCopyLength;
  let counter = 0;
  for (let i = max; i >= 0; i--, counter++) {
    switch (true) {
      case counter < secondViewCopy.length:
        value = firstViewCopy[firstViewCopyLength - counter] + secondViewCopy[secondViewCopyLength - counter] + c[0];
        break;
      default:
        value = firstViewCopy[firstViewCopyLength - counter] + c[0];
    }
    c[0] = value / 10;
    switch (true) {
      case counter >= firstViewCopy.length:
        firstViewCopy = utilConcatView(new Uint8Array([value % 10]), firstViewCopy);
        break;
      default:
        firstViewCopy[firstViewCopyLength - counter] = value % 10;
    }
  }
  if (c[0] > 0)
    firstViewCopy = utilConcatView(c, firstViewCopy);
  return firstViewCopy;
}
function power2(n) {
  if (n >= powers2.length) {
    for (let p = powers2.length; p <= n; p++) {
      const c = new Uint8Array([0]);
      let digits = powers2[p - 1].slice(0);
      for (let i = digits.length - 1; i >= 0; i--) {
        const newValue = new Uint8Array([(digits[i] << 1) + c[0]]);
        c[0] = newValue[0] / 10;
        digits[i] = newValue[0] % 10;
      }
      if (c[0] > 0)
        digits = utilConcatView(c, digits);
      powers2.push(digits);
    }
  }
  return powers2[n];
}
function viewSub(first, second) {
  let b = 0;
  const firstView = new Uint8Array(first);
  const secondView = new Uint8Array(second);
  const firstViewCopy = firstView.slice(0);
  const firstViewCopyLength = firstViewCopy.length - 1;
  const secondViewCopy = secondView.slice(0);
  const secondViewCopyLength = secondViewCopy.length - 1;
  let value;
  let counter = 0;
  for (let i = secondViewCopyLength; i >= 0; i--, counter++) {
    value = firstViewCopy[firstViewCopyLength - counter] - secondViewCopy[secondViewCopyLength - counter] - b;
    switch (true) {
      case value < 0:
        b = 1;
        firstViewCopy[firstViewCopyLength - counter] = value + 10;
        break;
      default:
        b = 0;
        firstViewCopy[firstViewCopyLength - counter] = value;
    }
  }
  if (b > 0) {
    for (let i = firstViewCopyLength - secondViewCopyLength + 1; i >= 0; i--, counter++) {
      value = firstViewCopy[firstViewCopyLength - counter] - b;
      if (value < 0) {
        b = 1;
        firstViewCopy[firstViewCopyLength - counter] = value + 10;
      } else {
        b = 0;
        firstViewCopy[firstViewCopyLength - counter] = value;
        break;
      }
    }
  }
  return firstViewCopy.slice();
}
var LocalIntegerValueBlock = class extends HexBlock(ValueBlock) {
  constructor({ value, ...parameters } = {}) {
    super(parameters);
    this._valueDec = 0;
    if (parameters.valueHex) {
      this.setValueHex();
    }
    if (value !== void 0) {
      this.valueDec = value;
    }
  }
  setValueHex() {
    if (this.valueHexView.length >= 4) {
      this.warnings.push("Too big Integer for decoding, hex only");
      this.isHexOnly = true;
      this._valueDec = 0;
    } else {
      this.isHexOnly = false;
      if (this.valueHexView.length > 0) {
        this._valueDec = utilDecodeTC.call(this);
      }
    }
  }
  set valueDec(v) {
    this._valueDec = v;
    this.isHexOnly = false;
    this.valueHexView = new Uint8Array(utilEncodeTC(v));
  }
  get valueDec() {
    return this._valueDec;
  }
  fromDER(inputBuffer, inputOffset, inputLength, expectedLength = 0) {
    const offset = this.fromBER(inputBuffer, inputOffset, inputLength);
    if (offset === -1)
      return offset;
    const view = this.valueHexView;
    if (view[0] === 0 && (view[1] & 128) !== 0) {
      this.valueHexView = view.subarray(1);
    } else {
      if (expectedLength !== 0) {
        if (view.length < expectedLength) {
          if (expectedLength - view.length > 1)
            expectedLength = view.length + 1;
          this.valueHexView = view.subarray(expectedLength - view.length);
        }
      }
    }
    return offset;
  }
  toDER(sizeOnly = false) {
    const view = this.valueHexView;
    switch (true) {
      case (view[0] & 128) !== 0:
        {
          const updatedView = new Uint8Array(this.valueHexView.length + 1);
          updatedView[0] = 0;
          updatedView.set(view, 1);
          this.valueHexView = updatedView;
        }
        break;
      case (view[0] === 0 && (view[1] & 128) === 0):
        {
          this.valueHexView = this.valueHexView.subarray(1);
        }
        break;
    }
    return this.toBER(sizeOnly);
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    const resultOffset = super.fromBER(inputBuffer, inputOffset, inputLength);
    if (resultOffset === -1) {
      return resultOffset;
    }
    this.setValueHex();
    return resultOffset;
  }
  toBER(sizeOnly) {
    return sizeOnly ? new ArrayBuffer(this.valueHexView.length) : this.valueHexView.slice().buffer;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      valueDec: this.valueDec
    };
  }
  toString() {
    const firstBit = this.valueHexView.length * 8 - 1;
    let digits = new Uint8Array(this.valueHexView.length * 8 / 3);
    let bitNumber = 0;
    let currentByte;
    const asn1View = this.valueHexView;
    let result = "";
    let flag = false;
    for (let byteNumber = asn1View.byteLength - 1; byteNumber >= 0; byteNumber--) {
      currentByte = asn1View[byteNumber];
      for (let i = 0; i < 8; i++) {
        if ((currentByte & 1) === 1) {
          switch (bitNumber) {
            case firstBit:
              digits = viewSub(power2(bitNumber), digits);
              result = "-";
              break;
            default:
              digits = viewAdd(digits, power2(bitNumber));
          }
        }
        bitNumber++;
        currentByte >>= 1;
      }
    }
    for (let i = 0; i < digits.length; i++) {
      if (digits[i])
        flag = true;
      if (flag)
        result += digitsString.charAt(digits[i]);
    }
    if (flag === false)
      result += digitsString.charAt(0);
    return result;
  }
};
_a$p = LocalIntegerValueBlock;
LocalIntegerValueBlock.NAME = "IntegerValueBlock";
(() => {
  Object.defineProperty(_a$p.prototype, "valueHex", {
    set: function(v) {
      this.valueHexView = new Uint8Array(v);
      this.setValueHex();
    },
    get: function() {
      return this.valueHexView.slice().buffer;
    }
  });
})();
var _a$o;
var Integer = class _Integer extends BaseBlock {
  constructor(parameters = {}) {
    super(parameters, LocalIntegerValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 2;
  }
  toBigInt() {
    assertBigInt();
    return BigInt(this.valueBlock.toString());
  }
  static fromBigInt(value) {
    assertBigInt();
    const bigIntValue = BigInt(value);
    const writer = new ViewWriter();
    const hex = bigIntValue.toString(16).replace(/^-/, "");
    const view = new Uint8Array(pvtsutils.Convert.FromHex(hex));
    if (bigIntValue < 0) {
      const first = new Uint8Array(view.length + (view[0] & 128 ? 1 : 0));
      first[0] |= 128;
      const firstInt = BigInt(`0x${pvtsutils.Convert.ToHex(first)}`);
      const secondInt = firstInt + bigIntValue;
      const second = pvtsutils.BufferSourceConverter.toUint8Array(pvtsutils.Convert.FromHex(secondInt.toString(16)));
      second[0] |= 128;
      writer.write(second);
    } else {
      if (view[0] & 128) {
        writer.write(new Uint8Array([0]));
      }
      writer.write(view);
    }
    const res = new _Integer({
      valueHex: writer.final()
    });
    return res;
  }
  convertToDER() {
    const integer = new _Integer({ valueHex: this.valueBlock.valueHexView });
    integer.valueBlock.toDER();
    return integer;
  }
  convertFromDER() {
    return new _Integer({
      valueHex: this.valueBlock.valueHexView[0] === 0 ? this.valueBlock.valueHexView.subarray(1) : this.valueBlock.valueHexView
    });
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME} : ${this.valueBlock.toString()}`;
  }
};
_a$o = Integer;
(() => {
  typeStore.Integer = _a$o;
})();
Integer.NAME = "INTEGER";
var _a$n;
var Enumerated = class extends Integer {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 10;
  }
};
_a$n = Enumerated;
(() => {
  typeStore.Enumerated = _a$n;
})();
Enumerated.NAME = "ENUMERATED";
var LocalSidValueBlock = class extends HexBlock(ValueBlock) {
  constructor({ valueDec = -1, isFirstSid = false, ...parameters } = {}) {
    super(parameters);
    this.valueDec = valueDec;
    this.isFirstSid = isFirstSid;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    if (!inputLength) {
      return inputOffset;
    }
    const inputView = pvtsutils.BufferSourceConverter.toUint8Array(inputBuffer);
    if (!checkBufferParams(this, inputView, inputOffset, inputLength)) {
      return -1;
    }
    const intBuffer = inputView.subarray(inputOffset, inputOffset + inputLength);
    this.valueHexView = new Uint8Array(inputLength);
    for (let i = 0; i < inputLength; i++) {
      this.valueHexView[i] = intBuffer[i] & 127;
      this.blockLength++;
      if ((intBuffer[i] & 128) === 0)
        break;
    }
    const tempView = new Uint8Array(this.blockLength);
    for (let i = 0; i < this.blockLength; i++) {
      tempView[i] = this.valueHexView[i];
    }
    this.valueHexView = tempView;
    if ((intBuffer[this.blockLength - 1] & 128) !== 0) {
      this.error = "End of input reached before message was fully decoded";
      return -1;
    }
    if (this.valueHexView[0] === 0)
      this.warnings.push("Needlessly long format of SID encoding");
    if (this.blockLength <= 8)
      this.valueDec = utilFromBase(this.valueHexView, 7);
    else {
      this.isHexOnly = true;
      this.warnings.push("Too big SID for decoding, hex only");
    }
    return inputOffset + this.blockLength;
  }
  set valueBigInt(value) {
    assertBigInt();
    let bits = BigInt(value).toString(2);
    while (bits.length % 7) {
      bits = "0" + bits;
    }
    const bytes = new Uint8Array(bits.length / 7);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(bits.slice(i * 7, i * 7 + 7), 2) + (i + 1 < bytes.length ? 128 : 0);
    }
    this.fromBER(bytes.buffer, 0, bytes.length);
  }
  toBER(sizeOnly) {
    if (this.isHexOnly) {
      if (sizeOnly)
        return new ArrayBuffer(this.valueHexView.byteLength);
      const curView = this.valueHexView;
      const retView2 = new Uint8Array(this.blockLength);
      for (let i = 0; i < this.blockLength - 1; i++)
        retView2[i] = curView[i] | 128;
      retView2[this.blockLength - 1] = curView[this.blockLength - 1];
      return retView2.buffer;
    }
    const encodedBuf = utilToBase(this.valueDec, 7);
    if (encodedBuf.byteLength === 0) {
      this.error = "Error during encoding SID value";
      return EMPTY_BUFFER;
    }
    const retView = new Uint8Array(encodedBuf.byteLength);
    if (!sizeOnly) {
      const encodedView = new Uint8Array(encodedBuf);
      const len = encodedBuf.byteLength - 1;
      for (let i = 0; i < len; i++)
        retView[i] = encodedView[i] | 128;
      retView[len] = encodedView[len];
    }
    return retView;
  }
  toString() {
    let result = "";
    if (this.isHexOnly)
      result = pvtsutils.Convert.ToHex(this.valueHexView);
    else {
      if (this.isFirstSid) {
        let sidValue = this.valueDec;
        if (this.valueDec <= 39)
          result = "0.";
        else {
          if (this.valueDec <= 79) {
            result = "1.";
            sidValue -= 40;
          } else {
            result = "2.";
            sidValue -= 80;
          }
        }
        result += sidValue.toString();
      } else
        result = this.valueDec.toString();
    }
    return result;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      valueDec: this.valueDec,
      isFirstSid: this.isFirstSid
    };
  }
};
LocalSidValueBlock.NAME = "sidBlock";
var LocalObjectIdentifierValueBlock = class extends ValueBlock {
  constructor({ value = EMPTY_STRING, ...parameters } = {}) {
    super(parameters);
    this.value = [];
    if (value) {
      this.fromString(value);
    }
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    let resultOffset = inputOffset;
    while (inputLength > 0) {
      const sidBlock = new LocalSidValueBlock();
      resultOffset = sidBlock.fromBER(inputBuffer, resultOffset, inputLength);
      if (resultOffset === -1) {
        this.blockLength = 0;
        this.error = sidBlock.error;
        return resultOffset;
      }
      if (this.value.length === 0)
        sidBlock.isFirstSid = true;
      this.blockLength += sidBlock.blockLength;
      inputLength -= sidBlock.blockLength;
      this.value.push(sidBlock);
    }
    return resultOffset;
  }
  toBER(sizeOnly) {
    const retBuffers = [];
    for (let i = 0; i < this.value.length; i++) {
      const valueBuf = this.value[i].toBER(sizeOnly);
      if (valueBuf.byteLength === 0) {
        this.error = this.value[i].error;
        return EMPTY_BUFFER;
      }
      retBuffers.push(valueBuf);
    }
    return concat(retBuffers);
  }
  fromString(string) {
    this.value = [];
    let pos1 = 0;
    let pos2 = 0;
    let sid = "";
    let flag = false;
    do {
      pos2 = string.indexOf(".", pos1);
      if (pos2 === -1)
        sid = string.substring(pos1);
      else
        sid = string.substring(pos1, pos2);
      pos1 = pos2 + 1;
      if (flag) {
        const sidBlock = this.value[0];
        let plus = 0;
        switch (sidBlock.valueDec) {
          case 0:
            break;
          case 1:
            plus = 40;
            break;
          case 2:
            plus = 80;
            break;
          default:
            this.value = [];
            return;
        }
        const parsedSID = parseInt(sid, 10);
        if (isNaN(parsedSID))
          return;
        sidBlock.valueDec = parsedSID + plus;
        flag = false;
      } else {
        const sidBlock = new LocalSidValueBlock();
        if (sid > Number.MAX_SAFE_INTEGER) {
          assertBigInt();
          const sidValue = BigInt(sid);
          sidBlock.valueBigInt = sidValue;
        } else {
          sidBlock.valueDec = parseInt(sid, 10);
          if (isNaN(sidBlock.valueDec))
            return;
        }
        if (!this.value.length) {
          sidBlock.isFirstSid = true;
          flag = true;
        }
        this.value.push(sidBlock);
      }
    } while (pos2 !== -1);
  }
  toString() {
    let result = "";
    let isHexOnly = false;
    for (let i = 0; i < this.value.length; i++) {
      isHexOnly = this.value[i].isHexOnly;
      let sidStr = this.value[i].toString();
      if (i !== 0)
        result = `${result}.`;
      if (isHexOnly) {
        sidStr = `{${sidStr}}`;
        if (this.value[i].isFirstSid)
          result = `2.{${sidStr} - 80}`;
        else
          result += sidStr;
      } else
        result += sidStr;
    }
    return result;
  }
  toJSON() {
    const object = {
      ...super.toJSON(),
      value: this.toString(),
      sidArray: []
    };
    for (let i = 0; i < this.value.length; i++) {
      object.sidArray.push(this.value[i].toJSON());
    }
    return object;
  }
};
LocalObjectIdentifierValueBlock.NAME = "ObjectIdentifierValueBlock";
var _a$m;
var ObjectIdentifier = class extends BaseBlock {
  constructor(parameters = {}) {
    super(parameters, LocalObjectIdentifierValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 6;
  }
  getValue() {
    return this.valueBlock.toString();
  }
  setValue(value) {
    this.valueBlock.fromString(value);
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME} : ${this.valueBlock.toString() || "empty"}`;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      value: this.getValue()
    };
  }
};
_a$m = ObjectIdentifier;
(() => {
  typeStore.ObjectIdentifier = _a$m;
})();
ObjectIdentifier.NAME = "OBJECT IDENTIFIER";
var LocalRelativeSidValueBlock = class extends HexBlock(LocalBaseBlock) {
  constructor({ valueDec = 0, ...parameters } = {}) {
    super(parameters);
    this.valueDec = valueDec;
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    if (inputLength === 0)
      return inputOffset;
    const inputView = pvtsutils.BufferSourceConverter.toUint8Array(inputBuffer);
    if (!checkBufferParams(this, inputView, inputOffset, inputLength))
      return -1;
    const intBuffer = inputView.subarray(inputOffset, inputOffset + inputLength);
    this.valueHexView = new Uint8Array(inputLength);
    for (let i = 0; i < inputLength; i++) {
      this.valueHexView[i] = intBuffer[i] & 127;
      this.blockLength++;
      if ((intBuffer[i] & 128) === 0)
        break;
    }
    const tempView = new Uint8Array(this.blockLength);
    for (let i = 0; i < this.blockLength; i++)
      tempView[i] = this.valueHexView[i];
    this.valueHexView = tempView;
    if ((intBuffer[this.blockLength - 1] & 128) !== 0) {
      this.error = "End of input reached before message was fully decoded";
      return -1;
    }
    if (this.valueHexView[0] === 0)
      this.warnings.push("Needlessly long format of SID encoding");
    if (this.blockLength <= 8)
      this.valueDec = utilFromBase(this.valueHexView, 7);
    else {
      this.isHexOnly = true;
      this.warnings.push("Too big SID for decoding, hex only");
    }
    return inputOffset + this.blockLength;
  }
  toBER(sizeOnly) {
    if (this.isHexOnly) {
      if (sizeOnly)
        return new ArrayBuffer(this.valueHexView.byteLength);
      const curView = this.valueHexView;
      const retView2 = new Uint8Array(this.blockLength);
      for (let i = 0; i < this.blockLength - 1; i++)
        retView2[i] = curView[i] | 128;
      retView2[this.blockLength - 1] = curView[this.blockLength - 1];
      return retView2.buffer;
    }
    const encodedBuf = utilToBase(this.valueDec, 7);
    if (encodedBuf.byteLength === 0) {
      this.error = "Error during encoding SID value";
      return EMPTY_BUFFER;
    }
    const retView = new Uint8Array(encodedBuf.byteLength);
    if (!sizeOnly) {
      const encodedView = new Uint8Array(encodedBuf);
      const len = encodedBuf.byteLength - 1;
      for (let i = 0; i < len; i++)
        retView[i] = encodedView[i] | 128;
      retView[len] = encodedView[len];
    }
    return retView.buffer;
  }
  toString() {
    let result = "";
    if (this.isHexOnly)
      result = pvtsutils.Convert.ToHex(this.valueHexView);
    else {
      result = this.valueDec.toString();
    }
    return result;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      valueDec: this.valueDec
    };
  }
};
LocalRelativeSidValueBlock.NAME = "relativeSidBlock";
var LocalRelativeObjectIdentifierValueBlock = class extends ValueBlock {
  constructor({ value = EMPTY_STRING, ...parameters } = {}) {
    super(parameters);
    this.value = [];
    if (value) {
      this.fromString(value);
    }
  }
  fromBER(inputBuffer, inputOffset, inputLength) {
    let resultOffset = inputOffset;
    while (inputLength > 0) {
      const sidBlock = new LocalRelativeSidValueBlock();
      resultOffset = sidBlock.fromBER(inputBuffer, resultOffset, inputLength);
      if (resultOffset === -1) {
        this.blockLength = 0;
        this.error = sidBlock.error;
        return resultOffset;
      }
      this.blockLength += sidBlock.blockLength;
      inputLength -= sidBlock.blockLength;
      this.value.push(sidBlock);
    }
    return resultOffset;
  }
  toBER(sizeOnly, writer) {
    const retBuffers = [];
    for (let i = 0; i < this.value.length; i++) {
      const valueBuf = this.value[i].toBER(sizeOnly);
      if (valueBuf.byteLength === 0) {
        this.error = this.value[i].error;
        return EMPTY_BUFFER;
      }
      retBuffers.push(valueBuf);
    }
    return concat(retBuffers);
  }
  fromString(string) {
    this.value = [];
    let pos1 = 0;
    let pos2 = 0;
    let sid = "";
    do {
      pos2 = string.indexOf(".", pos1);
      if (pos2 === -1)
        sid = string.substring(pos1);
      else
        sid = string.substring(pos1, pos2);
      pos1 = pos2 + 1;
      const sidBlock = new LocalRelativeSidValueBlock();
      sidBlock.valueDec = parseInt(sid, 10);
      if (isNaN(sidBlock.valueDec))
        return true;
      this.value.push(sidBlock);
    } while (pos2 !== -1);
    return true;
  }
  toString() {
    let result = "";
    let isHexOnly = false;
    for (let i = 0; i < this.value.length; i++) {
      isHexOnly = this.value[i].isHexOnly;
      let sidStr = this.value[i].toString();
      if (i !== 0)
        result = `${result}.`;
      if (isHexOnly) {
        sidStr = `{${sidStr}}`;
        result += sidStr;
      } else
        result += sidStr;
    }
    return result;
  }
  toJSON() {
    const object = {
      ...super.toJSON(),
      value: this.toString(),
      sidArray: []
    };
    for (let i = 0; i < this.value.length; i++)
      object.sidArray.push(this.value[i].toJSON());
    return object;
  }
};
LocalRelativeObjectIdentifierValueBlock.NAME = "RelativeObjectIdentifierValueBlock";
var _a$l;
var RelativeObjectIdentifier = class extends BaseBlock {
  constructor(parameters = {}) {
    super(parameters, LocalRelativeObjectIdentifierValueBlock);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 13;
  }
  getValue() {
    return this.valueBlock.toString();
  }
  setValue(value) {
    this.valueBlock.fromString(value);
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME} : ${this.valueBlock.toString() || "empty"}`;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      value: this.getValue()
    };
  }
};
_a$l = RelativeObjectIdentifier;
(() => {
  typeStore.RelativeObjectIdentifier = _a$l;
})();
RelativeObjectIdentifier.NAME = "RelativeObjectIdentifier";
var _a$k;
var Sequence = class extends Constructed {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 16;
  }
};
_a$k = Sequence;
(() => {
  typeStore.Sequence = _a$k;
})();
Sequence.NAME = "SEQUENCE";
var _a$j;
var Set = class extends Constructed {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 17;
  }
};
_a$j = Set;
(() => {
  typeStore.Set = _a$j;
})();
Set.NAME = "SET";
var LocalStringValueBlock = class extends HexBlock(ValueBlock) {
  constructor({ ...parameters } = {}) {
    super(parameters);
    this.isHexOnly = true;
    this.value = EMPTY_STRING;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      value: this.value
    };
  }
};
LocalStringValueBlock.NAME = "StringValueBlock";
var LocalSimpleStringValueBlock = class extends LocalStringValueBlock {
};
LocalSimpleStringValueBlock.NAME = "SimpleStringValueBlock";
var LocalSimpleStringBlock = class extends BaseStringBlock {
  constructor({ ...parameters } = {}) {
    super(parameters, LocalSimpleStringValueBlock);
  }
  fromBuffer(inputBuffer) {
    this.valueBlock.value = String.fromCharCode.apply(null, pvtsutils.BufferSourceConverter.toUint8Array(inputBuffer));
  }
  fromString(inputString) {
    const strLen = inputString.length;
    const view = this.valueBlock.valueHexView = new Uint8Array(strLen);
    for (let i = 0; i < strLen; i++)
      view[i] = inputString.charCodeAt(i);
    this.valueBlock.value = inputString;
  }
};
LocalSimpleStringBlock.NAME = "SIMPLE STRING";
var LocalUtf8StringValueBlock = class extends LocalSimpleStringBlock {
  fromBuffer(inputBuffer) {
    this.valueBlock.valueHexView = pvtsutils.BufferSourceConverter.toUint8Array(inputBuffer);
    try {
      this.valueBlock.value = pvtsutils.Convert.ToUtf8String(inputBuffer);
    } catch (ex) {
      this.warnings.push(`Error during "decodeURIComponent": ${ex}, using raw string`);
      this.valueBlock.value = pvtsutils.Convert.ToBinary(inputBuffer);
    }
  }
  fromString(inputString) {
    this.valueBlock.valueHexView = new Uint8Array(pvtsutils.Convert.FromUtf8String(inputString));
    this.valueBlock.value = inputString;
  }
};
LocalUtf8StringValueBlock.NAME = "Utf8StringValueBlock";
var _a$i;
var Utf8String = class extends LocalUtf8StringValueBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 12;
  }
};
_a$i = Utf8String;
(() => {
  typeStore.Utf8String = _a$i;
})();
Utf8String.NAME = "UTF8String";
var LocalBmpStringValueBlock = class extends LocalSimpleStringBlock {
  fromBuffer(inputBuffer) {
    this.valueBlock.value = pvtsutils.Convert.ToUtf16String(inputBuffer);
    this.valueBlock.valueHexView = pvtsutils.BufferSourceConverter.toUint8Array(inputBuffer);
  }
  fromString(inputString) {
    this.valueBlock.value = inputString;
    this.valueBlock.valueHexView = new Uint8Array(pvtsutils.Convert.FromUtf16String(inputString));
  }
};
LocalBmpStringValueBlock.NAME = "BmpStringValueBlock";
var _a$h;
var BmpString = class extends LocalBmpStringValueBlock {
  constructor({ ...parameters } = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 30;
  }
};
_a$h = BmpString;
(() => {
  typeStore.BmpString = _a$h;
})();
BmpString.NAME = "BMPString";
var LocalUniversalStringValueBlock = class extends LocalSimpleStringBlock {
  fromBuffer(inputBuffer) {
    const copyBuffer = ArrayBuffer.isView(inputBuffer) ? inputBuffer.slice().buffer : inputBuffer.slice(0);
    const valueView = new Uint8Array(copyBuffer);
    for (let i = 0; i < valueView.length; i += 4) {
      valueView[i] = valueView[i + 3];
      valueView[i + 1] = valueView[i + 2];
      valueView[i + 2] = 0;
      valueView[i + 3] = 0;
    }
    this.valueBlock.value = String.fromCharCode.apply(null, new Uint32Array(copyBuffer));
  }
  fromString(inputString) {
    const strLength = inputString.length;
    const valueHexView = this.valueBlock.valueHexView = new Uint8Array(strLength * 4);
    for (let i = 0; i < strLength; i++) {
      const codeBuf = utilToBase(inputString.charCodeAt(i), 8);
      const codeView = new Uint8Array(codeBuf);
      if (codeView.length > 4)
        continue;
      const dif = 4 - codeView.length;
      for (let j = codeView.length - 1; j >= 0; j--)
        valueHexView[i * 4 + j + dif] = codeView[j];
    }
    this.valueBlock.value = inputString;
  }
};
LocalUniversalStringValueBlock.NAME = "UniversalStringValueBlock";
var _a$g;
var UniversalString = class extends LocalUniversalStringValueBlock {
  constructor({ ...parameters } = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 28;
  }
};
_a$g = UniversalString;
(() => {
  typeStore.UniversalString = _a$g;
})();
UniversalString.NAME = "UniversalString";
var _a$f;
var NumericString = class extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 18;
  }
};
_a$f = NumericString;
(() => {
  typeStore.NumericString = _a$f;
})();
NumericString.NAME = "NumericString";
var _a$e;
var PrintableString = class extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 19;
  }
};
_a$e = PrintableString;
(() => {
  typeStore.PrintableString = _a$e;
})();
PrintableString.NAME = "PrintableString";
var _a$d;
var TeletexString = class extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 20;
  }
};
_a$d = TeletexString;
(() => {
  typeStore.TeletexString = _a$d;
})();
TeletexString.NAME = "TeletexString";
var _a$c;
var VideotexString = class extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 21;
  }
};
_a$c = VideotexString;
(() => {
  typeStore.VideotexString = _a$c;
})();
VideotexString.NAME = "VideotexString";
var _a$b;
var IA5String = class extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 22;
  }
};
_a$b = IA5String;
(() => {
  typeStore.IA5String = _a$b;
})();
IA5String.NAME = "IA5String";
var _a$a;
var GraphicString = class extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 25;
  }
};
_a$a = GraphicString;
(() => {
  typeStore.GraphicString = _a$a;
})();
GraphicString.NAME = "GraphicString";
var _a$9;
var VisibleString = class extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 26;
  }
};
_a$9 = VisibleString;
(() => {
  typeStore.VisibleString = _a$9;
})();
VisibleString.NAME = "VisibleString";
var _a$8;
var GeneralString = class extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 27;
  }
};
_a$8 = GeneralString;
(() => {
  typeStore.GeneralString = _a$8;
})();
GeneralString.NAME = "GeneralString";
var _a$7;
var CharacterString = class extends LocalSimpleStringBlock {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 29;
  }
};
_a$7 = CharacterString;
(() => {
  typeStore.CharacterString = _a$7;
})();
CharacterString.NAME = "CharacterString";
var _a$6;
var UTCTime = class extends VisibleString {
  constructor({ value, valueDate, ...parameters } = {}) {
    super(parameters);
    this.year = 0;
    this.month = 0;
    this.day = 0;
    this.hour = 0;
    this.minute = 0;
    this.second = 0;
    if (value) {
      this.fromString(value);
      this.valueBlock.valueHexView = new Uint8Array(value.length);
      for (let i = 0; i < value.length; i++)
        this.valueBlock.valueHexView[i] = value.charCodeAt(i);
    }
    if (valueDate) {
      this.fromDate(valueDate);
      this.valueBlock.valueHexView = new Uint8Array(this.toBuffer());
    }
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 23;
  }
  fromBuffer(inputBuffer) {
    this.fromString(String.fromCharCode.apply(null, pvtsutils.BufferSourceConverter.toUint8Array(inputBuffer)));
  }
  toBuffer() {
    const str = this.toString();
    const buffer = new ArrayBuffer(str.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < str.length; i++)
      view[i] = str.charCodeAt(i);
    return buffer;
  }
  fromDate(inputDate) {
    this.year = inputDate.getUTCFullYear();
    this.month = inputDate.getUTCMonth() + 1;
    this.day = inputDate.getUTCDate();
    this.hour = inputDate.getUTCHours();
    this.minute = inputDate.getUTCMinutes();
    this.second = inputDate.getUTCSeconds();
  }
  toDate() {
    return new Date(Date.UTC(this.year, this.month - 1, this.day, this.hour, this.minute, this.second));
  }
  fromString(inputString) {
    const parser = /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z/ig;
    const parserArray = parser.exec(inputString);
    if (parserArray === null) {
      this.error = "Wrong input string for conversion";
      return;
    }
    const year = parseInt(parserArray[1], 10);
    if (year >= 50)
      this.year = 1900 + year;
    else
      this.year = 2e3 + year;
    this.month = parseInt(parserArray[2], 10);
    this.day = parseInt(parserArray[3], 10);
    this.hour = parseInt(parserArray[4], 10);
    this.minute = parseInt(parserArray[5], 10);
    this.second = parseInt(parserArray[6], 10);
  }
  toString(encoding = "iso") {
    if (encoding === "iso") {
      const outputArray = new Array(7);
      outputArray[0] = padNumber(this.year < 2e3 ? this.year - 1900 : this.year - 2e3, 2);
      outputArray[1] = padNumber(this.month, 2);
      outputArray[2] = padNumber(this.day, 2);
      outputArray[3] = padNumber(this.hour, 2);
      outputArray[4] = padNumber(this.minute, 2);
      outputArray[5] = padNumber(this.second, 2);
      outputArray[6] = "Z";
      return outputArray.join("");
    }
    return super.toString(encoding);
  }
  onAsciiEncoding() {
    return `${this.constructor.NAME} : ${this.toDate().toISOString()}`;
  }
  toJSON() {
    return {
      ...super.toJSON(),
      year: this.year,
      month: this.month,
      day: this.day,
      hour: this.hour,
      minute: this.minute,
      second: this.second
    };
  }
};
_a$6 = UTCTime;
(() => {
  typeStore.UTCTime = _a$6;
})();
UTCTime.NAME = "UTCTime";
var _a$5;
var GeneralizedTime = class extends UTCTime {
  constructor(parameters = {}) {
    var _b;
    super(parameters);
    (_b = this.millisecond) !== null && _b !== void 0 ? _b : this.millisecond = 0;
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 24;
  }
  fromDate(inputDate) {
    super.fromDate(inputDate);
    this.millisecond = inputDate.getUTCMilliseconds();
  }
  toDate() {
    return new Date(Date.UTC(this.year, this.month - 1, this.day, this.hour, this.minute, this.second, this.millisecond));
  }
  fromString(inputString) {
    let isUTC = false;
    let timeString = "";
    let dateTimeString = "";
    let fractionPart = 0;
    let parser;
    let hourDifference = 0;
    let minuteDifference = 0;
    if (inputString[inputString.length - 1] === "Z") {
      timeString = inputString.substring(0, inputString.length - 1);
      isUTC = true;
    } else {
      const number = new Number(inputString[inputString.length - 1]);
      if (isNaN(number.valueOf()))
        throw new Error("Wrong input string for conversion");
      timeString = inputString;
    }
    if (isUTC) {
      if (timeString.indexOf("+") !== -1)
        throw new Error("Wrong input string for conversion");
      if (timeString.indexOf("-") !== -1)
        throw new Error("Wrong input string for conversion");
    } else {
      let multiplier = 1;
      let differencePosition = timeString.indexOf("+");
      let differenceString = "";
      if (differencePosition === -1) {
        differencePosition = timeString.indexOf("-");
        multiplier = -1;
      }
      if (differencePosition !== -1) {
        differenceString = timeString.substring(differencePosition + 1);
        timeString = timeString.substring(0, differencePosition);
        if (differenceString.length !== 2 && differenceString.length !== 4)
          throw new Error("Wrong input string for conversion");
        let number = parseInt(differenceString.substring(0, 2), 10);
        if (isNaN(number.valueOf()))
          throw new Error("Wrong input string for conversion");
        hourDifference = multiplier * number;
        if (differenceString.length === 4) {
          number = parseInt(differenceString.substring(2, 4), 10);
          if (isNaN(number.valueOf()))
            throw new Error("Wrong input string for conversion");
          minuteDifference = multiplier * number;
        }
      }
    }
    let fractionPointPosition = timeString.indexOf(".");
    if (fractionPointPosition === -1)
      fractionPointPosition = timeString.indexOf(",");
    if (fractionPointPosition !== -1) {
      const fractionPartCheck = new Number(`0${timeString.substring(fractionPointPosition)}`);
      if (isNaN(fractionPartCheck.valueOf()))
        throw new Error("Wrong input string for conversion");
      fractionPart = fractionPartCheck.valueOf();
      dateTimeString = timeString.substring(0, fractionPointPosition);
    } else
      dateTimeString = timeString;
    switch (true) {
      case dateTimeString.length === 8:
        parser = /(\d{4})(\d{2})(\d{2})/ig;
        if (fractionPointPosition !== -1)
          throw new Error("Wrong input string for conversion");
        break;
      case dateTimeString.length === 10:
        parser = /(\d{4})(\d{2})(\d{2})(\d{2})/ig;
        if (fractionPointPosition !== -1) {
          let fractionResult = 60 * fractionPart;
          this.minute = Math.floor(fractionResult);
          fractionResult = 60 * (fractionResult - this.minute);
          this.second = Math.floor(fractionResult);
          fractionResult = 1e3 * (fractionResult - this.second);
          this.millisecond = Math.floor(fractionResult);
        }
        break;
      case dateTimeString.length === 12:
        parser = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/ig;
        if (fractionPointPosition !== -1) {
          let fractionResult = 60 * fractionPart;
          this.second = Math.floor(fractionResult);
          fractionResult = 1e3 * (fractionResult - this.second);
          this.millisecond = Math.floor(fractionResult);
        }
        break;
      case dateTimeString.length === 14:
        parser = /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/ig;
        if (fractionPointPosition !== -1) {
          const fractionResult = 1e3 * fractionPart;
          this.millisecond = Math.floor(fractionResult);
        }
        break;
      default:
        throw new Error("Wrong input string for conversion");
    }
    const parserArray = parser.exec(dateTimeString);
    if (parserArray === null)
      throw new Error("Wrong input string for conversion");
    for (let j = 1; j < parserArray.length; j++) {
      switch (j) {
        case 1:
          this.year = parseInt(parserArray[j], 10);
          break;
        case 2:
          this.month = parseInt(parserArray[j], 10);
          break;
        case 3:
          this.day = parseInt(parserArray[j], 10);
          break;
        case 4:
          this.hour = parseInt(parserArray[j], 10) + hourDifference;
          break;
        case 5:
          this.minute = parseInt(parserArray[j], 10) + minuteDifference;
          break;
        case 6:
          this.second = parseInt(parserArray[j], 10);
          break;
        default:
          throw new Error("Wrong input string for conversion");
      }
    }
    if (isUTC === false) {
      const tempDate = new Date(this.year, this.month, this.day, this.hour, this.minute, this.second, this.millisecond);
      this.year = tempDate.getUTCFullYear();
      this.month = tempDate.getUTCMonth();
      this.day = tempDate.getUTCDay();
      this.hour = tempDate.getUTCHours();
      this.minute = tempDate.getUTCMinutes();
      this.second = tempDate.getUTCSeconds();
      this.millisecond = tempDate.getUTCMilliseconds();
    }
  }
  toString(encoding = "iso") {
    if (encoding === "iso") {
      const outputArray = [];
      outputArray.push(padNumber(this.year, 4));
      outputArray.push(padNumber(this.month, 2));
      outputArray.push(padNumber(this.day, 2));
      outputArray.push(padNumber(this.hour, 2));
      outputArray.push(padNumber(this.minute, 2));
      outputArray.push(padNumber(this.second, 2));
      if (this.millisecond !== 0) {
        outputArray.push(".");
        outputArray.push(padNumber(this.millisecond, 3));
      }
      outputArray.push("Z");
      return outputArray.join("");
    }
    return super.toString(encoding);
  }
  toJSON() {
    return {
      ...super.toJSON(),
      millisecond: this.millisecond
    };
  }
};
_a$5 = GeneralizedTime;
(() => {
  typeStore.GeneralizedTime = _a$5;
})();
GeneralizedTime.NAME = "GeneralizedTime";
var _a$4;
var DATE = class extends Utf8String {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 31;
  }
};
_a$4 = DATE;
(() => {
  typeStore.DATE = _a$4;
})();
DATE.NAME = "DATE";
var _a$3;
var TimeOfDay = class extends Utf8String {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 32;
  }
};
_a$3 = TimeOfDay;
(() => {
  typeStore.TimeOfDay = _a$3;
})();
TimeOfDay.NAME = "TimeOfDay";
var _a$2;
var DateTime = class extends Utf8String {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 33;
  }
};
_a$2 = DateTime;
(() => {
  typeStore.DateTime = _a$2;
})();
DateTime.NAME = "DateTime";
var _a$1;
var Duration = class extends Utf8String {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 34;
  }
};
_a$1 = Duration;
(() => {
  typeStore.Duration = _a$1;
})();
Duration.NAME = "Duration";
var _a;
var TIME = class extends Utf8String {
  constructor(parameters = {}) {
    super(parameters);
    this.idBlock.tagClass = 1;
    this.idBlock.tagNumber = 14;
  }
};
_a = TIME;
(() => {
  typeStore.TIME = _a;
})();
TIME.NAME = "TIME";
var Any = class {
  constructor({ name = EMPTY_STRING, optional = false } = {}) {
    this.name = name;
    this.optional = optional;
  }
};
var Choice = class extends Any {
  constructor({ value = [], ...parameters } = {}) {
    super(parameters);
    this.value = value;
  }
};
var Repeated = class extends Any {
  constructor({ value = new Any(), local = false, ...parameters } = {}) {
    super(parameters);
    this.value = value;
    this.local = local;
  }
};
function compareSchema(root, inputData, inputSchema) {
  if (inputSchema instanceof Choice) {
    for (let j = 0; j < inputSchema.value.length; j++) {
      const result = compareSchema(root, inputData, inputSchema.value[j]);
      if (result.verified) {
        return {
          verified: true,
          result: root
        };
      }
    }
    {
      const _result = {
        verified: false,
        result: {
          error: "Wrong values for Choice type"
        }
      };
      if (inputSchema.hasOwnProperty(NAME))
        _result.name = inputSchema.name;
      return _result;
    }
  }
  if (inputSchema instanceof Any) {
    if (inputSchema.hasOwnProperty(NAME))
      root[inputSchema.name] = inputData;
    return {
      verified: true,
      result: root
    };
  }
  if (root instanceof Object === false) {
    return {
      verified: false,
      result: { error: "Wrong root object" }
    };
  }
  if (inputData instanceof Object === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 data" }
    };
  }
  if (inputSchema instanceof Object === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  if (ID_BLOCK in inputSchema === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  if (FROM_BER in inputSchema.idBlock === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  if (TO_BER in inputSchema.idBlock === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  const encodedId = inputSchema.idBlock.toBER(false);
  if (encodedId.byteLength === 0) {
    return {
      verified: false,
      result: { error: "Error encoding idBlock for ASN.1 schema" }
    };
  }
  const decodedOffset = inputSchema.idBlock.fromBER(encodedId, 0, encodedId.byteLength);
  if (decodedOffset === -1) {
    return {
      verified: false,
      result: { error: "Error decoding idBlock for ASN.1 schema" }
    };
  }
  if (inputSchema.idBlock.hasOwnProperty(TAG_CLASS) === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  if (inputSchema.idBlock.tagClass !== inputData.idBlock.tagClass) {
    return {
      verified: false,
      result: root
    };
  }
  if (inputSchema.idBlock.hasOwnProperty(TAG_NUMBER) === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  if (inputSchema.idBlock.tagNumber !== inputData.idBlock.tagNumber) {
    return {
      verified: false,
      result: root
    };
  }
  if (inputSchema.idBlock.hasOwnProperty(IS_CONSTRUCTED) === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  if (inputSchema.idBlock.isConstructed !== inputData.idBlock.isConstructed) {
    return {
      verified: false,
      result: root
    };
  }
  if (!(IS_HEX_ONLY in inputSchema.idBlock)) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema" }
    };
  }
  if (inputSchema.idBlock.isHexOnly !== inputData.idBlock.isHexOnly) {
    return {
      verified: false,
      result: root
    };
  }
  if (inputSchema.idBlock.isHexOnly) {
    if (VALUE_HEX_VIEW in inputSchema.idBlock === false) {
      return {
        verified: false,
        result: { error: "Wrong ASN.1 schema" }
      };
    }
    const schemaView = inputSchema.idBlock.valueHexView;
    const asn1View = inputData.idBlock.valueHexView;
    if (schemaView.length !== asn1View.length) {
      return {
        verified: false,
        result: root
      };
    }
    for (let i = 0; i < schemaView.length; i++) {
      if (schemaView[i] !== asn1View[1]) {
        return {
          verified: false,
          result: root
        };
      }
    }
  }
  if (inputSchema.name) {
    inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
    if (inputSchema.name)
      root[inputSchema.name] = inputData;
  }
  if (inputSchema instanceof typeStore.Constructed) {
    let admission = 0;
    let result = {
      verified: false,
      result: {
        error: "Unknown error"
      }
    };
    let maxLength = inputSchema.valueBlock.value.length;
    if (maxLength > 0) {
      if (inputSchema.valueBlock.value[0] instanceof Repeated) {
        maxLength = inputData.valueBlock.value.length;
      }
    }
    if (maxLength === 0) {
      return {
        verified: true,
        result: root
      };
    }
    if (inputData.valueBlock.value.length === 0 && inputSchema.valueBlock.value.length !== 0) {
      let _optional = true;
      for (let i = 0; i < inputSchema.valueBlock.value.length; i++)
        _optional = _optional && (inputSchema.valueBlock.value[i].optional || false);
      if (_optional) {
        return {
          verified: true,
          result: root
        };
      }
      if (inputSchema.name) {
        inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
        if (inputSchema.name)
          delete root[inputSchema.name];
      }
      root.error = "Inconsistent object length";
      return {
        verified: false,
        result: root
      };
    }
    for (let i = 0; i < maxLength; i++) {
      if (i - admission >= inputData.valueBlock.value.length) {
        if (inputSchema.valueBlock.value[i].optional === false) {
          const _result = {
            verified: false,
            result: root
          };
          root.error = "Inconsistent length between ASN.1 data and schema";
          if (inputSchema.name) {
            inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
            if (inputSchema.name) {
              delete root[inputSchema.name];
              _result.name = inputSchema.name;
            }
          }
          return _result;
        }
      } else {
        if (inputSchema.valueBlock.value[0] instanceof Repeated) {
          result = compareSchema(root, inputData.valueBlock.value[i], inputSchema.valueBlock.value[0].value);
          if (result.verified === false) {
            if (inputSchema.valueBlock.value[0].optional)
              admission++;
            else {
              if (inputSchema.name) {
                inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
                if (inputSchema.name)
                  delete root[inputSchema.name];
              }
              return result;
            }
          }
          if (NAME in inputSchema.valueBlock.value[0] && inputSchema.valueBlock.value[0].name.length > 0) {
            let arrayRoot = {};
            if (LOCAL in inputSchema.valueBlock.value[0] && inputSchema.valueBlock.value[0].local)
              arrayRoot = inputData;
            else
              arrayRoot = root;
            if (typeof arrayRoot[inputSchema.valueBlock.value[0].name] === "undefined")
              arrayRoot[inputSchema.valueBlock.value[0].name] = [];
            arrayRoot[inputSchema.valueBlock.value[0].name].push(inputData.valueBlock.value[i]);
          }
        } else {
          result = compareSchema(root, inputData.valueBlock.value[i - admission], inputSchema.valueBlock.value[i]);
          if (result.verified === false) {
            if (inputSchema.valueBlock.value[i].optional)
              admission++;
            else {
              if (inputSchema.name) {
                inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
                if (inputSchema.name)
                  delete root[inputSchema.name];
              }
              return result;
            }
          }
        }
      }
    }
    if (result.verified === false) {
      const _result = {
        verified: false,
        result: root
      };
      if (inputSchema.name) {
        inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
        if (inputSchema.name) {
          delete root[inputSchema.name];
          _result.name = inputSchema.name;
        }
      }
      return _result;
    }
    return {
      verified: true,
      result: root
    };
  }
  if (inputSchema.primitiveSchema && VALUE_HEX_VIEW in inputData.valueBlock) {
    const asn1 = localFromBER(inputData.valueBlock.valueHexView);
    if (asn1.offset === -1) {
      const _result = {
        verified: false,
        result: asn1.result
      };
      if (inputSchema.name) {
        inputSchema.name = inputSchema.name.replace(/^\s+|\s+$/g, EMPTY_STRING);
        if (inputSchema.name) {
          delete root[inputSchema.name];
          _result.name = inputSchema.name;
        }
      }
      return _result;
    }
    return compareSchema(root, asn1.result, inputSchema.primitiveSchema);
  }
  return {
    verified: true,
    result: root
  };
}
function verifySchema(inputBuffer, inputSchema) {
  if (inputSchema instanceof Object === false) {
    return {
      verified: false,
      result: { error: "Wrong ASN.1 schema type" }
    };
  }
  const asn1 = localFromBER(pvtsutils.BufferSourceConverter.toUint8Array(inputBuffer));
  if (asn1.offset === -1) {
    return {
      verified: false,
      result: asn1.result
    };
  }
  return compareSchema(asn1.result, asn1.result, inputSchema);
}

// node_modules/@cloudflare/privacypass-ts/lib/src/util.js
function convertRSASSAPSSToEnc(keyRSAPSSEncSpki) {
  const RSAEncryptionAlgID = "1.2.840.113549.1.1.1";
  const schema = new Sequence({
    value: [
      new Sequence({ name: "algorithm" }),
      new BitString({ name: "subjectPublicKey" })
    ]
  });
  const cmp = verifySchema(keyRSAPSSEncSpki, schema);
  if (cmp.verified != true) {
    throw new Error("bad parsing");
  }
  const keyASN = new Sequence({
    value: [
      new Sequence({
        value: [
          new ObjectIdentifier({ value: RSAEncryptionAlgID }),
          new Null()
        ]
      }),
      cmp.result.subjectPublicKey
    ]
  });
  return new Uint8Array(keyASN.toBER());
}
function joinAll2(a) {
  let size = 0;
  for (const ai of a) {
    size += ai.byteLength;
  }
  const buffer = new ArrayBuffer(size);
  const view = new Uint8Array(buffer);
  let offset = 0;
  for (const ai of a) {
    view.set(new Uint8Array(ai), offset);
    offset += ai.byteLength;
  }
  return buffer;
}

// node_modules/@cloudflare/privacypass-ts/lib/src/rfc9110.js
function parseWWWAuthenticateInternal(header, includeNonCompliantToken) {
  const ALPHA = "A-Za-z";
  const DIGIT = "0-9";
  let tokenChar = `!#$%&'*+\\-\\.^_\`|~${DIGIT}${ALPHA}`;
  const nonRFCCompliantTokenCharFoundInTheWild = "=";
  if (includeNonCompliantToken) {
    tokenChar += nonRFCCompliantTokenCharFoundInTheWild;
  }
  const tchar = `[${tokenChar}]`;
  const OWS = "[ \\t]*";
  const BWS = OWS;
  const qdtext = "[ \\t\\x21\\x23-\\x5B\\x5D-\\x7E\\x80-\\xFF]";
  const quotedPair = "\\\\[ \\t\\x21-\\x7E\\x80-\\xFF]";
  const quotedString = `"(?:${qdtext}|${quotedPair})*"`;
  const token = tchar + "+";
  const authParam = `${token}${BWS}=${BWS}(?:${token}|${quotedString})`;
  const authScheme = token;
  const challenge = `${authScheme}(?: +(?:${authParam}(?:${OWS},${OWS}${authParam})*))?`;
  const challenges = `(?<skip>${OWS},${OWS})?(?<challenge>${challenge})`;
  const challengesRegex = new RegExp(`${challenges}`, "y");
  let first = true;
  let everythingConsumed = false;
  const matches = [];
  for (let m; m = challengesRegex.exec(header); ) {
    if (first) {
      if (m?.groups?.skip) {
        break;
      }
      first = false;
    }
    const data = m?.groups?.challenge;
    if (data) {
      matches.push(data);
    }
    everythingConsumed = header.length === challengesRegex.lastIndex;
  }
  if (!everythingConsumed) {
    return [];
  }
  return matches;
}
function parseWWWAuthenticate(header) {
  return parseWWWAuthenticateInternal(header, false);
}
function parseWWWAuthenticateWithNonCompliantTokens(header) {
  return parseWWWAuthenticateInternal(header, true);
}
function authParamToString(param, value, quotedString) {
  const quote = quotedString ? '"' : "";
  if (value === null) {
    return param;
  }
  return `${param}=${quote}${value}${quote}`;
}
function toStringWWWAuthenticate(authScheme, authParams, quotedString = false) {
  if (authParams === void 0) {
    return authScheme;
  }
  const params = Object.entries(authParams).map(([param, value]) => authParamToString(param, value, quotedString)).join(",");
  return `${authScheme} ${params}`;
}

// node_modules/@cloudflare/privacypass-ts/lib/src/issuance.js
var PRIVATE_TOKEN_ISSUER_DIRECTORY = "/.well-known/private-token-issuer-directory";
var MediaType;
(function(MediaType2) {
  MediaType2["PRIVATE_TOKEN_ISSUER_DIRECTORY"] = "application/private-token-issuer-directory";
  MediaType2["PRIVATE_TOKEN_REQUEST"] = "application/private-token-request";
  MediaType2["PRIVATE_TOKEN_RESPONSE"] = "application/private-token-response";
})(MediaType || (MediaType = {}));
async function getIssuerUrl(issuerName) {
  const baseURL = `https://${issuerName}`;
  const configURI = `${baseURL}${PRIVATE_TOKEN_ISSUER_DIRECTORY}`;
  const res = await fetch(configURI);
  if (res.status !== 200) {
    throw new Error(`issuerConfig: no configuration was found at ${configURI}`);
  }
  const response = await res.json();
  const uri = response["issuer-request-uri"];
  try {
    new URL(uri);
    return uri;
  } catch (_) {
    return `${baseURL}${uri}`;
  }
}

// node_modules/@cloudflare/privacypass-ts/lib/src/httpAuthScheme.js
var AUTH_SCHEME = "PrivateToken";
var TokenChallenge = class _TokenChallenge {
  tokenType;
  issuerName;
  redemptionContext;
  originInfo;
  // This class represents the following structure:
  //
  // struct {
  //     uint16_t token_type;
  //     opaque issuer_name<1..2^16-1>;
  //     opaque redemption_context<0..32>;
  //     opaque origin_info<0..2^16-1>;
  // } TokenChallenge;
  constructor(tokenType, issuerName, redemptionContext, originInfo) {
    this.tokenType = tokenType;
    this.issuerName = issuerName;
    this.redemptionContext = redemptionContext;
    this.originInfo = originInfo;
    const MAX_UINT16 = (1 << 16) - 1;
    if (issuerName.length > MAX_UINT16) {
      throw new Error("invalid issuer name size");
    }
    if (originInfo) {
      const allOriginInfo = originInfo.join(",");
      if (allOriginInfo.length > MAX_UINT16) {
        throw new Error("invalid origin info size");
      }
    }
    if (!(redemptionContext.length == 0 || redemptionContext.length == 32)) {
      throw new Error("invalid redemptionContext size");
    }
  }
  static deserialize(bytes) {
    let offset = 0;
    const input = new DataView(bytes.buffer);
    const type = input.getUint16(offset);
    offset += 2;
    let len = input.getUint16(offset);
    offset += 2;
    const issuerNameBytes = input.buffer.slice(offset, offset + len);
    offset += len;
    const td = new TextDecoder();
    const issuerName = td.decode(issuerNameBytes);
    len = input.getUint8(offset);
    offset += 1;
    const redemptionContext = new Uint8Array(input.buffer.slice(offset, offset + len));
    offset += len;
    len = input.getUint16(offset);
    offset += 2;
    let originInfo = void 0;
    if (len > 0) {
      const allOriginInfoBytes = input.buffer.slice(offset, offset + len);
      const allOriginInfo = td.decode(allOriginInfoBytes);
      originInfo = allOriginInfo.split(",");
    }
    return new _TokenChallenge(type, issuerName, redemptionContext, originInfo);
  }
  serialize() {
    const output = new Array();
    let b = new ArrayBuffer(2);
    new DataView(b).setUint16(0, this.tokenType);
    output.push(b);
    const te = new TextEncoder();
    const issuerNameBytes = te.encode(this.issuerName);
    b = new ArrayBuffer(2);
    new DataView(b).setUint16(0, issuerNameBytes.length);
    output.push(b);
    b = issuerNameBytes.buffer;
    output.push(b);
    b = new ArrayBuffer(1);
    new DataView(b).setUint8(0, this.redemptionContext.length);
    output.push(b);
    b = this.redemptionContext.buffer;
    output.push(b);
    b = new ArrayBuffer(2);
    let allOriginInfoBytes = new Uint8Array(0);
    if (this.originInfo) {
      const allOriginInfo = this.originInfo.join(",");
      allOriginInfoBytes = te.encode(allOriginInfo);
    }
    new DataView(b).setUint16(0, allOriginInfoBytes.length);
    output.push(b);
    b = allOriginInfoBytes.buffer;
    output.push(b);
    return new Uint8Array(joinAll2(output));
  }
};
var PrivateToken = class _PrivateToken {
  challenge;
  tokenKey;
  maxAge;
  challengeSerialized;
  // contains a serialized version of the TokenChallenge value.
  constructor(challenge, tokenKey, maxAge) {
    this.challenge = challenge;
    this.tokenKey = tokenKey;
    this.maxAge = maxAge;
    this.challengeSerialized = challenge.serialize();
  }
  static parseSingle(data) {
    const attributes = data.split(",");
    let challenge = void 0;
    let challengeSerialized = void 0;
    let tokenKey = void 0;
    let maxAge = void 0;
    for (const attr of attributes) {
      const idx = attr.indexOf("=");
      let attrKey = attr.substring(0, idx);
      let attrValue = attr.substring(idx + 1);
      attrValue = attrValue.replaceAll('"', "");
      attrKey = attrKey.trim();
      attrValue = attrValue.trim();
      switch (attrKey) {
        case "challenge":
          challengeSerialized = base64url.parse(attrValue);
          challenge = TokenChallenge.deserialize(challengeSerialized);
          break;
        case "token-key":
          tokenKey = base64url.parse(attrValue);
          break;
        case "max-age":
          maxAge = parseInt(attrValue);
          break;
      }
    }
    if (challenge === void 0 || challengeSerialized === void 0 || tokenKey === void 0) {
      throw new Error("cannot parse PrivateToken");
    }
    const pt = new _PrivateToken(challenge, tokenKey, maxAge);
    pt.challengeSerialized = challengeSerialized;
    return pt;
  }
  static parseInternal(header, parseWWWAuthenticate2) {
    const challenges = parseWWWAuthenticate2(header);
    const listTokens = new Array();
    for (const challenge of challenges) {
      if (!challenge.startsWith(`${AUTH_SCHEME} `)) {
        continue;
      }
      const chl = challenge.slice(`${AUTH_SCHEME} `.length);
      const privToken = _PrivateToken.parseSingle(chl);
      listTokens.push(privToken);
    }
    return listTokens;
  }
  static parse(header) {
    const tokens = this.parseInternal(header, parseWWWAuthenticate);
    if (tokens.length !== 0) {
      return tokens;
    }
    return this.parseInternal(header, parseWWWAuthenticateWithNonCompliantTokens);
  }
  static async create(tokenType, issuer, redemptionContext = new Uint8Array(0), originInfo, maxAge) {
    const tokenChallenge = new TokenChallenge(tokenType.value, issuer.name, redemptionContext, originInfo);
    const publicKeySpki = new Uint8Array(await crypto.subtle.exportKey("spki", issuer.publicKey));
    return new _PrivateToken(tokenChallenge, publicKeySpki, maxAge);
  }
  toString(quotedString = false) {
    const authParams = {
      challenge: base64url.stringify(this.challenge.serialize()),
      "token-key": base64url.stringify(this.tokenKey)
    };
    if (this.maxAge) {
      authParams["max-age"] = this.maxAge;
    }
    return toStringWWWAuthenticate(AUTH_SCHEME, authParams, quotedString);
  }
};
var TokenPayload = class _TokenPayload {
  nonce;
  challengeDigest;
  tokenKeyId;
  static NONCE_LENGTH = 32;
  static CHALLENGE_LENGTH = 32;
  tokenType;
  constructor(tokenTypeEntry, nonce, challengeDigest, tokenKeyId) {
    this.nonce = nonce;
    this.challengeDigest = challengeDigest;
    this.tokenKeyId = tokenKeyId;
    if (nonce.length !== _TokenPayload.NONCE_LENGTH) {
      throw new Error("invalid nonce size");
    }
    if (challengeDigest.length !== _TokenPayload.CHALLENGE_LENGTH) {
      throw new Error("invalid challenge size");
    }
    if (tokenKeyId.length !== tokenTypeEntry.Nid) {
      throw new Error("invalid tokenKeyId size");
    }
    this.tokenType = tokenTypeEntry.value;
  }
  static deserialize(tokenTypeEntry, bytes, ops) {
    let offset = 0;
    const input = new DataView(bytes.buffer);
    const type = input.getUint16(offset);
    offset += 2;
    if (type !== tokenTypeEntry.value) {
      throw new Error("mismatch of token type");
    }
    let len = _TokenPayload.NONCE_LENGTH;
    const nonce = new Uint8Array(input.buffer.slice(offset, offset + len));
    offset += len;
    len = _TokenPayload.CHALLENGE_LENGTH;
    const challengeDigest = new Uint8Array(input.buffer.slice(offset, offset + len));
    offset += len;
    len = tokenTypeEntry.Nid;
    const tokenKeyId = new Uint8Array(input.buffer.slice(offset, offset + len));
    offset += len;
    ops.bytesRead = offset;
    return new _TokenPayload(tokenTypeEntry, nonce, challengeDigest, tokenKeyId);
  }
  serialize() {
    const output = new Array();
    let b = new ArrayBuffer(2);
    new DataView(b).setUint16(0, this.tokenType);
    output.push(b);
    b = this.nonce.buffer;
    output.push(b);
    b = this.challengeDigest.buffer;
    output.push(b);
    b = this.tokenKeyId.buffer;
    output.push(b);
    return new Uint8Array(joinAll2(output));
  }
};
var Token = class _Token {
  payload;
  authenticator;
  // This class represents the Token structure (composed by a TokenPayload and an authenticator).
  //
  // struct {
  //     uint16_t token_type;
  //     uint8_t nonce[32];
  //     uint8_t challenge_digest[32];
  //     uint8_t token_key_id[Nid];
  //     uint8_t authenticator[Nk];
  // } Token;
  constructor(tokenTypeEntry, payload, authenticator) {
    this.payload = payload;
    this.authenticator = authenticator;
    if (authenticator.length !== tokenTypeEntry.Nk) {
      throw new Error("invalid authenticator size");
    }
  }
  static deserialize(tokenTypeEntry, bytes) {
    let offset = 0;
    const input = new DataView(bytes.buffer);
    const ops = { bytesRead: 0 };
    const payload = TokenPayload.deserialize(tokenTypeEntry, bytes, ops);
    offset += ops.bytesRead;
    const len = tokenTypeEntry.Nk;
    const authenticator = new Uint8Array(input.buffer.slice(offset, offset + len));
    offset += len;
    return new _Token(tokenTypeEntry, payload, authenticator);
  }
  static async fetch(pt) {
    const issuerUrl = await getIssuerUrl(pt.challenge.issuerName);
    const client = new Client();
    const tokReq = await client.createTokenRequest(pt);
    const tokRes = await tokReq.send(issuerUrl, TokenResponse);
    const token = await client.finalize(tokRes);
    return token;
  }
  static parseSingle(tokenTypeEntry, data) {
    const attributes = data.split(",");
    let ppToken = void 0;
    for (const attr of attributes) {
      const idx = attr.indexOf("=");
      let attrKey = attr.substring(0, idx);
      let attrValue = attr.substring(idx + 1);
      attrValue = attrValue.replaceAll('"', "");
      attrKey = attrKey.trim();
      attrValue = attrValue.trim();
      if (attrKey === "token") {
        const tokenEnc = base64url.parse(attrValue);
        ppToken = _Token.deserialize(tokenTypeEntry, tokenEnc);
      }
    }
    if (ppToken === void 0) {
      throw new Error("cannot parse token");
    }
    return ppToken;
  }
  static parseInternal(tokenTypeEntry, header, parseWWWAuthenticate2) {
    const challenges = parseWWWAuthenticate2(header);
    const listTokens = new Array();
    for (const challenge of challenges) {
      if (!challenge.startsWith(`${AUTH_SCHEME} `)) {
        continue;
      }
      const chl = challenge.slice(`${AUTH_SCHEME} `.length);
      const privToken = _Token.parseSingle(tokenTypeEntry, chl);
      listTokens.push(privToken);
    }
    return listTokens;
  }
  static parse(tokenTypeEntry, header) {
    const tokens = this.parseInternal(tokenTypeEntry, header, parseWWWAuthenticate);
    if (tokens.length !== 0) {
      return tokens;
    }
    return this.parseInternal(tokenTypeEntry, header, parseWWWAuthenticateWithNonCompliantTokens);
  }
  toString(quotedString = false) {
    const token = base64url.stringify(this.serialize());
    return toStringWWWAuthenticate(AUTH_SCHEME, { token }, quotedString);
  }
  serialize() {
    return new Uint8Array(joinAll2([this.payload.serialize().buffer, this.authenticator.buffer]));
  }
  verify(publicKey) {
    return crypto.subtle.verify({ name: "RSA-PSS", saltLength: 48 }, publicKey, this.authenticator, this.payload.serialize());
  }
};

// node_modules/@cloudflare/privacypass-ts/lib/src/pubVerifToken.js
var BLIND_RSA = {
  value: 2,
  name: "Blind RSA (2048)",
  Nk: 256,
  Nid: 32,
  publicVerifiable: true,
  publicMetadata: false,
  privateMetadata: false
};
var TOKEN_TYPES = {
  BLIND_RSA
};
var TokenRequest = class _TokenRequest {
  tokenKeyId;
  blindedMsg;
  tokenType;
  constructor(tokenKeyId, blindedMsg) {
    this.tokenKeyId = tokenKeyId;
    this.blindedMsg = blindedMsg;
    if (blindedMsg.length !== BLIND_RSA.Nk) {
      throw new Error("invalid blinded message size");
    }
    this.tokenType = BLIND_RSA.value;
  }
  static deserialize(bytes) {
    let offset = 0;
    const input = new DataView(bytes.buffer);
    const type = input.getUint16(offset);
    offset += 2;
    if (type !== BLIND_RSA.value) {
      throw new Error("mismatch of token type");
    }
    const tokenKeyId = input.getUint8(offset);
    offset += 1;
    const len = BLIND_RSA.Nk;
    const blindedMsg = new Uint8Array(input.buffer.slice(offset, offset + len));
    offset += len;
    return new _TokenRequest(tokenKeyId, blindedMsg);
  }
  serialize() {
    const output = new Array();
    let b = new ArrayBuffer(2);
    new DataView(b).setUint16(0, this.tokenType);
    output.push(b);
    b = new ArrayBuffer(1);
    new DataView(b).setUint8(0, this.tokenKeyId);
    output.push(b);
    b = this.blindedMsg.buffer;
    output.push(b);
    return new Uint8Array(joinAll2(output));
  }
  // Send TokenRequest to Issuer (fetch w/POST).
  async send(issuerUrl, tokRes, headers) {
    headers ??= new Headers();
    headers.append("Content-Type", MediaType.PRIVATE_TOKEN_REQUEST);
    headers.append("Accept", MediaType.PRIVATE_TOKEN_RESPONSE);
    const issuerResponse = await fetch(issuerUrl, {
      method: "POST",
      headers,
      body: this.serialize().buffer
    });
    if (issuerResponse.status !== 200) {
      const body = await issuerResponse.text();
      throw new Error(`tokenRequest failed with code:${issuerResponse.status} response:${body}`);
    }
    const contentType = issuerResponse.headers.get("Content-Type");
    if (!contentType || contentType.toLowerCase() !== MediaType.PRIVATE_TOKEN_RESPONSE) {
      throw new Error(`tokenRequest: missing ${MediaType.PRIVATE_TOKEN_RESPONSE} header`);
    }
    const resp = new Uint8Array(await issuerResponse.arrayBuffer());
    return new tokRes(resp);
  }
};
var TokenResponse = class _TokenResponse {
  blindSig;
  constructor(blindSig) {
    this.blindSig = blindSig;
    if (blindSig.length !== BLIND_RSA.Nk) {
      throw new Error("invalid blind signature size");
    }
  }
  static deserialize(bytes) {
    return new _TokenResponse(bytes.slice(0, BLIND_RSA.Nk));
  }
  serialize() {
    return new Uint8Array(this.blindSig);
  }
};
var Client = class _Client {
  static TYPE = BLIND_RSA;
  finData;
  async createTokenRequest(privToken) {
    const nonce = crypto.getRandomValues(new Uint8Array(32));
    const context = new Uint8Array(await crypto.subtle.digest("SHA-256", privToken.challengeSerialized));
    const keyId = new Uint8Array(await crypto.subtle.digest("SHA-256", privToken.tokenKey));
    const tokenPayload = new TokenPayload(_Client.TYPE, nonce, context, keyId);
    const tokenInput = tokenPayload.serialize();
    const blindRSA = SUITES.SHA384.PSS.Deterministic();
    const spkiEncoded = convertRSASSAPSSToEnc(privToken.tokenKey);
    const publicKeyIssuer = await crypto.subtle.importKey("spki", spkiEncoded, { name: "RSA-PSS", hash: "SHA-384" }, true, ["verify"]);
    const { blindedMsg, inv } = await blindRSA.blind(publicKeyIssuer, tokenInput);
    const tokenKeyId = keyId[keyId.length - 1];
    const tokenRequest = new TokenRequest(tokenKeyId, blindedMsg);
    this.finData = { tokenInput, tokenPayload, inv, tokenRequest, publicKeyIssuer };
    return tokenRequest;
  }
  async finalize(t) {
    if (!this.finData) {
      throw new Error("no token request was created yet.");
    }
    const blindRSA = SUITES.SHA384.PSS.Deterministic();
    const authenticator = await blindRSA.finalize(this.finData.publicKeyIssuer, this.finData.tokenInput, t.blindSig, this.finData.inv);
    const token = new Token(_Client.TYPE, this.finData.tokenPayload, authenticator);
    this.finData = void 0;
    return token;
  }
};

// src/background/pubVerifToken.ts
async function fetchPublicVerifToken(privateToken, originTabId, storage) {
  let attesterIssuerProxyURI;
  const attesterToken = await new Promise((resolve) => {
    storage.onChanged.addListener(async (changes) => {
      for (const [, value] of Object.entries(changes)) {
        if (!value.newValue) {
          continue;
        }
        const newValue = value.newValue;
        if (newValue[originTabId] && newValue[originTabId].hasOwnProperty("attestationData") && // eslint-disable-line no-prototype-builtins
        newValue[originTabId].attestationData != "") {
          const tab = await new Promise(
            (resolve2) => chrome.tabs.get(newValue[originTabId].attesterTabId, resolve2)
          );
          if (!tab) {
            continue;
          }
          attesterIssuerProxyURI = tab.url;
          chrome.tabs.remove(newValue[originTabId].attesterTabId);
          resolve(newValue[originTabId].attestationData);
        }
      }
    });
  });
  chrome.tabs.update(originTabId, { active: true });
  const client = new Client();
  const tokenRequest = await client.createTokenRequest(privateToken);
  const tokenResponse = await tokenRequest.send(
    attesterIssuerProxyURI,
    TokenResponse,
    new Headers({ "private-token-attester-data": attesterToken })
  );
  const token = await client.finalize(tokenResponse);
  return token;
}

// src/background/rules.ts
var PRIVACY_PASS_EXTENSION_RULE_OFFSET = 11943591;
function getRuleID(x) {
  return PRIVACY_PASS_EXTENSION_RULE_OFFSET + x;
}
var RULE_IDS = {
  IDENTIFICATION: getRuleID(1),
  AUTHORIZATION: getRuleID(2),
  REPLAY: getRuleID(3),
  REDIRECT: getRuleID(4)
};
var EXTENSION_SUPPORTED_RESOURCE_TYPES = chrome.declarativeNetRequest ? [
  chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
  chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
  chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST
] : [];
function getIdentificationRule(url) {
  return {
    removeRuleIds: [RULE_IDS.IDENTIFICATION],
    addRules: [
      {
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          responseHeaders: [
            // Use Server-Timimg header because Set-Cookie is unreliable in this context in Chrome
            {
              header: "Server-Timing",
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: "PrivacyPassExtensionV; desc=4"
            }
          ]
        },
        condition: {
          urlFilter: new URL(url).toString(),
          resourceTypes: [chrome.declarativeNetRequest.ResourceType.MAIN_FRAME]
        },
        id: RULE_IDS.IDENTIFICATION,
        priority: 1
      }
    ]
  };
}
function getAuthorizationRule(url, authorizationHeader) {
  return {
    removeRuleIds: [RULE_IDS.AUTHORIZATION],
    addRules: [
      {
        id: RULE_IDS.AUTHORIZATION,
        priority: 1,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          requestHeaders: [
            {
              header: "Authorization",
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: authorizationHeader
            }
          ]
        },
        condition: {
          // Note: The urlFilter must be composed of only ASCII characters.
          urlFilter: new URL(url).toString(),
          resourceTypes: EXTENSION_SUPPORTED_RESOURCE_TYPES
        }
      }
    ]
  };
}
function removeAuthorizationRule() {
  return {
    removeRuleIds: [RULE_IDS.AUTHORIZATION]
  };
}
function getReplayRule(replayHeader) {
  return {
    removeRuleIds: [RULE_IDS.REPLAY],
    addRules: [
      {
        id: RULE_IDS.REPLAY,
        priority: 10,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
          responseHeaders: [
            {
              header: PRIVACY_PASS_API_REPLAY_HEADER,
              operation: chrome.declarativeNetRequest.HeaderOperation.SET,
              value: replayHeader
            }
          ]
        },
        condition: {
          // Chrome declarativeNetRequest have to be defined before the request is made. Given a PP request can be made from any URL, returning a responseID for all URLs is required.
          urlFilter: "*",
          resourceTypes: EXTENSION_SUPPORTED_RESOURCE_TYPES
        }
      }
    ]
  };
}
function getRedirectRule(urlFilter, redirectURL) {
  return {
    removeRuleIds: [RULE_IDS.REDIRECT],
    addRules: [
      {
        id: RULE_IDS.REDIRECT,
        priority: 5,
        action: {
          type: chrome.declarativeNetRequest.RuleActionType.REDIRECT,
          redirect: { url: redirectURL }
        },
        condition: {
          urlFilter,
          resourceTypes: EXTENSION_SUPPORTED_RESOURCE_TYPES
        }
      }
    ]
  };
}

// src/background/util.ts
function u8ToB64(u) {
  return btoa(String.fromCharCode(...u));
}
function b64ToB64URL(s) {
  return s.replace(/\+/g, "-").replace(/\//g, "_");
}
function uint8ToB64URL(u) {
  return b64ToB64URL(u8ToB64(u));
}
function promiseToQueryable(p) {
  let _isFullfilled = false;
  let _isRejected = false;
  let _isResolved = false;
  const ret = {
    get isPending() {
      return !_isFullfilled;
    },
    get isFullfilled() {
      return _isFullfilled;
    },
    get isRejected() {
      return _isRejected;
    },
    get isResolved() {
      return _isResolved;
    },
    then: p.then,
    catch: p.catch,
    finally: p.finally,
    [Symbol.toStringTag]: p[Symbol.toStringTag]
  };
  p.then((_result) => {
    _isFullfilled = true;
    _isResolved = true;
  }).catch((_error) => {
    _isFullfilled = true;
    _isRejected = true;
  });
  return ret;
}
function isManifestV3(browser) {
  return !!browser.declarativeNetRequest;
}

// src/background/replay.ts
var REPLAY_STATE = {
  FULFILLED: "fulfilled",
  NOT_FOUND: "not-found",
  PENDING: "pending"
};
var getRequestID = (() => {
  let requestID = crypto.randomUUID();
  return () => {
    const oldRequestID = requestID;
    requestID = crypto.randomUUID();
    if (isManifestV3(chrome)) {
      chrome.declarativeNetRequest.updateSessionRules(getReplayRule(requestID));
    }
    return oldRequestID;
  };
})();
var setReplayDomainRule = (state, requestID) => {
  if (!chrome.declarativeNetRequest) {
    return;
  }
  const filterSuffix = requestID ? `/requestID/${requestID}` : "/*";
  const urlFilter = `${PRIVACY_PASS_API_REPLAY_URI}${filterSuffix}`;
  chrome.declarativeNetRequest.updateSessionRules(
    getRedirectRule(urlFilter, `data:text/plain,${state}`)
  );
};

// src/background/index.ts
var PENDING = REPLAY_STATE.PENDING;
var TOKENS = {};
var cachedTabs = {};
var headerToToken = async (url, tabId, header, storage) => {
  const { serviceWorkerMode: mode } = getSettings();
  const logger = getLogger(mode);
  const tokenDetails = PrivateToken.parse(header);
  if (tokenDetails.length === 0) {
    return void 0;
  }
  const td = tokenDetails.slice(-1)[0];
  switch (td.challenge.tokenType) {
    case TOKEN_TYPES.BLIND_RSA.value:
      logger.debug(`type of challenge: ${td.challenge.tokenType} is supported`);
      if (mode === SERVICE_WORKER_MODE.DEMO) {
        await new Promise((resolve) => setTimeout(resolve, 5 * 1e3));
      }
      const tokenPublicKey = uint8ToB64URL(td.tokenKey);
      let attesterURI = await keyToAttesterURI(storage, tokenPublicKey);
      if (!attesterURI) {
        return void 0;
      }
      attesterURI = `${attesterURI}/challenge`;
      const tabInfo = await new Promise((resolve) => {
        chrome.tabs.get(tabId, resolve);
      });
      const tabWindow = await new Promise((resolve) => {
        if (tabInfo) {
          chrome.windows.get(tabInfo.windowId, resolve);
        }
      });
      if (!tabWindow?.focused || !tabInfo?.active) {
        logger.debug("Not opening a new tab due to requesting tab not being active");
        return void 0;
      }
      const tab = await new Promise(
        (resolve) => chrome.tabs.create({ url: attesterURI }, resolve)
      );
      const existing = await new Promise(
        (resolve) => storage.get(url, resolve)
      );
      if (existing[url][tabId]) {
        existing[url][tabId]["attesterTabId"] = tab.id;
        storage.set({ [url]: existing[url] });
      }
      const token = await fetchPublicVerifToken(td, tabId, storage);
      const encodedToken = uint8ToB64URL(token.serialize());
      return encodedToken;
    default:
      logger.error(`unrecognized type of challenge: ${td.challenge.tokenType}`);
  }
  return void 0;
};
var handleInstall = (storage) => async (_details) => {
  const { serviceWorkerMode: mode } = await getRawSettings(storage);
  const logger = getLogger(mode);
  if (isManifestV3(chrome)) {
    chrome.declarativeNetRequest.updateSessionRules(removeAuthorizationRule()).catch((e) => logger.debug(`failed to remove session rules:`, e));
  }
  handleStartup(storage);
  getRequestID();
  setReplayDomainRule(REPLAY_STATE.NOT_FOUND);
};
var handleStartup = (storage) => async () => {
  const { serviceWorkerMode: mode } = await getRawSettings(storage);
  const logger = getLogger(mode);
  const alarmName = "refreshAttesterLookupByIssuerKey";
  chrome.alarms.clear(alarmName);
  chrome.alarms.create(alarmName, {
    delayInMinutes: 0,
    periodInMinutes: 24 * 60
    // trigger once a day
  });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === alarmName) {
      logger.debug("refreshing attester lookup by issuer key");
      refreshAttesterLookupByIssuerKey(storage);
    }
  });
};
var pendingRequests = /* @__PURE__ */ new Map();
var handleBeforeRequest = () => (details) => {
  const settings2 = getSettings();
  const { serviceWorkerMode: mode } = settings2;
  const logger = getLogger(mode);
  try {
    chrome.tabs.get(details.tabId, (tab) => cachedTabs[details.tabId] = tab);
  } catch (err) {
    logger.debug(err);
  }
  const url = new URL(details.url);
  if (url.origin !== PRIVACY_PASS_API_REPLAY_URI) {
    return;
  }
  const labels = url.pathname.split("/");
  if (labels.length !== 2 || labels[0] !== "" || labels[1] !== "requestID") {
    return { redirectUrl: `data:text/plain,${REPLAY_STATE.NOT_FOUND}` };
  }
  const requestID = labels[2];
  const promise = pendingRequests.get(requestID);
  let state = REPLAY_STATE.NOT_FOUND;
  if (promise?.isFullfilled) {
    state = REPLAY_STATE.FULFILLED;
    pendingRequests.delete(requestID);
  }
  if (promise?.isPending) {
    state = REPLAY_STATE.PENDING;
  }
  return {
    redirectUrl: `data:text/plain,${state}`
  };
};
var handleBeforeSendHeaders = (storage) => (details) => {
  if (!details) {
    return;
  }
  const ppToken = TOKENS[details.url];
  if (ppToken === PENDING) {
    return;
  }
  if (ppToken && !chrome.declarativeNetRequest) {
    const headers = details.requestHeaders ?? [];
    headers.push({ name: "Authorization", value: `PrivateToken token=${ppToken}` });
    delete TOKENS[details.url];
    return { requestHeaders: headers };
  }
  if (!details.requestHeaders) {
    return;
  }
  if (details.requestHeaders && details.url) {
    const pp_hdr = details.requestHeaders.find(
      (x) => x.name.toLowerCase() === "private-token-attester-data"
    )?.value;
    if (pp_hdr) {
      const callback = (url_tab_data) => {
        lookForAttesterTabId:
          for (const url in url_tab_data) {
            for (const originTab of Object.values(url_tab_data[url])) {
              const tabDetails = originTab;
              if (tabDetails.attesterTabId && tabDetails.attesterTabId === details.tabId) {
                originTab.attestationData = pp_hdr;
                storage.set(url_tab_data);
                break lookForAttesterTabId;
              }
            }
          }
      };
      storage.get(null, callback);
    }
  }
  if (isManifestV3(chrome)) {
    const { serviceWorkerMode: mode } = getSettings();
    const logger = getLogger(mode);
    chrome.declarativeNetRequest.updateSessionRules(removeAuthorizationRule()).catch((e) => logger.debug(`failed to remove session rules:`, e));
  }
  return;
};
var handleHeadersReceived = (browser, storage) => (details) => {
  if (!details.responseHeaders) {
    return;
  }
  const privateTokenChl = details.responseHeaders.find(
    (x) => x.name.toLowerCase() == "www-authenticate"
  )?.value;
  if (!privateTokenChl) {
    return;
  }
  if (PrivateToken.parse(privateTokenChl).length === 0) {
    return;
  }
  const settings2 = getSettings();
  if (Object.keys(settings2).length === 0) {
    getRawSettings(storage);
    return;
  }
  const { attesters, serviceWorkerMode: mode } = settings2;
  const logger = getLogger(mode);
  let initiator = void 0;
  if (details.frameId === 0) {
    initiator = details.url;
  } else {
    initiator = details.frameAncestors?.at(0)?.url ?? cachedTabs[details.tabId]?.url ?? details.initiator;
  }
  if (!initiator) {
    return;
  }
  const initiatorURL = new URL(initiator)?.origin;
  const isAttesterFrame = attesters.map((a) => new URL(a).origin).includes(initiatorURL);
  if (isAttesterFrame) {
    logger.info("PrivateToken support disabled on attester websites.");
    return;
  }
  if (TOKENS[details.url] === PENDING) {
    return;
  }
  if (isManifestV3(chrome)) {
    chrome.declarativeNetRequest.updateSessionRules(getIdentificationRule(details.url));
  }
  storage.get(details.url, (existing) => {
    existing[details.tabId] = { attesterTabId: -1, attestationData: "" };
    storage.set({ [details.url]: existing });
  });
  const w3HeaderValue = headerToToken(details.url, details.tabId, privateTokenChl, storage);
  if (!chrome.declarativeNetRequest) {
    TOKENS[details.url] = PENDING;
  }
  const redirectPromise = w3HeaderValue.then(async (value) => {
    if (!value) {
      delete TOKENS[details.url];
      return;
    }
    if (isManifestV3(chrome)) {
      await chrome.declarativeNetRequest.updateSessionRules(
        getAuthorizationRule(details.url, `PrivateToken token=${value}`)
      );
    } else {
      TOKENS[details.url] = value;
    }
    return { redirectUrl: details.url };
  }).catch((err) => {
    logger.error(`failed to retrieve PrivateToken token: ${err}`);
  });
  switch (browser) {
    case BROWSERS.FIREFOX:
      return redirectPromise;
    case BROWSERS.CHROME:
      const requestID = getRequestID();
      setReplayDomainRule("pending", requestID);
      pendingRequests.set(
        requestID,
        promiseToQueryable(
          redirectPromise.then(() => {
            setReplayDomainRule(REPLAY_STATE.FULFILLED, requestID);
          })
        )
      );
      redirectPromise.then(async () => {
        if (details.type === "main_frame") {
          chrome.tabs.update(details.tabId, { url: details.url });
        }
      });
      const responseHeaders = details.responseHeaders ?? [];
      responseHeaders.push({ name: PRIVACY_PASS_API_REPLAY_HEADER, value: requestID });
      return {
        responseHeaders
      };
  }
};

// platform/mv3/chromium/index.ts
var BROWSER = BROWSERS.CHROME;
var STORAGE = chrome.storage.local;
chrome.runtime.onInstalled.addListener(handleInstall(STORAGE));
chrome.runtime.onStartup.addListener(handleStartup(STORAGE));
chrome.webRequest.onBeforeRequest.addListener(handleBeforeRequest(), { urls: ["<all_urls>"] });
chrome.webRequest.onBeforeSendHeaders.addListener(
  handleBeforeSendHeaders(STORAGE),
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);
chrome.webRequest.onHeadersReceived.addListener(
  handleHeadersReceived(BROWSER, STORAGE),
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);
/*! Bundled license information:

pvtsutils/build/index.js:
  (*!
   * MIT License
   * 
   * Copyright (c) 2017-2022 Peculiar Ventures, LLC
   * 
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:
   * 
   * The above copyright notice and this permission notice shall be included in all
   * copies or substantial portions of the Software.
   * 
   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
   * SOFTWARE.
   * 
   *)

pvutils/build/utils.es.js:
  (*!
   Copyright (c) Peculiar Ventures, LLC
  *)

asn1js/build/index.es.js:
  (*!
   * Copyright (c) 2014, GMO GlobalSign
   * Copyright (c) 2015-2022, Peculiar Ventures
   * All rights reserved.
   * 
   * Author 2014-2019, Yury Strozhevsky
   * 
   * Redistribution and use in source and binary forms, with or without modification,
   * are permitted provided that the following conditions are met:
   * 
   * * Redistributions of source code must retain the above copyright notice, this
   *   list of conditions and the following disclaimer.
   * 
   * * Redistributions in binary form must reproduce the above copyright notice, this
   *   list of conditions and the following disclaimer in the documentation and/or
   *   other materials provided with the distribution.
   * 
   * * Neither the name of the copyright holder nor the names of its
   *   contributors may be used to endorse or promote products derived from
   *   this software without specific prior written permission.
   * 
   * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
   * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
   * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
   * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
   * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
   * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
   * 
   *)
*/
