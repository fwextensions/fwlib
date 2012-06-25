/* ===========================================================================
	
	files.js

	Copyright 2012 John Dunning.  All rights reserved.
	fw@johndunning.com
	http://johndunning.com/fireworks

   ======================================================================== */


/*
	To do:
		- append method

	Done:
		- copy a directory 
		
		- add methods for reading/writing json files

*/


// ===========================================================================
define([
	"dojo/json"
], function(
	JSON) 
{
	return {
		// ===================================================================
		read: function(
			inFilePath)
		{
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
		write: function(
			inFilePath,
			inText)
		{
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
		readJSON: function(
			inFilePath,
			inDefaultData)
		{
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
		writeJSON: function(
			inFilePath,
			inData)
		{
			this.write(inFilePath, JSON.stringify(inData));
		},


		// ===================================================================
		copyFolderContents: function(
			inFromPath,
			inToPath)
		{
			if (!Files.exists(inToPath)) {
				Files.createDirectory(inToPath);
			}
			
			var files = Files.enumFiles(inFromPath),
				file;
			
			for (var i = 0, len = files.length; i < len; i++) {
				file = files[i];
				
				if (Files.isDirectory(file)) {
					arguments.callee(file, inToPath + Files.getFilename(file) + "/");
				} else {
					var fileToPath = inToPath + Files.getFilename(file);
					Files.deleteFileIfExisting(fileToPath);
					Files.copy(file, fileToPath);
				}
			}
		},


		// ===================================================================
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
		getCurrentScriptDir: function(
			inFunction)
		{
			return Files.getDirectory(this.getCurrentScriptURL(inFunction));
		},


		// ===================================================================
		getCurrentScriptFilename: function(
			inFunction)
		{
			return Files.getFilename(this.getCurrentScriptURL(inFunction));
		},


		// ===================================================================
		path: function()
		{
				// make sure we have a string, in case null or undefined is passed
			var path = arguments[0] + "";

			for (var i = 1; i < arguments.length; i++) {
				var lastChar = path.slice(-1),
						// force nextArgument to be a string
					nextArgument = arguments[i] + "";

					// make sure there is exactly one / between each argument
				if (lastChar != "/" && nextArgument[0] != "/") {
					path += "/";
				}

				path += arguments[i];
			}

			return path;
		},


		// ===================================================================
		convertURLToOSPath: function(
			inURL,
			inDontQuote)
		{
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
