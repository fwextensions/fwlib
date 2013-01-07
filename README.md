# fwlib: A collection of libraries for Adobe Fireworks extension development

The `fwlib` library offers a collection of utility functions and classes that simplify some aspects of extension development for Adobe Fireworks.  It will hopefully grow in scope as time goes on.  The code is provided as a series of [AMD modules](#requiring-fwlib-modules).


## fwlib/files

The `fwlib/files` module provides a number of utility functions that simplify working with files in Fireworks extensions.  For instance, `files.read()` reads an entire text file into a string, and `files.writeJSON()` writes a JavaScript object out to a file as a JSON string.  

[Documentation][4]


## fwlib/layers

The `fwlib/layers` module includes a number of utility functions and classes that make it easier to inspect and manipulate the layers in a Fireworks document. The native layers API was sufficient back before sub-layers were introduced, but it's now much harder to understand the layer structure.

For instance, if an element is selected and you want to move the top-level layer that contains that element up or down in the stack, how do you find the top-level layer? You have to call `dom.getParentLayerNum(dom.currentLayerNum)`, check if the if result is `-1`, and if not, call it again with the result, until you get a `-1`. There's also no easy way to get a list of all the top-level layers. The classes and functions in this module simplify this process.

[Documentation][5]


## fwlib/prefs

The `fwlib/prefs` module includes utility functions for working with Fireworks preferences files. By storing your persistent data as JSON strings, these utility functions make it easy to save and retrieve information for your commands across Fireworks sessions.

[Documentation][6]


## fwlib/DomStorage

The `fwlib/DomStorage` module provides a class that makes it easy to save and restore arbitrary JS data in the `dom.pngText` object in Fireworks documents.  The data is saved with the document itself, rather than in an external file, which ensures that it's always available if the user distributes the file to someone else.  

The advantage to using the `DomStorage` class over accessing the `dom.pngText` property directly is that the latter can store only strings of up to 1023 characters, while the former can safely store arbitrary JS data by splitting a JSON string into multiple chunks and then recombining them when the data is later retrieved. 

[Documentation][7]


## fwlib/underscore

The [`underscore.js`][9] library provides a large number of handy utilities, including implementations for functions like `forEach()`, `map()` and `reduce()`, which are supported in modern browsers but not in the Fireworks JS engine.  It also includes a simple but powerful templating engine.  

The code is a slightly modified version of the 1.4.3 release of `underscore.js`.  It uses `define()` to create the module instead of exporting a global, and the functions that rely on `setTimeout()` have been removed, since that function is not available within Fireworks.  

[Documentation][10]


## dojo/json

A number of the modules require the `dojo/json` module, since JSON handling is not native to the Fireworks JS engine.  This module is from the 1.7.2 release of the dojo toolkit. 

[Documentation][8]


## Requiring `fwlib` modules

The `fwlib` library includes a copy of [FWRequireJS][1] which wraps [RequireJS][2] to provide a framework for defining and requiring AMD-style modules.  

To use the modules, you will need to store your command files in a particular structure.  Each extension directory that uses `fwlib` modules will need a `lib/` sub-directory containing the `fwrequire.js` and `require.js` files.  The `fwlib` files that your command uses should be in a `fwlib/` sub-directory under `lib/`, which should also contain any other files that the module requires.  `fwlib/files`, for instance, requires `dojo/json`, which in turn requires the `dojo/has` module.

An extension that uses the `fwlib/files` module might have a directory that looks like this:

	Commands/
		My File Commands/
			lib/
				fwlib/
					files.js
				dojo/
					has.js
					json.js
				fwrequire.js
				require.js
			File Command 1.jsf
			File Command 2.jsf

The .jsf files get access to the `fwlib` modules by calling a global `require()` function.  Before it can do so, however, it must make sure the FWRequireJS library is loaded.  To do this, you must include a couple lines of boilerplate code at the beginning of every .jsf file that makes use of the FWRequireJS library:

```JavaScript
if (typeof require != "function" || !require.version) {
	fw.runScript(fw.currentScriptDir + "/lib/fwrequire.js"); }
```

This if-statement checks that there’s a global function called `require` and that it has a `version` property.  If neither of these is true, then it loads `fwrequire.js` in the `lib/` sub-directory, which will, in turn, load `require.js` from the same directory.  By supplying some configuration settings, you can store the files in a different directory, but FWRequireJS will look in `lib/` by default.

Once the FWRequireJS library has been loaded, requiring a module is straightforward: 

```JavaScript
if (typeof require != "function" || !require.version) {
	fw.runScript(fw.currentScriptDir + "/lib/fwrequire.js"); }

require([
	"fwlib/files"
], function(
	files)
{
	var path = fw.browseForFolderURL();
	files.writeJSON([path, "foo.json"], { foo: 42 });
});
```

The first parameter to `require()` is usually an array of one or more strings that name the modules that the file depends on.  Once those modules have been loaded, the second parameter to `require()` will be called back with references to them.

The module names in the dependencies array are mapped to file paths that are relative to a base directory.  By default, this is the directory from which `fwrequire.js` was loaded, but it can be changed via configuration options.  In the example above, the `files` module would be loaded from `lib/fwlib/files.js`.  

Just remember that module paths are relative to the directory from which you loaded `fwrequire.js`, *not* the directory containing the .jsf file that’s using `require()`.  This root directory can be changed via the `baseUrl` property of a configuration object passed to `require()`.  See the [FWRequireJS documentation][3] for more information. 



[1]: https://github.com/fwextensions/fwrequirejs
[2]: http://www.requirejs.org/
[3]: https://github.com/fwextensions/fwrequirejs#configuring-fwrequirejs
[4]: http://htmlpreview.github.com/?https://github.com/fwextensions/fwlib/blob/master/docs/module-files.html
[5]: http://htmlpreview.github.com/?https://github.com/fwextensions/fwlib/blob/master/docs/module-layers.html
[6]: http://htmlpreview.github.com/?https://github.com/fwextensions/fwlib/blob/master/docs/module-prefs.html
[7]: http://htmlpreview.github.com/?https://github.com/fwextensions/fwlib/blob/master/docs/module-DomStorage.html
[8]: http://dojotoolkit.org/reference-guide/1.8/dojo/json.html
[9]: http://documentcloud.github.com/underscore/
[10]: http://underscorejs.org/
