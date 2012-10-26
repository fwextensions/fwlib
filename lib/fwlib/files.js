/* ===========================================================================
    
    files.js

    Copyright 2012 John Dunning.  All rights reserved.
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
    return /** @lends module:files */ {
        // ===================================================================
        /**
            Returns the contents of a text file.  If the file does not exist,
            an empty string is returned.

            @param {String|Array} inFilePath The path to the file to read.
            @returns {String} The text contents of the file.
        */
        read: function(
            inFilePath)
        {
            inFilePath = this.path(inFilePath);
            
            var text = "";

            if (Files.exists(inFilePath)) {
                    // despite what the docs say, the second param to open is a
                    // boolean for opening the file for writing
                var file = Files.open(inFilePath, false),
                    lines = [],
                    line;

                if (file) {
                        // check if the line is not actually null, since "" will be
                        // returned for empty lines.
                    while ((line = file.readline()) !== null) {
                        lines.push(line);
                    }

                    file.close();

                    text = lines.join("\n");
                }
            }

            return text;
        },


        // ===================================================================
        /**
            Writes a string to a text file.  It will overwrite a file that
            already exists at the path.
    
            @param {String|Array} inFilePath The path to the file to write to.
            @param {String} inText The string to write to the file.
        */
        write: function(
            inFilePath,
            inText)
        {
            inFilePath = this.path(inFilePath);
            
                // delete any existing file at that path, since if we don't and we
                // write fewer chars than are already in the file, then the old
                // chars will still be in the file 
            Files.deleteFileIfExisting(inFilePath);
            Files.createFile(inFilePath, "TEXT", "????");

            var file = Files.open(inFilePath, true);
            file.write(inText);
            file.close();
        },


        // ===================================================================
        /**
            Appends a string to the end of a text file.  The only way to do this
            is to read the whole file before writing to it, so this operation
            will become slower the more it's used on a given file.  
    
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
                Files.createFile(inFilePath, "TEXT", "????");
            }

            var file = Files.open(inFilePath, true);

            if (!file) {
                return false;
            }

                // skip over any existing lines in the file without saving them.
                // this will move the file pointer to the end of the file.
            while (file.readline() !== null) { ; }

            file.write(inText);
            file.close();
            
            return true;
        },


        // ===================================================================
        /**
            Returns the contents of a JSON file as a JS object.  An object
            passed in via the `inDefaultData` param will have its properties
            overridden by the data from the JSON file.  If the file does not 
            exist, inDefaultData is returned unmodified.
    
            @param {String|Array} inFilePath The path to the file to read.
            @param {Object} [inDefaultData] An object holding default properties
                that will be overriden by the JSON data.
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

                    if (typeof inDefaultData == "object") {
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
            Writes a JS object to a JSON text file.  The JSON can be optionally
            pretty-printed.
    
            @param {String|Array} inFilePath The path to the file to write to.
            @param {Object} inData The object to convert to JSON.
            @param {String} [inSpacer] An optional string that is used to
                indent the JSON output.  The default value is "\t".  Because the
                Fireworks `file.readline()` method returns null if a line is
                longer than 2047 characters, you will generally want to use a
                spacer string to force the JSON output to include only one 
                property per line.  This makes it more likely that the JSON can
                be read back in by Fireworks successfully.
        */
        writeJSON: function(
            inFilePath,
            inData,
            inSpacer)
        {
            inFilePath = this.path(inFilePath);
            this.write(inFilePath, JSON.stringify(inData, null, inSpacer || "\t"));
        },


        // ===================================================================
        /**
            Copies all the files from one directory to directory.  The source
            directory will be copied recursively. 
    
            @param {String|Array} inFromPath The path to the source directory.
            @param {String|Array} inToPath The path to the destination directory.  
                If this directory doesn't exist, it will be created. 
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
            @param {Boolean} [inDontQuote] Pass true to prevent the returned
                path from being quoted.
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
});
