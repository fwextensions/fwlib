/* ===========================================================================
	
	layers.js

	Copyright 2012 John Dunning.  All rights reserved.
	fw@johndunning.com
	http://johndunning.com/fireworks

   ======================================================================== */


/*
  To Do:
  	- create Layer methods for setting visible, locked, etc. 

  Done:
  	- create namespace() function in fwlib, or loadModule()
  		loadModule("com.johndunning.layers") would create com.johndunning.layers = {}
	  		and then load Commands/fwlib/com/johndunning/layers.js and return the object
	  	could also load local module, maybe look in current script dir if not found in fwlib
	  	also option to load in global namespace, for things like MochiKit
  	
  	- add things like update() and MochiKit.Base to fwlib
  
	- should make proper root node for layer tree
		so can treat top layers the same as sublayers 
		have a children array?
*/


// ===========================================================================
define(function() {
	var layers = {
		LayerTree: LayerTree,
		Layer: Layer
	};
	

	// =======================================================================
	function LayerTree(
		inAttributes)
	{
		if (typeof inAttributes == "object") {
				// copy the attributes that were passed in to this object, 
				// overriding the defaults
			for (var attribute in inAttributes) {
				this[attribute] = inAttributes[attribute];
			}
		}

		this.dom = this.dom || fw.getDocumentDOM();
		this.layers = [];

		this.root = new Layer({
			index: -1,
			parent: null,
			dom: this.dom,
			tree: this
		});

		for (var i = 0, len = this.dom.layers.length; i < len; i++) {
			var layer = this.layers[i] = new Layer({
				index: i,
				parent: this.layers[this.dom.getParentLayerNum(i)] || this.root,
				dom: this.dom,
				tree: this
			});

				// let the layer know where it is within its parent's sublayer list
			layer.sublayerIndex = layer.parent.sublayers.length;
			layer.parent.sublayers.push(layer);
		}
	}

	LayerTree.prototype = {
		constructor: LayerTree,
		dom: null,
		layers: null,
		root: null,


		// ===================================================================
		getLayerByIndex: function(
			inIndex)
		{
			return this.layers[inIndex];
		},


		// ===================================================================
		getCurrentLayer: function()
		{
			return this.layers[this.dom.currentLayerNum];
		},


		// ===================================================================
		getTopLayers: function()
		{
			return [].concat(this.root.sublayers);
		}
	};


	// =======================================================================
	function Layer(
		inAttributes)
	{
		if (typeof inAttributes == "object") {
				// copy the attributes that were passed in to this object, 
				// overriding the defaults
			for (var attribute in inAttributes) {
				this[attribute] = inAttributes[attribute];
			}
		}

		this.sublayers = [];

			// don't give a name to the root layer node
		if (this.index > -1) {
			this.name = this.dom.layers[this.index].name;
		} else {
			this.name = "[[ROOT]]";
		}
	};

	Layer.prototype = {
		constructor: Layer,
		index: -1,
		sublayerIndex: -1,
		name: "",
		dom: null,
		tree: null,


		// ===================================================================
		getLayer: function() 
		{
			return this.dom.layers[this.index];
		},


		// ===================================================================
		getElements: function(
			inFrame)
		{
			if (typeof inFrame != "number") {
				inFrame = this.dom.currentFrameNum;
			}

			return this.getLayer().frames[inFrame].elements;
		},


		// ===================================================================
		isVisible: function(
			inFrame)
		{
			if (typeof inFrame != "number") {
				inFrame = this.dom.currentFrameNum;
			}

				// assume we're visible
			var visible = true;

				// work around problem with sub-sub-layers on frames other than 1, which 
				// seem to not have frames arrays
			try {
				visible= this.getLayer().frames[inFrame].visible;
			} catch (exception) {}

			return visible;
		},


		// ===================================================================
		isLocked: function(
			inFrame)
		{
			if (typeof inFrame != "number") {
				inFrame: this.dom.currentFrameNum;
			}

				// assume we're not locked
			var locked = false;

				// work around problem with sub-sub-layers on frames other than 1, which 
				// seem to not have frames arrays
			try {
				locked = this.getLayer().frames[inFrame].locked;
			} catch (exception) {}

			return locked;
		},


		// ===================================================================
		isOpen: function()
		{
			return this.getLayer().disclosure;
		},


		// ===================================================================
		isTopLayer: function()
		{
			return this.parent.index == -1;
		},


		// ===================================================================
		getTopLayerAncestor: function()
		{
			var layer = this;

			while (!layer.isTopLayer()) {
				layer = layer.parent;
			}

			return layer;
		},


		// ===================================================================
		getTopLayerAbove: function()
		{
			var topLayer = this.getTopLayerAncestor();
			var topLayers = this.tree.getTopLayers();

				// a top layer's sublayerIndex is its index in the topLayers array
			var topLayerAbove = topLayers[topLayer.sublayerIndex + 1];

			return topLayerAbove;
		},


		// ===================================================================
		getTopLayerBelow: function()
		{
			var topLayer = this.getTopLayerAncestor();
			var topLayers = this.tree.getTopLayers();

				// a top layer's sublayerIndex is its index in the topLayers array
			var topLayerBelow = topLayers[topLayer.sublayerIndex - 1];

			return topLayerBelow;
		},


		// ===================================================================
		getLayerAbove: function()
		{
			var currentLayer = this;

			if (currentLayer.sublayerIndex + 1 < currentLayer.parent.sublayers.length) {
				currentLayer = currentLayer.parent.sublayers[currentLayer.sublayerIndex + 1];
			} else {
					// this layer has no more siblings in the up direction, so its 
					// parent is what's above it, unless it's a top layer, in which case
					// we're at the top of the stack
				if (this.isTopLayer()) {
					return null;
				} else {
					return currentLayer.parent;
				}
			}

				// keep drilling into the 0th (the lowest) sublayer until we run out of
				// sublayers, which will be the layer above inLayer 
			while (currentLayer.sublayers.length > 0) {
				currentLayer = currentLayer.sublayers[0];
			}

			return currentLayer;
		},


		// ===================================================================
		getLayerBelow: function()
		{
			if (this.sublayers.length) {
					// this layer has sublayers, so the layer just below it is the last 
					// sublayer in the array
				return this.sublayers[this.sublayers.length - 1];
			} else {
				var currentLayer = this;

					// this will be true until we hit the root layer node
				while (currentLayer.parent) {
					if (currentLayer.sublayerIndex > 0) {
						return currentLayer.parent.sublayers[currentLayer.sublayerIndex - 1];
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
	layers.copyLayer = function(
		inLayer,
		inTargetDom,
		inSourceDom)
	{
		var dom = inSourceDom || fw.getDocumentDOM();
		var sourceLayer = inLayer.getLayer();

			// find the target layer in the target doc
		var targetLayerIndex = layers.getLayerIndexByName(sourceLayer.name, inTargetDom);

			// we have to deselect everything in the target doc, otherwise we 
			// won't be able to select a different layer
		inTargetDom.selectNone();

		if (targetLayerIndex == -1) {
				// the layer doesn't exist, so create a layer or sublayer
			if (!inLayer.isTopLayer()) {
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
				inTargetDom.currentLayerNum = layers.getTopAncestorLayerIndex(inTargetDom.layers.length - 1, inTargetDom);

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
		var sourceWasLocked = inLayer.isLocked();
		var sourceWasOpen = inLayer.isOpen();

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
		for (var i = 0; i < inLayer.sublayers.length; i++) {
			arguments.callee(inLayer.sublayers[i], inTargetDom);
		}
	}


	// =======================================================================
	layers.copyLayerBetweenPages = function(
		inLayer,
		inSourcePageIndex,
		inTargetPageIndex)
	{
		fw.getDocumentDOM().changeCurrentPage(inSourcePageIndex);
		var dom = fw.getDocumentDOM();
		var sourceLayer = inLayer.getLayer();
		var sourceFrameIndex = dom.currentFrameNum;

		dom.changeCurrentPage(inTargetPageIndex);
		var targetDom = fw.getDocumentDOM();
		var targetFrameIndex = dom.currentFrameNum;

			// we have to deselect everything in the target doc, otherwise we 
			// won't be able to select a different layer
		targetDom.selectNone();

			// we're copying between pages, and layers in different pages have to have
			// unique names, so the layer won't exist, so create a layer or sublayer
		if (!inLayer.isTopLayer()) {
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
			targetDom.currentLayerNum = layers.getTopAncestorLayerIndex(targetDom.layers.length - 1, targetDom);

			targetDom.addNewLayer(sourceLayer.name, sourceLayer.sharing);
		}

		var targetLayerIndex = targetDom.currentLayerNum;

			// select every element on the source layer
		dom.changeCurrentPage(inSourcePageIndex);
		var sourceWasLocked = inLayer.isLocked(sourceFrameIndex);
		var sourceWasOpen = inLayer.isOpen();
		var sourceWasVisible = inLayer.isVisible();

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
		for (var i = 0; i < inLayer.sublayers.length; i++) {
			arguments.callee(inLayer.sublayers[i], inSourcePageIndex, inTargetPageIndex);
		}
	}


	// =======================================================================
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
	layers.getTopAncestorLayerIndex = function(
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
	layers.getNextDocument = function(
		inDom)
	{
		var dom = inDom || fw.getDocumentDOM();

			// set a flag value in this doc's pngText so that it will be unique
			// across all open documents.  getNextDocument() looks for the next 
			// unique open doc by checking each one's pngText.
		dom.pngText.fwlibStartingDoc = true;

		var nextDoc = null;

		if (fw.documents.length > 1) {
			for (var i = 0; i < fw.documents.length; i++) {
				var openDoc = fw.documents[i];

				if (openDoc.pngText != dom.pngText && openDoc.isValid && !openDoc.isSymbolDocument) {
						// this is an open document that is not the current one,
						// so it's a valid next document
					nextDoc = fw.documents[i];
					break;
				} 
			}
		} 

			// remove the flag so it's not saved out with the file
		delete dom.pngText.fwlibStartingDoc;

		return nextDoc;
	}


	// =======================================================================
	layers.getTopLayerIndexes = function(
		inDom) 
	{
		var dom = inDom || fw.getDocumentDOM();
		var layerIndexes = [];

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
	layers.alertLayers = function(
		inDom,
		inJustReturnOutput)
	{
		inDom = inDom || fw.getDocumentDOM();

		var tree = new layers.LayerTree({ dom: inDom });

			// reverse the layers so the web layer will be on top
		var layers = tree.getTopLayers().reverse();
		var output = "";

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
