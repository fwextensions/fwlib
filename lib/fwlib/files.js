/* ===========================================================================

    files.js

    Copyright 2013 John Dunning.  All rights reserved.
    fw@johndunning.com
    http://johndunning.com/fireworks

    Released under the MIT license.  See the LICENSE file for details.
    Documentation is available at https://github.com/fwextensions/fwlib

   ======================================================================== */


// ===========================================================================
/**
    The `fwlib/files` module includes utility functions for working with
    files.  Where the methods accept a path parameter, you can pass in either
    a path string or an array of strings that make up the path.  The array will
    be combined into a single string with a single / between each part of the
    path.  This means you don't have to worry about whether the substrings
    end or begin with a / when building up a path.  For example:

        files.readJSON([fw.appJsCommandsDir, "settings.json"]);

    This call works even though `fw.appJsCommandsDir` doesn't end in a /.

    @module files
    @requires dojo/json
*/
define([
    "dojo/json"
], function(
    JSON)
{
    // =======================================================================
    function getFixedFileDate(
        inFilePath,
        inDate)
    {
        inFilePath = files.path(inFilePath);

        if (Files.exists(inFilePath)) {
                // pass true so that the converted path isn't quoted
            var file = new File(files.convertURLToOSPath(inFilePath, true)),
                date = new Date(file[inDate].getTime());

            if (date.getMonth() == 0) {
                date.setFullYear(date.getFullYear() - 1);
            }

                // the File class has a bug that causes it to return a modfied or
                // created date that's a month in the future.  so we need to
                // subtract one from the month and possibly the year.
            date.setMonth((date.getMonth() - 1 + 12) % 12);

            return date;
        } else {
            return null;
        }
    }


        // always use writeUTF8 so that non-ASCII characters are output
        // in a way that they can still be rendered correctly by most apps,
        // though only if this version of FW has that method
    var writeMethod = "writeUTF8" in _proto_for_fw_CJs_FileRefClass ?
        "writeUTF8" : "write";

    var files = /** @lends module:files */ {
        // ===================================================================
        /**
            Returns the contents of a text file.  If the file does not exist,
            an empty string is returned.

            @param {String|Array} inFilePath The path to the file to read.
            @returns {String|Array} The text contents of the file.
        */
        read: function(
            inFilePath)
        {
            inFilePath = this.path(inFilePath);

            var result = "";

            if (Files.exists(inFilePath)) {
                var file = new File(this.convertURLToOSPath(inFilePath, true)),
                    len = file.length,
                        // setting the chars array to the number of bytes in the
                        // file before reading it seems to help a bit, especially
                        // with longer files
                    chars = new Array(len);

                file.open("read");

                for (var i = 0; i < len; i++) {
                    chars[i] = file.read(1);
                }

                result = chars.join("");
                file.close();
            }

            return result;
        },


        // ===================================================================
        /**
            Reads the contents of a text file one chunk at a time, passing each
            chunk to the `inCallback` parameter.  If the file does not exist,
            the callback will never be called.

            The file reading is done synchronously, but breaking the reads up
            into chunks may sometimes be more efficient for very long files.
            You can also return `false` from the callback to stop reading the
            file part way through.

            @param {String|Array} inFilePath The path to the file to read.
            @param {Number=8192} inChunkSize The number of bytes to read per
                chunk.
            @param {Function} inCallback A function that will be called after
                each chunk is read from the file.  The function is called with
                two parameters: a string containing the most recent chunk and
                a number indicating the position of the beginning of the current
                chunk within the file.  Return `false` from the callback to stop
                reading the file.  Note that the last chunk in the file may be
                less than `inChunkSize` bytes long.
        */
        readChunks: function(
            inFilePath,
            inChunkSize,
            inCallback)
        {
            inFilePath = this.path(inFilePath);

            if (Files.exists(inFilePath) && inCallback) {
                var chunkSize = inChunkSize || 8192,
                    file = new File(this.convertURLToOSPath(inFilePath, true)),
                    len = file.length,
                    chars = [];

                file.open("read");

                for (var chunkIndex = 0; chunkIndex < len; chunkIndex += chunkSize) {
                    chars = [];

                    for (var i = 0, chunkLen = Math.min(len - chunkIndex, chunkSize);
                            i < chunkLen; i++) {
                        chars[i] = file.read(1);
                    }

                    if (inCallback(chars.join(""), chunkIndex) === false) {
                        break;
                    }
                }

                file.close();
            }
        },


        // ===================================================================
        /**
            Writes a string to a text file.  It will overwrite a file that
            already exists at the path.  The text is always written out in
            UTF-8 format, rather than ISO-8859-1, so that accented characters
            are reproduced correctly.

            @param {String|Array} inFilePath The path to the file to write to.
                The full path to the new file must already exist, or the call
                will fail.
            @param {String} inText The string to write to the file.
            @param {Boolean} [inIncludeBOM=false] Pass true to create the file with
                a UTF-8 byte order mark at the beginning of the file.
        */
        write: function(
            inFilePath,
            inText,
            inIncludeBOM)
        {
            inFilePath = this.path(inFilePath);

                // delete any existing file at that path, since if we don't and we
                // write fewer chars than are already in the file, then the old
                // chars will still be in the file
            Files.deleteFileIfExisting(inFilePath);
            Files.createFile(inFilePath, "TEXT", "????");

            var file = Files.open(inFilePath, true, inIncludeBOM ? "UTF8" : "");
            file[writeMethod](inText);
            file.close();
        },


        // ===================================================================
        /**
            Appends a string to the end of a text file.

            @param {String|Array} inFilePath The path to the file to read.
            @param {String} inText The string to append to the file.
            @returns {Boolean} True if the text could be appended, false otherwise.
        */
        append: function(
            inFilePath,
            inText)
        {
            inFilePath = this.path(inFilePath);

            if (!Files.exists(inFilePath)) {
                    // first create the file so we can set its Mac type
                Files.createFile(inFilePath, "TEXT", "????");
            }

            var file = new File(this.convertURLToOSPath(inFilePath, true)),
                result = false;

            if (file.open("append")) {
                    // for some bizarre reason, file.write() appends a newline
                    // to the string that's written, but file.writeln() doesn't,
                    // despite the source code looking correct.
                result = file.writeln(inText);
                file.close();
            }

            return result;
        },


        // ===================================================================
        /**
            Returns the contents of a JSON file as a JS object.  An object
            passed in via the `inDefaultData` param will have its properties
            overridden by the data from the JSON file.  If the file does not
            exist, inDefaultData is returned unmodified.

            @param {String|Array} inFilePath The path to the file to read.
            @param {Object} [inDefaultData=null] An object holding default
                properties that will be overriden by the JSON data.
            @returns {Object} The JSON object from the file.
        */
        readJSON: function(
            inFilePath,
            inDefaultData)
        {
            inFilePath = this.path(inFilePath);

            var result = inDefaultData,
                json = this.read(inFilePath),
                data;

            if (json.length > 0) {
                try {
                    data = JSON.parse(json);

                    if (typeof inDefaultData == "object" && inDefaultData) {
                            // add all the properties from the JSON file to
                            // inDefaultData, overriding them
                        for (var name in data) {
                            inDefaultData[name] = data[name];
                        }

                            // we'll return the updated inDefaultData as the result
                        result = inDefaultData;
                    } else {
                        result = data;
                    }
                } catch (exception) {}
            }

            return result;
        },


        // ===================================================================
        /**
            Writes a JS object to a JSON text file.  The JSON is pretty-printed
            by default.

            @param {String|Array} inFilePath The path to the file to write to.
            @param {Object} inData The object to convert to JSON.
            @param {String} [inSpacer="\t"] An optional string that is used to
                indent the JSON output.  The default value is "\t".  Because the
                Fireworks `file.readline()` method returns null if a line is
                longer than 2047 characters, you will generally want to use a
                spacer string to force the JSON output to include only one
                property per line.  This makes the file slightly larger but it
                also makes it more likely that the JSON can be read back in by
                Fireworks successfully.
        */
        writeJSON: function(
            inFilePath,
            inData,
            inSpacer)
        {
            inFilePath = this.path(inFilePath);

            if (typeof inSpacer == "undefined") {
                inSpacer = "\t";
            }

            this.write(inFilePath, JSON.stringify(inData, null, inSpacer));
        },


        // ===================================================================
        /**
            Returns a `Date` object containing the date and time the file was
            created.

            @param {String|Array} inFilePath The path to the file.
            @returns {Date} The creation date of the file, or `null` if the
                file doesn't exist.
        */
        getCreatedDate: function(
            inFilePath)
        {
            return getFixedFileDate(inFilePath, "created");
        },


        // ===================================================================
        /**
            Returns a `Date` object containing the date and time the file was
            last modified.

            @param {String|Array} inFilePath The path to the file.
            @returns {Date} The last modified date of the file, or `null` if the
                file doesn't exist.
        */
        getModifiedDate: function(
            inFilePath)
        {
            return getFixedFileDate(inFilePath, "modified");
        },


        // ===================================================================
        /**
            Returns the size of the file in bytes.

            @param {String|Array} inPath The path to the file.
            @param {String} [inUnit=""] An optional unit in which to report
                the file size.  This parameter can be `"B"`, `"KB"`, `"GB"`, or
                `"TB"`.  The size will be returned with the thousands separated by
                commas and the unit value added to the end, e.g. `"12,420 KB"`.
            @returns {Number|String} The size of the file in bytes, or `-1` if the
                file doesn't exist.  If a value is passed in `inUnit`, the size
                is returned as a string.
        */
        getSize: function(
            inFilePath,
            inUnit)
        {
            inFilePath = this.convertURLToOSPath(this.path(inFilePath), true);

            var size = new File(inFilePath).length,
                power = {
                    B: 0,
                    KB: 1,
                    MB: 2,
                    GB: 3,
                    TB: 4
                }[inUnit],
                thousands = [];

            if (size > -1 && power != undefined) {
                size = size / Math.pow(1024, power);

                    // we can break the size into thousands only if it's > 1
                if (size > 1) {
                    size = Math.round(size).toString();

                    while (size.length > 3) {
                        thousands.push(size.slice(-3));
                        size = size.slice(0, -3);
                    }

                    thousands.push(size);
                    thousands.reverse();
                    size = thousands.join(",");
                } else {
                    size = size.toPrecision(3);
                }

                size += " " + inUnit;
            }

            return size;
        },


        // ===================================================================
        /**
            Copies all the files from one directory to directory.  The source
            directory will be copied recursively.

            @param {String|Array} inFromPath The path to the source directory.
            @param {String|Array} inToPath The path to the destination directory.
                If this directory doesn't exist, it will be created, but only if
                the last directory in the path doesn't exist.  If directories
                further up the path don't exist, then the call will fail.  For
                example, if `file://path/to/a` exists, then passing
                `file://path/to/a/folder` will create the `folder` directory.
                But if only `file://path/to` exists, the call will fail.
        */
        copyDirectoryContents: function(
            inFromPath,
            inToPath)
        {
            inFromPath = this.path(inFromPath);
            inToPath = this.path(inToPath);

            if (!Files.exists(inToPath)) {
                Files.createDirectory(inToPath);
            }

            var files = Files.enumFiles(inFromPath),
                file;

            for (var i = 0, len = files.length; i < len; i++) {
                file = files[i];

                if (Files.isDirectory(file)) {
                        // call ourselves via this so that we can access
                        // this.path when we recurse
                    this.copyDirectoryContents(file, inToPath + Files.getFilename(file) + "/");
                } else {
                    var fileToPath = inToPath + Files.getFilename(file);
                    Files.deleteFileIfExisting(fileToPath);
                    Files.copy(file, fileToPath);
                }
            }
        },


        // ===================================================================
        /**
            Returns the `file://` URL to the script file that called the
            function.  In complicated scripts, it's often useful to load other
            scripts that are located in the same directory or nearby directories.
            Normally, you can access the current script's path via
            `fw.currentScriptDir`, but that value becomes null after one script
            calls another via `fw.runScript()`.

            The `getCurrentScriptURL()` function works around this by exploiting
            the fact that JS exceptions in Fireworks have a `fileName` property
            that points to the script that was executing when the exception
            occurred.  So you can pass in a function that is guaranteed to throw
            an exception when it is called.  `getCurrentScriptURL()` will call
            the function, catch the exception, and then return the path to your
            script.  Hackery!

            @param {Function} inFunction A function that is guaranteed to throw
                an exception.  The simplest is `function(){0()}`.
            @returns {String} The path to the script that defined `inFunction`.
        */
        getCurrentScriptURL: function(
            inFunction)
        {
            var url = "";

            try {
                    // this should be a function that triggers an exception.
                    // by catching the exception, we can determine the name
                    // of the file where the function was lexically defined,
                    // since fw.currentScriptDir is unreliable.  hackery!
                inFunction();
            } catch (exception) {
                url = exception.fileName;
            }

            return url;
        },


        // ===================================================================
        /**
            Returns the path to the directory that contains the script that
            called the function.

            @see getCurrentScriptURL

            @param {Function} inFunction A function that is guaranteed to throw
                an exception.  The simplest is `function(){0()}`.
            @returns {String} The path to the directory containing script that
                defined `inFunction`.
        */
        getCurrentScriptDirectory: function(
            inFunction)
        {
            return Files.getDirectory(this.getCurrentScriptURL(inFunction));
        },


        // ===================================================================
        /**
            Returns the name of the script that called the function.

            @see getCurrentScriptURL

            @param {Function} inFunction A function that is guaranteed to throw
                an exception.  The simplest is `function(){0()}`.
            @returns {String} The filename of the script that defined `inFunction`.
        */
        getCurrentScriptFilename: function(
            inFunction)
        {
            return Files.getFilename(this.getCurrentScriptURL(inFunction));
        },


        // ===================================================================
        /**
            Returns the path to a newly created directory in the local system's
            temp folder.

            @returns {String} The path to the new temp directory or null if
                there was a problem creating the directory.
        */
        createTempDirectory: function()
        {
            var tempFolder = Files.getTempFilePath(null) + "/";

            if (!Files.createDirectory(tempFolder)) {
                return null;
            } else {
                return tempFolder;
            }
        },


        // ===================================================================
        /**
            Returns a path that is made up of the arguments to the function.
            There is guaranteed to be only one slash between each argument, so
            so calling `files.path("foo/bar", "My Command.jsf")` will return
            `"foo/bar/My Command.jsf"`.  This avoids having to constantly check
            whether a directory path you have stored in a variable has a
            trailing / or not.

            You can also pass in a single array of strings that will be combined
            in the same way.  This is mostly used by the other functions in this
            module, which can take either a string or an array of strings for
            their path arguments.

            @param {String|Array} arguments Two or more strings to combine into
                a path, or a single array of strings.
            @returns {String} A path created from the combination of the arguments.
        */
        path: function()
        {
            if (arguments[0] instanceof Array) {
                return arguments.callee.apply(this, arguments[0]);
            }

                // make sure we have a string, in case null or undefined is passed
            var path = arguments[0] + "";

            for (var i = 1; i < arguments.length; i++) {
                var lastChar = path.slice(-1),
                        // force nextArgument to be a string
                    nextArgument = arguments[i] + "";

                    // make sure there is exactly one / between each argument
                if (lastChar != "/" && nextArgument[0] != "/") {
                    path += "/";
                } else if (lastChar == "/" && nextArgument[0] == "/") {
                    path = path.slice(0, -1);
                }

                path += arguments[i];
            }

            return path;
        },


        // ===================================================================
        /**
            Returns a path that's appropriate for the local OS.  Most Fireworks
            path arguments are URLs that begin with `file://`, which can't be
            used in the OS X or Windows shells.  For instance,
            `"file:///C|/Program%20Files/Adobe"` would be returned as
            `"C:\Program Files\Adobe"`.  Escaped characters in the URL are
            unescaped in the returned path.  By default, the path is also
            wrapped in quotes, so that spaces in the path don't trip up the
            command line shell.

            @param {String|Array} inURL The file URL to convert.
            @param {Boolean} [inDontQuote=false] Pass true to prevent the
                returned path from being quoted.
            @returns {String} The OS appropriate version of the file URL.
        */
        convertURLToOSPath: function(
            inURL,
            inDontQuote)
        {
            inURL = this.path(inURL);

            var path;

            if (fw.platform == "win") {
                    // replace file:///C| with C: and turn / into \
                path = inURL.replace(/file:\/\/\/([A-Z])\|/, "$1:");
                path = path.replace(/\//g, "\\");
            } else {
                    // replace file:/// with /Volumes/
                path = inURL.replace(/file:\/\//, "/Volumes");
            }

            path = unescape(path);

            if (inDontQuote) {
                return path;
            } else {
                    // we also have to convert the URL-encoded chars back into normal chars
                    // so that the OS can handle the path, and quote the path in case it
                    // contains spaces
                return path.quote()
            }
        }
    };

    return files;
});
