/* ===========================================================================
	
	layers.js

	Copyright 2012 John Dunning.  All rights reserved.
	fw@johndunning.com
	http://johndunning.com/fireworks

	Released under the MIT license.  See the LICENSE file for details.
	Documentation is available at https://github.com/fwextensions/fwlib

   ======================================================================== */


/*
	To do:
		- create Layer methods for setting visible, locked, etc. 

	Done:
		- should make proper root node for layer tree
			so can treat top layers the same as sublayers 
			have a children array?
*/


// ===========================================================================
/**
	The `fwlib/layers` module includes a number of utility functions and classes
	that make it easier to inspect and manipulate the layers in a Fireworks
	document.  The native layers API was sufficient back before sub-layers were
	introduced, but it's now much harder to understand the layer structure.  

	For instance, if an element is selected and you want to move the top-level 
	layer that contains that element up or down in the stack, how do you find
	the top-level layer?  You have to call `dom.getParentLayerNum(dom.currentLayerNum)`,
	check if the if result is `-1`, and if not, call it again with the result,
	until you get a `-1`.  There's also no easy way to get a list of all the
	top-level layers.  The classes and functions in this module simplify this
	process.

	@module layers
*/
define(function() {
		// create the API object.  other static functions will be defined on it
		// below
	var layers = {
		LayerTree: LayerTree,
		Layer: Layer
	};


	// =======================================================================
	function findLayer(
		inArray,
		inIndex)
	{
		if (typeof inIndex == "string") {
			for (var i = 0, len = inArray.length; i < len; i++) {
				if (inArray[i].name == inIndex) {
					return inArray[i];
				}
			}

			return undefined;
		} else {
			return inArray[inIndex];
		}
	}
	

	// =======================================================================
	/**
		Constructor for a `LayerTree` object that holds information about the
		current state of all the layers in the current document.  To use it,
		just create a new instance:
	
			var tree = new layers.LayerTree();
			// shows index of layer named "Dialog"
			alert(tree.layer("Dialog").index); 
	
		The `LayerTree` is generated for the layers on the current frame of the
		document.  Change `dom.currentFrameNum` before creating a new `LayerTree`
		to get the layers on a different frame.
	
		The `LayerTree` members return instances of the {@link module:layers.Layer}
		class.

		@param {Object} [inDOM] An optional reference to an open Fireworks 
			document.  If not provided, the `LayerTree` will default to the 
			current document.
		@returns {Object} A `LayerTree` instance representing the layers in the
			current document.
		@constructor
		@memberof module:layers
	*/
	function LayerTree(
		inDOM)
	{
		this._dom = inDOM || fw.getDocumentDOM();
		this._layers = [];
		this._root = new Layer({
			index: -1,
			parent: null,
			_dom: this._dom,
			_tree: this
		});

		for (var i = 0, len = this._dom.layers.length; i < len; i++) {
			var layer = this._layers[i] = new Layer({
				index: i,
				parent: this._layers[this._dom.getParentLayerNum(i)] || this._root,
				_dom: this._dom,
				_tree: this
			});

				// let the layer know where it is within its parent's sublayer list
			layer.sublayerIndex = layer.parent._sublayers.length;
			layer.parent._sublayers.push(layer);
		}
	}

	LayerTree.prototype = /** @lends module:layers.LayerTree.prototype */ {
		constructor: LayerTree,
		_dom: null,
		_layers: null,
		_root: null,


		// ===================================================================
		/**
			An array of `Layer` instances representing all of the layers in the 
			document. 
		
			Note that this getter returns a copy of the layers array every time
			it's accessed, so if you need just one layer, it's a little more
			efficient to call the `layer()` method.
		
			@type {[Layer]}
		*/
		get layers()
		{
			return [].concat(this._layers);
		},


		// ===================================================================
		/**
			An array of the top `Layer` instances in the document.
		
			@type {[Layer]}
		*/
		get topLayers()
		{
			return [].concat(this._root.sublayers);
		},


		// ===================================================================
		/**
			The current `Layer` of the document.
		
			@type {Layer}
		*/
		get currentLayer()
		{
			return this._layers[this._dom.currentLayerNum];
		},
		
		
		// ===================================================================
		/**
			Returns a `Layer` instance accessed by its index in the layer stack
			or by its name.  
		
			@param {Number|String} inIndex The 0-based index or name of a layer.
			@returns {Layer} A `Layer` instance representing the specified 
				layer, or `undefined` if it can't be found.
		*/
		layer: function(
			inIndex)
		{
			return findLayer(this._layers, inIndex);
		}
	};


	// =======================================================================
	/**
		Constructor for a `Layer` object that holds information about a given
		layer in the current document.  There's no need to create an instance
		of this class directly; rather, you'll retrieve `Layer` instances through
		a {@link module:layers.LayerTree} instance.
	
		`Layer` instances have a number of properties that make it easier to
		understand the layer structure in a document.  For instance, `layer.parent`
		points to the layer's parent, which is otherwise a chore to figure out
		using the default API.
	
		This code will display the name of the top-level layer that contains the
		current layer:
	
			var tree = new layers.LayerTree();
			alert(tree.currentLayer.topLayerAncestor.name);

		@param {Object} inConfig An object containing properties that are copied
			onto the `Layer` instance.
		@returns {Object} A `Layer` instance representing one of the layers in the
			current document.
		@constructor
		@memberof module:layers
	*/
	function Layer(
		inConfig)
	{
		if (typeof inConfig == "object") {
				// copy the attributes that were passed in to this object, 
				// overriding the defaults
			for (var attribute in inConfig) {
				this[attribute] = inConfig[attribute];
			}
		}

		this._sublayers = [];
		
			// remember which frame this layer corresponds to, since the locked
			// and visible states can be different on each
		this._frameIndex = this._dom.currentFrameNum;

			// don't give a name to the root layer node
		this.name = (this.index > -1) ? this._dom.layers[this.index].name : "[[ROOT]]";
	};

	Layer.prototype = /** @lends module:layers.Layer.prototype */ {
		constructor: Layer,
		_dom: null,
		_tree: null,
		_sublayers: null,
		_frameIndex: 0,
		
		/** 
			The `Layer` instance that contains this layer.
		
			@type Layer
		*/
		parent: null,
		
		/** 
			The index of the layer in the Fireworks layers stack.
		
			@type Number
		*/
		index: -1,
		
		/** 
			The position of the layer among its sub-layer siblings under its 
			immediate parent.  If the layer is at the top level, this will be 
			its position among the top-level layers.			
		
			@type Number
		*/
		sublayerIndex: -1,
		
		/** 
			The name of the layer.
		
			@type String
		*/
		name: "",


		// ===================================================================
		/**
			The underlying Fireworks layer object that's represented by this
			`Layer` instance.
		
			@type Fireworks Layer
			@readonly
		*/
		get layer() 
		{
			return this._dom.layers[this.index];
		},


		// ===================================================================
		/**
			An array of the Fireworks elements on the layer.
		
			@type Array
			@readonly
		*/
		get elements()
		{
			return this.layer.frames[this._frameIndex].elements;
		},


		// ===================================================================
		/**
			An array of the layer's sub-layers, if any.
		
			@type [Layer]
			@readonly
		*/
		get sublayers() 
		{
			return [].concat(this._sublayers);
		},


		// ===================================================================
		/**
			Returns a `Layer` instance accessed by its index in the layer's
			list of sub-layers or by its name.  
		
			@param {Number|String} inIndex The 0-based index or name of a sub-layer.
			@returns {Layer} A `Layer` instance representing the specified 
				sub-layer, or `undefined` if it can't be found.
		*/
		sublayer: function(
			inIndex)
		{
			return findLayer(this._sublayers, inIndex);
		},


		// ===================================================================
		/**
			Whether the layer is visible in the document.
		
			@type Boolean
		*/
		get visible()
		{
				// assume we're visible
			var visible = true;

				// work around problem with sub-sub-layers on frames other than 1, which 
				// seem to not have frames arrays
			try {
				visible = this.layer.frames[this._frameIndex].visible;
			} catch (exception) {}

			return visible;
		},
		set visible(
			inVisible)
		{
			try {
				this.layer.frames[this._frameIndex].visible = inVisible;
			} catch (exception) {}
		},


		// ===================================================================
		/**
			Whether the layer is locked in the *Layers* panel.
		
			@type Boolean
		*/
		get locked()
		{
				// assume we're not locked
			var locked = false;

				// work around problem with sub-sub-layers on frames other than 1, which 
				// seem to not have frames arrays
			try {
				locked = this.layer.frames[this._frameIndex].locked;
			} catch (exception) {}

			return locked;
		},
		set locked(
			inLocked)
		{
			try {
				this.layer.frames[this._frameIndex].locked = inLocked;
			} catch (exception) {}
		},


		// ===================================================================
		/**
			Whether the disclosure triangle for the layer in the *Layers* panel
			is open or closed
		
			@type Boolean
		*/
		get disclosure()
		{
			return this.layer.disclosure;
		},
		set disclosure(
			inOpen)
		{
			this.layer.disclosure = inOpen;
		},


		// ===================================================================
		/**
			Whether the layer is at the top level of the *Layers* panel.
		
			@type Boolean
			@readonly
		*/
		get isTopLayer()
		{
			return this.parent.index == -1;
		},


		// ===================================================================
		/**
			The top-level `Layer` that contains this layer.  If this layer is
			at the top level, then the same layer is returned.  Only immediate
			sub-layers are returned.
		
			@type Layer
			@readonly
		*/
		get topLayerAncestor()
		{
			var layer = this;

			while (!layer.isTopLayer) {
				layer = layer.parent;
			}

			return layer;
		},


		// ===================================================================
		/**
			The top-level `Layer` that is immediately above the top-level layer
			that contains this layer.  If this layer is at the top of the 
			stack in the *Layers* panel, than this property will be `undefined`.

			@type Layer
			@readonly
		*/
		get topLayerAbove()
		{
				// a top layer's sublayerIndex is its index in the topLayers array
			return this._tree.topLayers[this.topLayerAncestor.sublayerIndex + 1];
		},


		// ===================================================================
		/**
			The top-level `Layer` that is immediately below the top-level layer
			that contains this layer.  If this layer is at the bottom of the 
			stack in the *Layers* panel, than this property will be `undefined`.

			@type Layer
			@readonly
		*/
		get topLayerBelow()
		{
			return this._tree.topLayers[this.topLayerAncestor.sublayerIndex - 1];
		},


		// ===================================================================
		/**
			The `Layer` that is immediately above this layer in the *Layers* 
			panel.  This will be `null` if the layer is at the very top of the 
			stack.

			@type Layer
			@readonly
		*/
		get layerAbove()
		{
			var currentLayer = this;

			if (currentLayer.sublayerIndex + 1 < currentLayer.parent._sublayers.length) {
				currentLayer = currentLayer.parent._sublayers[currentLayer.sublayerIndex + 1];
			} else {
					// this layer has no more siblings in the up direction, so 
					// its parent is what's above it, unless it's a top layer, 
					// in which case we're at the top of the stack
				if (this.isTopLayer) {
					return null;
				} else {
					return currentLayer.parent;
				}
			}

				// keep drilling into the 0th (the lowest) sublayer until we run 
				// out of sublayers, which will be the layer above inLayer 
			while (currentLayer._sublayers.length > 0) {
				currentLayer = currentLayer._sublayers[0];
			}

			return currentLayer;
		},


		// ===================================================================
		/**
			The `Layer` that is immediately below this layer in the *Layers* 
			panel.  This will be `null` if the layer is at the very bottom of 
			the stack.

			@type Layer
			@readonly
		*/
		get layerBelow()
		{
			if (this._sublayers.length) {
					// this layer has sublayers, so the layer just below it is the last 
					// sublayer in the array
				return this._sublayers[this._sublayers.length - 1];
			} else {
				var currentLayer = this;

					// this will be true until we hit the root layer node
				while (currentLayer.parent) {
					if (currentLayer.sublayerIndex > 0) {
						return currentLayer.parent._sublayers[currentLayer.sublayerIndex - 1];
					} else if (currentLayer.parent) {
						currentLayer = currentLayer.parent;
					} 
				}

				return null;
			}
		},


		// ===================================================================
		toString: function()
		{
			return ["[", this.name, " - layer: ", this.index, ", sublayer: ", this.sublayerIndex, "]"].join("");
		}
	};


	// =======================================================================
	/**
		Copies the elements on a layer from one document to another.  
	
		@param {Layer} inLayer The `Layer` instance to copy.
		@param {DOM} inTargetDom The document to copy the layer's elements to.
		@param {DOM} [inSourceDom] The document to copy the layer's elements 
			from.  If this isn't included, the current document is used as the
			source.
		@memberof module:layers
	*/
	layers.copyLayer = function(
		inLayer,
		inTargetDom,
		inSourceDom)
	{
		var dom = inSourceDom || fw.getDocumentDOM(),
			sourceLayer = inLayer.layer,
				// find the target layer in the target doc
			targetLayerIndex = layers.getLayerIndexByName(sourceLayer.name, inTargetDom);

			// we have to deselect everything in the target doc, otherwise we 
			// won't be able to select a different layer
		inTargetDom.selectNone();

		if (targetLayerIndex == -1) {
				// the layer doesn't exist, so create a layer or sublayer
			if (!inLayer.isTopLayer) {
					// we need to create a sublayer, so find the index of the parent
					// layer, which may be different than in the source doc
				var targetParentIndex = layers.getLayerIndexByName(inLayer.parent.name, inTargetDom);

				inTargetDom.addNewSubLayer(targetParentIndex, sourceLayer.name, sourceLayer.sharing);
			} else {
					// we need to create a new top layer in the targetDoc with the same
					// name as in the current one.  create the new layer at the top 
					// of the stack; creating a top layer when a sublayer is 
					// selected seems to cause errors.  we have to get the top ancestor
					// layer because layers[layers.length - 1] might be a sublayer of
					// the web layer.  
				inTargetDom.currentLayerNum = layers.getTopLayerAncestorIndex(inTargetDom.layers.length - 1, inTargetDom);

				inTargetDom.addNewLayer(sourceLayer.name, sourceLayer.sharing);
			}

				// force the new layer to have the same name as the source, which 
				// doesn't happen in FW9.  it usually gets " 1" appended to it.  we 
				// have to use setLayerName() because just setting the name attribute
				// dosen't work for sublayers in FW9 beta.
			inTargetDom.setLayerName(-1, sourceLayer.name);

			targetLayerIndex = inTargetDom.currentLayerNum;
		} else {
				// make sure the layer is unlocked before we try to make it the current 
				// layer.  otherwise, the pasted objects will go into the next layer up.
			inTargetDom.setLayerLocked(targetLayerIndex, inTargetDom.currentFrameNum, false, false);

				// select the layer in the target doc
			inTargetDom.currentLayerNum = targetLayerIndex;
		}

			// select every element on the source layer
		dom.selectAllOnLayer(inLayer.index);
		var sourceWasLocked = inLayer.locked,
			sourceWasOpen = inLayer.disclosure;

			// only do a copy and paste if there's something selected.  otherwise, an
			// empty layer would cause the previous clipboard to be pasted again.
		if (fw.selection.length) {
			dom.clipCopy();
			dom.selectNone();
			inTargetDom.clipPaste("do not resample");
		}

			// set the locked and disclosure states.  use the dom functions
			// instead of directly setting the properties since that seems to fail
			// on sublayers. 
		inTargetDom.setLayerLocked(targetLayerIndex, inTargetDom.currentFrameNum, sourceWasLocked, false);
		inTargetDom.setLayerDisclosure(targetLayerIndex, sourceWasOpen);

			// copy the layer's sublayers recursively
		for (var i = 0, len = inLayer.sublayers.length; i < len; i++) {
			arguments.callee(inLayer.sublayer(i), inTargetDom);
		}
	}


	// =======================================================================
	/**
		Copies the elements on a layer from one page to another in the same 
		document.  
	
		@todo Ensure that elements get copied to the appropriately named layer.

		@param {Layer} inLayer The `Layer` instance to copy.
		@param {Number} inSourcePageIndex The index of the page to copy from.
		@param {Number} inTargetPageIndex The index of the page to copy to.
		@memberof module:layers
	*/
	layers.copyLayerBetweenPages = function(
		inLayer,
		inSourcePageIndex,
		inTargetPageIndex)
	{
		fw.getDocumentDOM().changeCurrentPage(inSourcePageIndex);
		
		var dom = fw.getDocumentDOM(),
			sourceLayer = inLayer.layer,
			sourceFrameIndex = dom.currentFrameNum;

		dom.changeCurrentPage(inTargetPageIndex);
		var targetDom = fw.getDocumentDOM(),
			targetFrameIndex = dom.currentFrameNum;

			// we have to deselect everything in the target doc, otherwise we 
			// won't be able to select a different layer
		targetDom.selectNone();

			// we're copying between pages, and layers in different pages have to have
			// unique names, so the layer won't exist, so create a layer or sublayer
		if (!inLayer.isTopLayer) {
				// we need to create a sublayer, so find the index of the parent
				// layer, which may be different than in the source doc
			var targetParentIndex = layers.getLayerIndexByName(inLayer.parent.name, targetDom);

// check for parent layer not found

			targetDom.addNewSubLayer(targetParentIndex, sourceLayer.name, sourceLayer.sharing);
		} else {
				// we need to create a new top layer in the targetDoc with the same
				// name as in the current one.  create the new layer at the top 
				// of the stack; creating a top layer when a sublayer is 
				// selected seems to cause errors.  we have to get the top ancestor
				// layer because layers[layers.length - 1] might be a sublayer of
				// the web layer.  
			targetDom.currentLayerNum = layers.getTopLayerAncestorIndex(targetDom.layers.length - 1, targetDom);

			targetDom.addNewLayer(sourceLayer.name, sourceLayer.sharing);
		}

		var targetLayerIndex = targetDom.currentLayerNum;

			// select every element on the source layer
		dom.changeCurrentPage(inSourcePageIndex);
		var sourceWasLocked = inLayer.locked,
			sourceWasOpen = inLayer.disclosure,
			sourceWasVisible = inLayer.visible;

			// unlock the layer so we can select its elements 
		dom.setLayerLocked(inLayer.index, sourceFrameIndex, false, false);
		dom.selectAllOnLayer(inLayer.index);

			// only do a copy and paste if there's something selected.  otherwise, an
			// empty layer would cause the previous clipboard to be pasted again.
		if (fw.selection.length) {
			dom.clipCopy();

			dom.changeCurrentPage(inTargetPageIndex);
			targetDom.clipPaste("do not resample");

				// deselecting the pasted elements seems to improve the performance  
				// when going between pages
			dom.selectNone();
		}

			// change to the current page again (in case there was no selection)
			// and set the locked and disclosure states.  use the dom functions
			// instead of directly setting the properties since that seems to fail
			// on sublayers. 
		dom.changeCurrentPage(inTargetPageIndex);
		targetDom = fw.getDocumentDOM();
		targetDom.setLayerLocked(targetLayerIndex, targetDom.currentFrameNum, sourceWasLocked, false);
		targetDom.setLayerDisclosure(targetLayerIndex, sourceWasOpen);
		targetDom.setLayerVisible(targetLayerIndex, targetDom.currentFrameNum, sourceWasVisible, false);

			// copy the layer's sublayers recursively
		for (var i = 0, len = inLayer.sublayers.length; i < len; i++) {
			arguments.callee(inLayer.sublayer(i), inSourcePageIndex, inTargetPageIndex);
		}
	}


	// =======================================================================
	/**
		Returns the index of the named layer.  

		@param {String} inLayerName The name of the index.
		@param {DOM} [inDom] The document to look in to find the layer.  This
			defaults to the current document if not specified. 
		@returns {Number} The index of the layer in the Fireworks layers stack,
			or `-1` if a layer with that name can't be found.
		@memberof module:layers
	*/
	layers.getLayerIndexByName = function(
		inLayerName,
		inDom)
	{
		inDom = inDom || fw.getDocumentDOM();

		var layerIndex = -1;
		var layerCount = inDom.layers.length;

		for (var i = 0; i < layerCount; i++) {
			if (inDom.layers[i].name == inLayerName) {
				layerIndex = i;
				break;
			} 
		}

		return layerIndex;
	}


	// =======================================================================
	/**
		Returns the index of the top-level layer that contains the layer 
		specified by `inLayerIndex`.

		@param {Number} inLayerIndex A layer index.
		@param {DOM} [inDom] The document to look in to find the layer.  This
			defaults to the current document if not specified. 
		@returns {Number} The index of the top-level layer in the Fireworks 
			layers stack that contains the layer specified by `inLayerIndex`.
		@memberof module:layers
	*/
	layers.getTopLayerAncestorIndex = function(
		inLayerIndex,
		inDom) 
	{
		var dom = inDom || fw.getDocumentDOM();
		var i = inLayerIndex;

		while (dom.getParentLayerNum(i) != -1) {
			i = dom.getParentLayerNum(i);
		}

		return i;
	}


	// =======================================================================
	/**
		Returns an array of the indexes that correspond to the top-level layers
		in the document.

		@param {DOM} [inDom] The document containing the layers, or the current 
			document if not specified. 
		@returns {Array} All of the indexes of the top-level layers in the document.
		@memberof module:layers
	*/
	layers.getTopLayerIndexes = function(
		inDom) 
	{
		var dom = inDom || fw.getDocumentDOM(),
			layerIndexes = [];

		for (var i = 0, len = dom.layers.length; i < len; i++) {
			while (dom.getParentLayerNum(i) != -1) {
					// skip over the sublayers 
				i++;
			}

			if (i >= len) {
				break;
			}

			layerIndexes.push(i);
		}

		return layerIndexes;		
	}


	// =======================================================================
	/**
		Displays a textual representation of the layer structure of a document in
		an alert dialog.  This can help with debugging a command that modifies 
		the layer structure, so you can get a snapshot of the layers at different
		points in the command.
	
		Each line in the representation shows the layer index and the name of 
		the layer.  The indentation of the line indicates the parent/child
		relationships of the layers, simliar to how they're shown in the *Layers* 
		panel.

			5: Web Layer
			2: Layer 3
				3: Layer 5
					4: Layer 4
			0: Layer 1
				1: Layer 2

		@param {DOM} [inDom] The document whose layers should be shown.  This
			defaults to the current document if not specified. 
		@param {Boolean} [inJustReturnOutput] Pass true to suppress the `alert()`
			dialog and just return the layer structure as a string.
		@returns {String} If `inJustReturnOutput` is true, a string representation
			of the document's layer stack.  Otherwise, nothing. 
		@memberof module:layers
	*/
	layers.alertLayers = function(
		inDom,
		inJustReturnOutput)
	{
		inDom = inDom || fw.getDocumentDOM();

		var tree = new LayerTree(inDom),
				// reverse the layers so the web layer will be on top
			layers = tree.topLayers.reverse(),
			output = "";

		for (var i = 0; i < layers.length; i++) {
			output += getLayerText(layers[i], "")
		}

		if (inJustReturnOutput) {
			return output;
		} else {
			alert(output);
		}

		function getLayerText(
			inLayer,
			inIndent)
		{
			var output = inIndent + inLayer.index + ": " + inLayer.name + "\n";
			var sublayers = inLayer.sublayers.reverse();

			for (var j = 0; j < sublayers.length; j++) {
				output += getLayerText(sublayers[j], inIndent + "    ");
			}

			return output;
		}
	}


	return layers;
});
