/* ===========================================================================

    layers.js

    Copyright 2013 John Dunning.  All rights reserved.
    fw@johndunning.com
    http://johndunning.com/fireworks

    Released under the MIT license.  See the LICENSE file for details.
    Documentation is available at https://github.com/fwextensions/fwlib

   ======================================================================== */


// ===========================================================================
/**
    The `fwlib/layers` module includes a number of utility functions and classes
    that make it easier to inspect and manipulate the layers in a Fireworks
    document.  The native layers API was sufficient back before sub-layers were
    introduced, but it's now much harder to understand and manipulate the layer
    structure.

    For instance, if an element is selected and you want to move the top-level
    layer that contains that element up or down in the stack, how do you find
    the top-level layer?  You have to call `dom.getParentLayerNum(dom.currentLayerNum)`,
    check if the if result is `-1`, and if not, call it again with the result,
    until you get a `-1`.  There's also no easy way to figure out which layer is
    directly above or below another one.  The classes and functions in this
    module simplify this process.

    @module layers
*/
define(function() {
        // create the API object.  other static functions will be defined on it
        // below
    var layers = {
            LayerTree: LayerTree,
            Layer: Layer
        },
        hasOwnProperty = Object.prototype.hasOwnProperty;


    // =======================================================================
    function forEach(obj, iterator, context) {
        if (obj == null) return;
        if (obj.length === +obj.length) {
            for (var i = 0, l = obj.length; i < l; i++) {
                    // i in obj seems to be false when it's an array extracted
                    // from customData
                if (iterator.call(context, obj[i], i, obj) === false) return;
            }
        } else {
            for (var key in obj) {
                if (hasOwnProperty.call(obj, key)) {
                    if (iterator.call(context, obj[key], key, obj) === false) return;
                }
            }
        }
    }


    // =======================================================================
    function indexOfProperty(
        inItems, inProperty, inValue)
    {
        var index = -1;

        forEach(inItems, function(item, i) {
            if (item[inProperty] == inValue) {
                index = i;
                return false;
            }
        });

        return index;
    }


    // =======================================================================
    function findLayer(
        inArray,
        inIndex)
    {
        if (typeof inIndex == "string") {
            return inArray[indexOfProperty(inArray, "name", inIndex)];
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
        to get the layers on a different frame.  Due to bugs in the layers API,
        if you change `dom.currentFrameNum` *after* creating the `LayerTree`, the
        wrong layer is likely to be returned or modified when accessing a layer
        by name or index.

        The `LayerTree` members return instances of the {@link module:layers.Layer}
        class.

        @param {Object} [inDOM=currentDOM] An optional reference to an open
            Fireworks document.  If not provided, the `LayerTree` will default
            to the current document.
        @param {Boolean} [inIgnoreWebLayers=false] Pass true to create a `LayerTree`
            that does not include any `Layer` instances for the web layers in
            the document, which makes looping over the layers a little simpler
            if you want to ignore slices and hotspots.
        @returns {Object} A `LayerTree` instance representing the layers in the
            current document.
        @constructor
        @memberof module:layers
    */
    function LayerTree(
        inDOM,
        inIgnoreWebLayers)
    {
        this._dom = inDOM || fw.getDocumentDOM();
        this._frameIndex = this._dom.currentFrameNum;
        this._ignoreWebLayers = !!inIgnoreWebLayers;
        this.refresh();
    }

    LayerTree.prototype = /** @lends module:layers.LayerTree.prototype */ {
        constructor: LayerTree,
        _dom: null,
        _frameIndex: 0,
        _layers: null,
        _root: null,
        _ignoreWebLayers: false,


        // ===================================================================
        /**
            Updates the `LayerTree`'s internal data to reflect the current
            state of the document and sets any existing `Layer` instances
            associated with this tree to a stale state.  This method should be
            called whenever a layer is deleted or rearranged in the stack,
            which can cause one or more of the layers' indexes to change.

            Instead of calling `refresh()`, you can also just create a new
            `LayerTree` instance, which will reflect the current state of the
            document.
        */
        refresh: function()
        {
            if (this._layers) {
                forEach(this._layers, function(layer) {
                    layer._stale = true;
                });
            }

            this._layers = [];
            this._root = new Layer({
                index: -1,
                parent: null,
                _dom: this._dom,
                _frameIndex: this._frameIndex,
                _tree: this
            });

            for (var i = 0, len = this._dom.layers.length; i < len; i++) {
                var parentLayerNum = this._dom.getParentLayerNum(i);

                    // when skipping web layers, check that the layer's parent
                    // num is -1, since when master page layers are shared, they
                    // come with a Web Layer whose parent is a layer called
                    // "Master Page Layer".  without this check, we wouldn't
                    // return any layers above that master web layer.
                if (this._ignoreWebLayers && this._dom.layers[i].layerType == "web" &&
                        parentLayerNum == -1) {
                    break;
                }

                var layer = this._layers[i] = new Layer({
                    index: i,
                    parent: this._layers[parentLayerNum] || this._root,
                    _dom: this._dom,
                    _frameIndex: this._frameIndex,
                    _tree: this
                });

                    // let the layer know where it is within its parent's sublayer list
                layer.sublayerIndex = layer.parent._sublayers.length;
                layer.parent._sublayers.push(layer);
            }
        },


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
            A `Layer` instance representing the top-most web layer.

            @type {Layer}
        */
        get webLayer()
        {
            if (this._ignoreWebLayers) {
                return [];
            } else {
                return this._root.sublayers[this._root.sublayers.length - 1];
            }
        },


        // ===================================================================
        /**
            An array of the `Layer` instances representing the web layers in
            the document.

            @type {[Layer]}
        */
        get webLayers()
        {
            if (this._ignoreWebLayers) {
                return [];
            } else {
                return this._layers.slice(this.webLayer.index);
            }
        },


        // ===================================================================
        /**
            The current `Layer` of the document.  Set this to the index or name
            of a layer, or to a `Layer` instance, to set the document's
            `currentLayerNum` value.

            @type {Layer}
        */
        get currentLayer()
        {
            return this._layers[this._dom.currentLayerNum];
        },
        set currentLayer(
            inIndex)
        {
            var newIndex = inIndex;

            if (typeof inIndex == "object" && "index" in inIndex) {
                newIndex = inIndex.index;
            } else if (typeof inIndex == "string") {
                newIndex = indexOfProperty(this._layers, "name", inIndex);
            }

            if (newIndex > -1 && newIndex < this._dom.layers.length) {
                this._dom.currentLayerNum = newIndex;
            }
        },


        // ===================================================================
        /**
            The top-level `Layer` object that contains the current layer of the
            document.  Set this to the index or name of a layer, or to a `Layer`
            instance, to set the document's `currentLayerNum` value to that
            layer's top-level ancestor.

            @type {Layer}
        */
        get currentTopLayer()
        {
            return this._layers[this._dom.currentLayerNum].topLayerAncestor;
        },
        set currentTopLayer(
            inIndex)
        {
            var newIndex = inIndex;

            if (typeof inIndex == "object" && "index" in inIndex) {
                newIndex = inIndex.index;
            } else if (typeof inIndex == "string") {
                newIndex = indexOfProperty(this._layers, "name", inIndex);
            }

            if (newIndex > -1 && newIndex < this._dom.layers.length) {
                this._dom.currentLayerNum = this._layers[newIndex].topLayerAncestor.index;
            }
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
        },


        // ===================================================================
        /**
            Returns a `Layer` instance that contains the element.

            Note that if you alt-drag an element to a different layer, and
            then pass that duplicate to this method to find the layer it's on,
            the wrong one may be returned.  That is because when the element is
            duplicated, both the original and the duplicate share a single
            `customData` object, and this method compares `customData` objects
            to try to find the element you pass in.

            @param {Object} inElement The element to look for in the current
                document's layers.
            @returns {Layer} A `Layer` instance that contains the element as an
                immediate child, or `undefined` if it can't be found.
        */
        getContainingLayer: function(
            inElement)
        {
            if (inElement && typeof inElement == "object") {
                var customData = inElement.customData;

                for (var i = 0, len = this._layers.length; i < len; i++) {
                    var layer = this._layers[i],
                        elements = layer.elements;

                    for (var j = 0, jlen = elements.length; j < jlen; j++) {
                        if (elements[j].customData == customData) {
                            return layer;
                        }
                    }
                }
            }
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
    };

    Layer.prototype = /** @lends module:layers.Layer.prototype */ {
        constructor: Layer,
        _dom: null,
        _tree: null,
        _sublayers: null,
        _frameIndex: 0,
        _elemsIndex: -1,
        _stale: false,

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

            Note that this index is from the bottom up, so the bottom-most
            sub-layer in a layer has a `sublayerIndex` of `0`.  This is the
            reverse order of the native `elemsandsublayers` array.

            @type Number
        */
        sublayerIndex: -1,


        // ===================================================================
        /**
            The underlying Fireworks layer object that's represented by this
            `Layer` instance.

            @type Fireworks Layer
            @readonly
        */
        get layer()
        {
            if (this._stale) {
                throw "Attempt to use a stale reference to layer: " + this.name;
            } else {
                return this._dom.layers[this.index];
            }
        },


        // ===================================================================
        /**
            The name of the layer.

            @type String
        */
        get name()
        {
            if (this.index > -1) {
                return this.layer.name;
            } else {
                return "[[ROOT]]";
            }
        },
        set name(
            inName)
        {
            if (this.index > -1) {
                this._dom.frames[this._frameIndex].layers[this.index].name = inName;
            }
        },


        // ===================================================================
        /**
            An array of the Fireworks elements on the layer.

            @type Array
            @readonly
        */
        get elements()
        {
            return this._dom.frames[this._frameIndex].layers[this.index].elements;
        },


        // ===================================================================
        /**
            An array of the Fireworks elements and sub-layers that are on the
            layer in the current state.

            Note that the sub-layers in this array are regular Fireworks layers,
            not `Layer` instances.  If you want to loop through a layer's
            `elemsandsublayers` array and access the `Layer` instance for each
            sub-layer you find, you'll need to manually access the sub-layers you
            find, like so:

                var toolbar = new LayerTree().layer("toolbar"),
                    elemsandsublayers = toolbar.elemsandsublayers,
                    sublayerIndex = 0;

                for (var i = 0; i < elemsandsublayers.length; i++) {
                    if (elemsandsublayers[i].layerType) {
                        // this is a layer object, so look up the corresponding
                        // Layer instance in the parent layer's sublayers array
                        toolbar.sublayers[sublayerIndex++] // ...
                    } else {
                        // do something with the regular element
                    }
                }

            @type Array
            @readonly
        */
        get elemsandsublayers()
        {
            return this._dom.frames[this._frameIndex].layers[this.index].elemsandsublayers;
        },


        // ===================================================================
        /**
            An array of the Fireworks elements and sub-layers that are on the
            layer in the current state.

            @type Array
            @readonly
        */
        get allElements()
        {
            function concatElements(
                inLayer)
            {
                elements = elements.concat(inLayer.elements);
                forEach(inLayer.sublayers, concatElements);
            }


            var elements = [];

            concatElements(this);

            return elements;
        },


        // ===================================================================
        /**
            An array of the layer's sub-layers, if any.  Only immediate
                sub-layers are returned.

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
            list of immediate sub-layers or by its name.  Note that the index
            is different than the sub-layer's corresponding index in its parent's
            `elemsandsublayers` array.

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
            Returns a `Layer` instance accessed by its index in the layer's
            `elemsandsublayers` array, which is different from the layer's
            `sublayerIndex`, since `elemsandsublayers` contains both layers and
            elements.  You would use this when walking a layer's
            `elemsandsublayers` array to access the `Layer` instance
            corresponding to a particular sub-layer in that array.

            @param {Number} inIndex The 0-based index of a sub-layer in its
                parent's `elemsandsublayers` array.
            @returns {Layer} A `Layer` instance representing the specified
                sub-layer, or `undefined` if it can't be found.
        */
        sublayerByElemsIndex: function(
            inIndex)
        {
            var elems = this.elemsandsublayers,
                sublayerIndex = 0;

            for (var i = 0, len = elems.length; i < len; i++) {
                if (elems[i].isLayer) {
                    if (i == inIndex) {
                        break;
                    } else {
                        sublayerIndex++;
                    }
                }
            }

                // sublayers are stored in _sublayers array in reverse order as
                // they're found in the elemsandsublayers array, since they're
                // pushed onto their parent's _sublayers array as they're found,
                // which means the lowest layer is found first.  so convert the
                // index we found to match this reversed order, which seemed
                // easier than changing everything to keep the _sublayers array
                // in the same order as elemsandsublayers.
            sublayerIndex = (this._sublayers.length - 1) - sublayerIndex;

            return findLayer(this._sublayers, sublayerIndex);
        },


        // ===================================================================
        /**
            The index of this layer in its parent's `elemsandsublayers` array,
            or the layer's `sublayerIndex` if it is a top layer.  The
            `elemsandsublayers` array is ordered from top to bottom, while the
            `sublayerIndex` is ordered from bottom to top.

            This index can be used to figure out which element or sub-layer is
            above or below a given `Layer` instance in its parent layer.

            Note that due to limitations in the Fireworks API, this value will
            be wrong if the sub-layer has a sibling with exactly the same name
            and number of elements and sub-layers.

            @type Number
        */
        get elemsIndex()
        {
            if (this._elemsIndex == -1) {
                if (this.isTopLayer) {
                    this._elemsIndex = this.sublayerIndex;
                } else {
                        // for some reason, simply accessing javascriptString
                        // causes the script to throw an exception after it
                        // finishes, not during execution, even though accessing
                        // it in a simple script doesn't cause a problem.  seems
                        // to be because we're accessing it in an AMD module.
                        // calling toSource() causes the same problem.  so fall
                        // back to checking element names and the length of
                        // elemsandsublayers, which will fail if two sibling
                        // layers have the same names and number of elements.
                    var parentElems = this.parent.elemsandsublayers,
                        elemsCount = this.elemsandsublayers.length;

                    forEach(parentElems, function(element, i) {
                            // the layer objects returned in elemsandsublayers
                            // don't themselves include an elemsandsublayers
                            // property, so we have to access them via their
                            // frames array to get to it.  but, because the
                            // layers API is a giant kludge, it seems that
                            // sublayers have a frames array just one item long,
                            // since the sublayers don't cross frames.  so even
                            // though this tree might not be on frame 0, since
                            // we're dealing with a sublayer here, we need to
                            // access frames[0].  ffs.
                        if (element.name == this.name && element.isLayer &&
                                element.frames[0].elemsandsublayers.length == elemsCount) {
                            this._elemsIndex = i;
                            return false;
                        }
                    }, this);
                }
            }

            return this._elemsIndex;
        },


        // ===================================================================
        /**
            Whether the layer is visible in the document.

            @type Boolean
        */
        get visible()
        {
            if (this.index == -1) {
                return false;
            } else {
                return this._dom.frames[this._frameIndex].layers[this.index].visible;
            }
        },
        set visible(
            inVisible)
        {
            if (this.index > -1) {
                    // we have to use dom.setLayerVisible, since changing the
                    // property directly throws an error
                this._dom.setLayerVisible(this.index, this._frameIndex, inVisible, false);
            }
        },


        // ===================================================================
        /**
            Whether the layer is locked in the *Layers* panel.

            @type Boolean
        */
        get locked()
        {
            if (this.index == -1) {
                return false;
            } else {
                return this._dom.frames[this._frameIndex].layers[this.index].locked;
            }
        },
        set locked(
            inLocked)
        {
            if (this.index > -1) {
                    // we have to use dom.setLayerLocked, since changing the
                    // property directly throws an error
                this._dom.setLayerLocked(this.index, this._frameIndex, inLocked, false);
            }
        },


        // ===================================================================
        /**
            Whether the disclosure triangle for the layer in the *Layers* panel
            is open or closed

            @type Boolean
        */
        get disclosure()
        {
            if (this.index == -1) {
                return false;
            } else {
                return this.layer.disclosure;
            }
        },
        set disclosure(
            inOpen)
        {
            if (this.index > -1) {
                    // we have to use dom.setLayerDisclosure, since changing the
                    // property directly throws an error
                this._dom.setLayerDisclosure(this.index, inOpen);
            }
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
            Whether the layer is a web layer.

            @type Boolean
            @readonly
        */
        get isWebLayer()
        {
            return this.layer.layerType == "web";
        },


        // ===================================================================
        /**
            The top-level `Layer` that contains this layer.  If this layer is
            at the top level, then the same layer is returned.

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
        /**
            Removes the layer from the document.  This has the side effect of
            causing all the other `Layer` instances in the `LayerTree` to go
            "stale", since deleting a layer may cause the other layers in the
            document to shift their index.  Accessing the properties on a stale
            `Layer` instance will throw an exception.
        */
        remove: function()
        {
            this._dom.deleteLayer(this.index);

                // tell our tree to refresh, which will set the stale flag on
                // all the layer instances
            this._tree.refresh();
        },


        // ===================================================================
        /**
            Deletes the immediate child elements on the layer in this state.
        */
        deleteElements: function()
        {
            fw.selection = this.elements;
            this._dom.deleteSelection(false);
        },


        // ===================================================================
        /**
            Deletes all of the child elements on this layer in this state,
            including all of the children on all of its sub-layers.
        */
        deleteAllElements: function()
        {
            fw.selection = this.allElements;
            this._dom.deleteSelection(false);
        },


        // ===================================================================
        /**
            Selects all of the child elements on the layer in this state, including
            all of the children on all of its sub-layers.  This is unlike calling
            `dom.selectAllOnLayer()`, which selects only the layer's immediate
            elements, not any elements on any of its sub-layers.
        */
        selectAllElements: function()
        {
            fw.selection = this.allElements;
        },


        // ===================================================================
        /**
            Hides or shows a given element in the layer.  This method works
            around the bug in `dom.setElementVisible()`, which indexes the layer
            elements in reverse order compared to the `dom.layers[0].frames[0].elements`
            array.

            @param {Number} inIndex The index of the element whose visible state
                you want to change.  This is the index of the element in the
                layer's `elements` array.
            @param {Boolean} inVisible The value to set the visible state to.
        */
        setElementVisible: function(
            inIndex,
            inVisible)
        {
            var maxElementIndex = this.elements.length - 1;

                // dom.setElementVisible indexes the layer elements from bottom
                // to top, which is the opposite of the order of objects in the
                // elements array.  so convert from the elements index to the
                // one for setElementVisible.
            this._dom.setElementVisible(this._frameIndex, this.index,
                maxElementIndex - inIndex, inVisible, false, false);
        },


        // ===================================================================
        /**
            Locks or unlocks a given element in the layer.  This method works
            around the bug in `dom.setElementLocked()`, which indexes the layer
            elements in reverse order compared to the `dom.layers[0].frames[0].elements`
            array.

            @param {Number} inIndex The index of the element whose locked state
                you want to change.  This is the index of the element in the
                layer's `elements` array.
            @param {Boolean} inLocked The value to set the locked state to.
        */
        setElementLocked: function(
            inIndex,
            inLocked)
        {
            var maxElementIndex = this.elements.length - 1;

                // dom.setElementLocked indexes the layer elements from bottom
                // to top, which is the opposite of the order of objects in the
                // elements array.  so convert from the elements index to the
                // one for setElementLocked.
            this._dom.setElementLocked(this._frameIndex, this.index,
                maxElementIndex - inIndex, inLocked, false, false);
        },


        // ===================================================================
        toString: function()
        {
            return ["[", this.name, " - layer: ", this.index, ", sublayer: ",
                this.sublayerIndex, "]"].join("");
        }
    };


    // =======================================================================
    /**
        Copies the elements on a layer from one document to another.  This
        method is provisional and may not work in all cases.

        @param {Layer} inLayer The `Layer` instance to copy.
        @param {DOM} inTargetDom The document to copy the layer's elements to.
        @param {DOM} [inSourceDom=currentDOM] The document to copy the layer's
            elements from.  If this isn't included, the current document is
            used as the source.
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
    };


    // =======================================================================
    /**
        Copies the elements on a layer from one page to another in the same
        document.  This method is provisional and may not work in all cases.

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
    };


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

        return findLayer(inDom.layers, inLayerName);
    };


    // =======================================================================
    /**
        Returns the index of the top-level layer that contains the layer
        specified by `inLayerIndex`.

        @param {Number} inLayerIndex A layer index.
        @param {DOM} [inDom=currentDOM] The document to look in to find the
            layer.  This defaults to the current document if not specified.
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
    };


    // =======================================================================
    /**
        Returns an array of the indexes that correspond to the top-level layers
        in the document.

        @param {DOM} [inDom=currentDOM] The document containing the layers, or
            the current document if not specified.
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
    };


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

        @param {DOM} [inDom=currentDOM] The document whose layers should be
            shown.  This defaults to the current document if not specified.
        @param {Boolean} [inJustReturnOutput=false] Pass true to suppress the
            `alert()` dialog and just return the layer structure as a string.
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
            output += getLayerText(layers[i], "");
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
            var output = inIndent + inLayer.index + ": " + inLayer.name + "\n",
                sublayers = inLayer.sublayers.reverse();

            for (var j = 0; j < sublayers.length; j++) {
                output += getLayerText(sublayers[j], inIndent + "    ");
            }

            return output;
        }
    };


    return layers;
});
