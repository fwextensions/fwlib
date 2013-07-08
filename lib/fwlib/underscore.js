 /* ===========================================================================

    underscore.js

    Copyright 2013 John Dunning.  All rights reserved.
    fw@johndunning.com
    http://johndunning.com/fireworks

    Released under the MIT license.  See the LICENSE file for details.
    Documentation is available at https://github.com/fwextensions/fwlib

   ======================================================================== */


// ===========================================================================
/**
    The `fwlib/underscore` module wraps the legacy build of the `lodash` library
    and adds some Fireworks-specific methods.  The `lodash` code has been
    minified in a way that works within the Fireworks JS engine, but you can
    change the `define()` call in this file to load `"fwlib/lodash"` if you
    want to load the un-minified code to help with debugging.

    The Lo-Dash functions that rely on `setTimeout()` have been overridden to
    throw errors, since that function is not available within Fireworks.  The
    library has also been patched so that `_.has()` uses the `in` operator
    instead of `hasOwnProperty()` when checking for properties on native objects,
    which don't correctly support `hasOwnProperty()`.

    In addition to the standard Lo-Dash methods like `_.isFunction()`, there
    are equivalent methods for all native Fireworks types, like `_.isImage()`,
    which can be useful when filtering the selection.  Note that `_.isGroup()`
    will return false if the group is actually a smart shape, and `
    _.isSmartShape()` will return true in that case.

    The `_.createObject()` method has been enhanced to take a `properties`
    parameter that will add the properties from an object passed in as the
    second parameter.

    This module calls `_.noConflict()` to remove the global `_` reference
    that Lo-Dash creates by default.

    @module underscore
    @requires fwlib/lodash.min
*/
define([
    "fwlib/lodash.min"
], function(
    _)
{
    var fwTypes = {},
        fwMethods = {},
        typeRE = /^\[object (.+)\]$/,
        hasOwnProperty = Object.prototype.hasOwnProperty,
        originalCreateObject = _.createObject;

    _.forEach(
            // return the global properties that begin with the prefix
            // used by all FW-native types
        _.filter(_.keys(this), function(key) {
            return key.indexOf("_proto_for_fw_") == 0;
        }),
        function(key) {
            var typeString = this[key].toString(),
                typeName = typeString.match(typeRE)[1];

                // every FW-specific global prototype object has a
                // toString() method, the return value of which we add
                // to the hash of FW-native types
            fwTypes[typeString] = 1;

            fwMethods["is" + typeName] = function(obj)
            {
                return toString.call(obj) == typeString;
            }
        }
    );

        // override the methods that use setTimeout to throw an error
    _.forEach(["delay", "defer", "throtte", "debounce"], function(name) {
        fwMethods[name] = function() {
            throw name.quote() + " is not supported in Fireworks because setTimeout() is not available.";
        };
    });

        // replace the auto-generated isGroup method with one that returns
        // false if it's actually a smart shape
    fwMethods.isGroup = function(obj)
    {
        return toString.call(obj) == "[object Group]" && !obj.isSmartShape;
    };

        // there's no SmartShape native type, so add a method for it
    fwMethods.isSmartShape = function(obj)
    {
        return obj.isSmartShape === true;
    };

        // we have to override has() because instances of the native FW
        // types don't correctly support hasOwnProperty().
        // hasOwnProperty(dom, "isDirty") returns false but "isDirty" in dom
        // is true.  so if obj is a native type, fall back to using in.
    fwMethods.has = function(obj, key)
    {
        return (obj in fwTypes && key in obj) || hasOwnProperty.call(obj, key);
    };

        // wrap the lodash createObject to add a properties parameter
    fwMethods.createObject = function(prototype, properties)
    {
        var object = originalCreateObject(prototype);

        if (properties) {
            _.extend(object, properties);
        }

        return object;
    };

    _.mixin(fwMethods);

        // remove the global _ var that lodash creates by default
    return _.noConflict();
});
