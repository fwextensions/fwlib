/* ===========================================================================
    
    prefs.js

    Copyright 2012 John Dunning.  All rights reserved.
    fw@johndunning.com
    http://johndunning.com/fireworks

    Released under the MIT license.  See the LICENSE file for details.
    Documentation is available at https://github.com/fwextensions/fwlib

   ======================================================================== */


// ===========================================================================
/**
    The `fwlib/prefs` module includes utility functions for working with 
    Fireworks preferences files.  By storing your persistent data as JSON 
    strings, these utility functions make it easy to save and retrieve
    information for your commands across Fireworks sessions.

    @module prefs
    @requires dojo/json
*/
define([
    "dojo/json"
], function(
    JSON) 
{
    // =======================================================================
    /**
        Returns the value of a preference setting.  This function assumes that
        any existing data in the preference is a JSON string, and it will return
        the evaluated result of that JSON.  If the preference doesn't currently
        exist, or its value throws an error when evaluated, an empty object will 
        be returned.  

        The `inName` parameter should be a globally unique name for the preference.
        To avoid collisions, try using the name of your extension plus your 
        initials, or a reverse domain name like `com.example.MyExtension`.

        You can pass in an object as the optional second parameter to provide
        default properties for the preference data.  The defaults will not 
        override any existing properties on the saved preference data:

            var settings = prefs.get("MyPref", { foo: 42 });
            alert(settings.foo); // 42
            settings.foo = "bar";
            prefs.set("MyPref", settings);
            settings = prefs.get("MyPref", { foo: 42 });
            alert(settings.foo); // "bar"

        @param {String} inName The name of the preference.
        @param {Object} [inDefaults=null] An optional object containing default 
            properties that will be added to the stored preference data, if any.
        @returns {Object} The evaluated JS value of the preference.
        @memberof module:prefs
    */
    function get(
        inName,
        inDefaults)
    {
        inDefaults = inDefaults || {};
        
        var prefs = null;

        try {
                // the settings are stored as JSON in prefs.  if there aren't any
                // stored settings, it'll eval null, so create an empty object in
                // that case.  we'll add the properties to it below.  be sure to
                // wrap the JSON string in parens so that the eval doesn't 
                // complain about quoted key names.
            prefs = eval("(" + fw.getPref(inName) + ")") || {};
        } catch (exception) {
            prefs = inDefaults;
        }

            // add any properties that the stored settings object doesn't have
        for (var name in inDefaults) {
            if (!prefs.hasOwnProperty(name)) {
                prefs[name] = inDefaults[name];
            }
        }

        return prefs;
    }
    
    
    // =======================================================================
    /**
        Stores some data in the Fireworks preferences file as a JSON string.  The
        data passed in as `inPrefs` is automatically converted to JSON.

        @param {String} inName The name of the preference.
        @param {Object} inPrefs The value of the preference.
        @memberof module:prefs
    */
    function set(
        inName,
        inPrefs)
    {
        fw.setPref(inName, JSON.stringify(inPrefs));
    }
    
    
    // =======================================================================
    /**
        Constructor for a `PrefsStorage` object that can be saved to the Fireworks
        preferences file.  Any properties added to the object will be saved when
        you call its `save()` method.  To recover the stored data, instantiate
        a new object with the same name that was originally used to save the 
        preference:

            var settings = new prefs.PrefsStorage("MySettings", { foo: 42 });
            alert(settings.foo); // 42
            settings.foo = "bar";
            settings.baz = "hello, world";
            settings.save();
            var newSettings = new prefs.PrefsStorage("MySettings", { foo: 42 });
            alert(newSettings.foo); // "bar"
            alert(newSettings.baz); // "hello, world"

        Note that the properties `save` and `remove` are reserved and cannot be
        modified on a `PrefsStorage` instance.

        @param {String} inName The name of the preference.
        @param {Object} [inDefaults=null] An optional object containing default 
            properties that will be added to the stored preference data, if any.
        @returns {Object} A `PrefsStorage` instance with all of the properties 
            of the previously stored instance, if any. 
        @constructor
        @memberof module:prefs
    */
    function PrefsStorage(
        inName,
        inDefaults)
    {
        // ===================================================================
        /**
            Saves all of non-method properties of the `PrefsStorage` instance
            to the Fireworks preferences file as a JSON string.

            @memberof module:prefs.PrefsStorage#
        */
        function save()
        {
            set(_metadata.name, this);
        }
        
        
        // ===================================================================
        /**
            Sets the named preference to `null` in the Fireworks preferences 
            file, since there is no way to fully remove a value from that file.
        
            @memberof module:prefs.PrefsStorage#
        */
        function remove()
        {
                // only set the pref to null if an entry in the file already exists
            if (get(_metadata.name)) {
                set(_metadata.name, null);
            }
        }


        // ===================================================================
        function mixin(
            inDestination,
            inSource)
        {
            for (var name in inSource) {
                if (!(name in k.ReservedNames)) {
                        // we only want to set attributes on the destination if 
                        // they don't conflict with existing instance methods
                    inDestination[name] = inSource[name];
                }
            }
        }


        var k = {
                ReservedNames: {
                    save: true,
                    remove: true
                }
            },
            _metadata = {
                name: inName,
                version: arguments.callee.version
            };

            // define only getters for these methods, so that trying to assign
            // values to them will throw an error
        this.__defineGetter__("save", function() { return save; });
        this.__defineGetter__("remove", function() { return remove; });

        mixin(this, get(_metadata.name, inDefaults));
    }
    
        // this version is not currently saved with the pref data
    PrefsStorage.version = 1.0;


    return {
        set: set,
        get: get,
        PrefsStorage: PrefsStorage
    };
});
