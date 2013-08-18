/* ===========================================================================

    fonts.js

    Copyright 2013 John Dunning.  All rights reserved.
    fw@johndunning.com
    http://johndunning.com/fireworks

    Released under the MIT license.  See the LICENSE file for details.
    Documentation is available at https://github.com/fwextensions/fwlib

   ======================================================================== */


// ===========================================================================
/**
    The `fwlib/fonts` module provides detailed information about fonts currently
    installed on the OS by parsing the Adobe `.lst` font data files created by
    CS6 suite apps.  These files are stored in `Adobe/TypeSupport/CS6/` in the
    OS's user directory.

    @module fonts
    @requires fwlib/files
    @requires fwlib/underscore
*/
define([
    "./files",
    "./underscore"
], function(
    files,
    _)
{
    const FontInfoDir = fw.userJsCommandsDir + "/../../../../Local/Adobe/TypeSupport/CS6/",
        FontInfoFileName = "AdobeFnt_OSFonts.lst",
        FontInfoPath = files.path(FontInfoDir, FontInfoFileName),
        JSONVersion = 1,
        JSONFontInfoFileName = "Adobe Fireworks Font Info v" + JSONVersion + ".json",
        JSONPath = files.path(FontInfoDir, JSONFontInfoFileName),
        FileCheckInterval = 60000,
        AllowedProperties = {
            FullName: "name",
            FontName: "shortName",
            FamilyName: "family",
            StyleName: "style",
            WinName: "winName",
            MacName: "macName",
            MenuName: "menu",
            WeightClass: "weight",
            WidthClass: "width"
        },
        ColonRE = /\s*:\s*/;


    var fonts = [],
        cache = {},
        lastCheckTime = 0;

    // =======================================================================
    function initFontData()
    {
        if (new Date() - lastCheckTime > FileCheckInterval) {
            if (fonts.length) {
                    // if we're here, we've already loaded the JSON file or
                    // parsed the font file, so just check if the font file is
                    // newer than the JSON, which we only want to do once a
                    // minute
                if (files.getModifiedDate(FontInfoPath) > files.getModifiedDate(JSONPath)) {
                    parseFontsFile();
                }
            } else if (!Files.exists(JSONPath) ||
                    files.getModifiedDate(FontInfoPath) > files.getModifiedDate(JSONPath)) {
                    // the JSON doesn't exist or is out of date, so parse the file
                parseFontsFile();
            } else {
                    // this should happen only the first time getInfo() is called
                fonts = files.readJSON(JSONPath);
            }

                // remember that we've check the mod date or parsed the file
            lastCheckTime = +new Date();
        }
    }


    // =======================================================================
    function parseFontsFile()
    {
        function addProperty(
            inFont,
            inLine)
        {
            var parts = inLine.split(ColonRE);

            if (parts.length == 2) {
                var name = parts[0],
                    value = parts[1];

                if (name in AllowedProperties) {
                    inFont[AllowedProperties[name]] = value;
                }
            }
        }


        if (!Files.exists(FontInfoPath)) {
            alert("The Adobe font info file could not be found at:\n\n" +
                files.convertURLToOSPath(FontInfoPath));

            throw "FontDataFileIsMissing";
        }

        cache = {};

        var lines = files.read(FontInfoPath).split(/[\r\n]+/),
            font;

        for (var i = 0, len = lines.length; i < len; i++) {
            var line = lines[i];

            if (line == "%BeginFont") {
                font = {};
            } else if (line == "%EndFont") {
                fonts.push(font);
                font = null;
            } else if (font) {
                addProperty(font, line);
            }
        }

        _.sortBy(fonts, "FontName");
        files.writeJSON(JSONPath, fonts);
    }


    // =======================================================================
    /**
        Returns detailed information about a font, based on the font name
        returned by the Fireworks API.  The built-in `fw.getPlatformNameForPSFont()`
        method returns the full name of the font, but that often isn't the same
        name as would be used in a CSS style.  The `fonts.getInfo()` method, on
        the other hand, can return additional information, such as the numeric
        weight of a font.

        For instance, if the selected text element's font is Adobe Caslon Pro
        Semibold, then calling `fonts.getInfo(fw.selection[0].font)` would return:

            {
                family: "Adobe Caslon Pro",
                menu: "Adobe Caslon Pro",
                name: "Adobe Caslon Pro Semibold",
                shortName: "ACaslonPro-Semibold",
                style: "Semibold",
                weight: "600",
                width: "5",
                winName: "ACaslonPro-Semibold"
            }

        The result of `getInfo()` calls are cached, so subsequent calls for
        information about the same font should return faster.

        @param {String} inFontName The name of the font as expressed in the
            Fireworks API, e.g., `fw.selection[0].font` when a text element is
            selected.
        @returns {Object} Returns an object containing details about the
            specified font, or `null` if the font can't be found:
                <li> `shortName`: The name of the font in the Fireworks API.
                <li> `name`: The full name of the font, including style.
                <li> `family`: The family name of the font.
                <li> `style`: The font style.
                <li> `winName`: The Windows-specific name of the font.
                <li> `macName`: The Mac-specific name of the font.
                <li> `menu`: The name of the font as it appears in the menu.
                <li> `weight`: The font weight as a numeric string.
                <li> `width`: The width of the font as a numeric string.
        @memberof module:fonts
    */
    function getInfo(
        inFontName)
    {
            // this loads the font data only if we haven't already, or if it's
            // out of date
        initFontData();

        return cache[inFontName] ||
            (cache[inFontName] = _.find(fonts, { shortName: inFontName }));
    }


    return {
        getInfo: getInfo
    };
});
