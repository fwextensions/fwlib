/* ===========================================================================
	
	DomStorage.js

	Copyright (c) 2012 John Dunning.  All rights reserved.
	fw@johndunning.com
	http://johndunning.com/fireworks

	Released under the MIT license.  See the LICENSE file for details.
	Documentation is available at https://github.com/fwextensions/fwlib

   ======================================================================== */


// ===========================================================================
define([
	"dojo/json"
], function(
	JSON) 
{
	function DomStorage(
		inName,
		inDefaultData)
	{
		var dom = fw.getDocumentDOM(),
			k = {
				ChunkSize: 1023,
				ReservedNames: {
					save: true,
					remove: true
				}
			}
		
		if (!dom) {
			return null;
		}
		
		var _metadata = {
			name: inName,
			chunkCount: 1,
			version: arguments.callee.version
		};
		

		// ===================================================================
		this.save = function()
		{
			var dataString = JSON.stringify(this),
				chunkCount = 0;

			for (var i = 0, len = dataString.length; i < len; i += k.ChunkSize) {
					// chunkCount hasn't been incremented for this chunk yet, 
					// so the chunkName will be 0-based, e.g., Edge_0
				dom.pngText[_metadata.name + "_" + chunkCount] = 
					dataString.substr(i, k.ChunkSize);
				
				chunkCount++;
			}
			
			if (_metadata.chunkCount > chunkCount) {
					// we had previously used more chunks to store this object, 
					// so remove the extra ones.  unfortunately, delete doesn't
					// work on dom.pngText, so all we can do is set the unused
					// chunk to undefined.
				for (i = chunkCount, len = _metadata.chunkCount; i < len; i++) {
					dom.pngText[_metadata.name + "_" + i] = "";
				}
			}

				// store the chunk count so we'll know how many chunks to retrieve on the load
			_metadata.chunkCount = chunkCount;

				// our metadata is what's actually stored in dom.pngText[inName]
			dom.pngText[_metadata.name] = JSON.stringify(_metadata);
		}
		
		
		// ===================================================================
		this.remove = function()
		{
			for (var i = 0, len = _metadata.chunkCount; i < len; i++) {
				dom.pngText[_metadata.name + "_" + i] = "";
			}
			
			dom.pngText[_metadata.name] = "";
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


		if (inDefaultData && typeof inDefaultData == "object") {
				// we need to copy the default data onto this before looking at
				// pngText, which will overwrite it with the last saved values
			mixin(this, inDefaultData);
		}

			// now load	any previously saved data
		var	dataString = dom.pngText[_metadata.name];

		if (dataString) {
			try {
					// there was previously stored data for this element, so grab the metadata
				var savedMetadata = JSON.parse(dataString),
					chunks = [];

				_metadata.chunkCount = savedMetadata.chunkCount;

				for (var i = 0, len = _metadata.chunkCount; i < len; i++) {
					chunks.push(dom.pngText[_metadata.name + "_" + i]);
				}

					// combine all the chunks into a single string, turn the 
					// saved string data back into a JS object and then copy
					// all the data into this, so it's accessible publicly
				mixin(this, JSON.parse(chunks.join("")));
			} catch (exception) { 
				// just ignore the exception.  the instance will have whatever
				// default data was passed in.
			}
		}
	}
	
	
	DomStorage.version = 1.0;
	

	return DomStorage;
});
