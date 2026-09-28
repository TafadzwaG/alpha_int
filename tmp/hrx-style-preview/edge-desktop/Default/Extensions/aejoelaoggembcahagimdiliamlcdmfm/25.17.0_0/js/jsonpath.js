/* eslint-disable */
(function JSONPathAdapterBootstrap(global) {
  var isRhino =
    typeof Packages !== "undefined" || typeof global.importClass === "function";

  // Minimal safe JSONPath subset for Rhino (no eval, no filters, no scripts).
  function rhinoSimpleJsonPath(obj, expr) {
    if (!expr || obj == null) return obj;
    if (expr === "$") return obj;
    var cleaned = expr.replace(/^\$\.?/, "");
    if (!cleaned) return obj;
    var segments = cleaned.split(".");
    var cur = obj;
    for (var i = 0; i < segments.length; i++) {
      if (
        cur != null &&
        Object.prototype.hasOwnProperty.call(cur, segments[i])
      ) {
        cur = cur[segments[i]];
      } else {
        cur = undefined;
        break;
      }
    }
    return cur;
  }

  // Modern adapter using jsonpathPlus with transparent post-filter indexing support.
  function modernAdapter(obj, expr, arg) {
    var options = arg || {};
    if (!expr || obj == null) return undefined;

    var legacyResultType = (options.resultType || "VALUE").toUpperCase();
    var evalType = options.evalType;

    if (legacyResultType === "PATH" && evalType === "RESULT") {
      throw new Error(
        "RESULT based evaluation not supported with PATH based results",
      );
    }

    // Detect and handle post-filter array indexing patterns:
    // - $.values[?(@.id==1)][0]
    // - $.values[?(@.id==1)][0].price
    var modifiedExpr = expr;
    var postProcessIndex = null;
    var postProcessPath = null;

    // Pattern: filter followed by [index] with optional trailing path
    // Match: [?(...)][ digit] optionally followed by .property.chain or [index].chain
    var filterIndexPattern = /(\[\?\([^)]+\)\])\[(\d+)\]([\[.].*)?$/;
    var match = expr.match(filterIndexPattern);

    if (match) {
      var filterEnd = match.index + match[1].length;
      postProcessIndex = parseInt(match[2], 10);
      postProcessPath = match[3] || ""; // Capture remaining path like ".price" or ".price.value"
      modifiedExpr = expr.substring(0, filterEnd);
    }

    // Map legacy options to jsonpathPlus
    var jpOptions = {
      json: obj,
      path: modifiedExpr,
      resultType: legacyResultType === "PATH" ? "path" : "value",
      wrap: true,
    };

    // Map safeEval option
    if (typeof options.safeEval !== "undefined") {
      jpOptions.eval = options.safeEval ? "safe" : false;
    }

    var results = global.JSONPath.JSONPath(jpOptions);

    // Handle post-filter indexing transparently
    if (postProcessIndex !== null && Array.isArray(results)) {
      var indexed = results[postProcessIndex];

      // If there's a remaining path after the index, delegate to JSONPath Plus
      // so that complex paths like .shipments[0].products[0] are handled correctly
      if (indexed !== undefined && postProcessPath) {
        var subResults = global.JSONPath.JSONPath({
          json: indexed,
          path: "$" + postProcessPath,
          resultType: "value",
          wrap: true,
        });
        if (evalType === "RESULT") {
          return Array.isArray(subResults) && subResults.length === 1
            ? subResults[0]
            : Array.isArray(subResults) && subResults.length === 0
              ? undefined
              : subResults;
        }
        return Array.isArray(subResults) ? subResults : [subResults];
      }

      // If evalType RESULT, unwrap
      if (evalType === "RESULT") {
        return indexed;
      }

      // Otherwise wrap in array for consistency
      return indexed !== undefined ? [indexed] : [];
    }

    // Legacy evalType RESULT behavior: unwrap single value or return undefined for empty arrays
    if (evalType === "RESULT") {
      if (Array.isArray(results) && results.length === 1) {
        return results[0];
      }
      if (Array.isArray(results) && results.length === 0) {
        return undefined;
      }
      return results;
    }

    return Array.isArray(results) ? results : [results];
  }

  // Attach method-style wrapper for Rhino tests (simple property assignment for Rhino compatibility)
  if (!Object.prototype.jsonPath) {
    Object.prototype.jsonPath = function (selector) {
      return isRhino
        ? rhinoSimpleJsonPath(this, selector)
        : global.JSONPath && global.JSONPath.JSONPath
          ? modernAdapter(this, selector, {})
          : rhinoSimpleJsonPath(this, selector);
    };
  }

  if (isRhino) {
    // Rhino: use minimal safe implementation
    global.jsonPath = rhinoSimpleJsonPath;
  } else if (global.JSONPath && global.JSONPath.JSONPath) {
    // Browser/modern: use adapter with post-filter indexing support
    global.jsonPath = modernAdapter;
  } else {
    // Fallback to minimal (graceful degradation)
    global.jsonPath = rhinoSimpleJsonPath;
  }
})(this);
