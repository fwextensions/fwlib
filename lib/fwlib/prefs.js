/* ===========================================================================
	
	prefs.js

	Copyright 2012 John Dunning.  All rights reserved.
	fw@johndunning.com
	http://johndunning.com/fireworks

	Released under the MIT license.  See the LICENSE file for details.
	Documentation is available at https://github.com/fwextensions/fwlib

   ======================================================================== */


// ===========================================================================
define({
	get: function(
		inName,
		inDefaults)
	{
		inDefaults = inDefaults || {};
		
		var prefs = null;
		
		try {
				// the settings are stored as JSON in prefs.  if there aren't any
				// stored settings, it'll eval null, so create an empty object in
				// that case.  we'll add the properties to it below.
			prefs = eval(fw.getPref(inName)) || {};
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
	},
	
	
	set: function(
		inName,
		inPrefs)
	{
			// this will fail if inPrefs has any property names that contain
			// spaces or other characters not allowed in identifiers 
		fw.setPref(inName, inPrefs.toSource());
	}	
});
