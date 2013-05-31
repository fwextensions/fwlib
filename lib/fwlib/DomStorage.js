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
],
/**
    The `fwlib/DomStorage` module provides a class that makes it easy to save
    and restore arbitrary JS data in the `dom.pngText` object in Fireworks
    documents.

    @exports DomStorage
    @requires dojo/json
*/
function(
    JSON)
{
    // =======================================================================
    /**
        Constructor for a `DomStorage` object that can be saved to a Fireworks
        document's `dom.pngText` storage area.  Any properties added to the
        object will be saved when you call its `save()` method.  To recover the
        stored data, instantiate a new object with the same name that was
        originally used to save the preference:

            require(["fwlib/DomStorage"], function(DomStorage) {
                var settings = new DomStorage("MySettings", { foo: 42 });
                alert(settings.foo); // 42
                settings.foo = "bar";
                settings.baz = "hello, world";
                settings.save();
                var newSettings = new DomStorage("MySettings", { foo: 42 });
                alert(newSettings.foo); // "bar"
                alert(newSettings.baz); // "hello, world"
            });

        The data is saved with the document itself, rather than in an external
        file, which ensures that it's always available if the user distributes
        the file to someone else.

        The advantage to using the `DomStorage` class over accessing the
        `dom.pngText` property directly is that the latter supports only string
        values.  So if you do:

            dom.pngText.foo = [1, 2, 3];

        and then save the file, the next time you reopen it, the array value
        will have been turned into the source string version of that value:
        `"[1,2,3]"`.  Even more confusing, `dom.pngText.foo` will appear to still
        be an array after you set it.  It's only after the document is saved,
        closed and reopened do you discover it's been converted into a string.

        And to make matters worse, each property on `dom.pngText` is limited to
        1023 characters.  So if you think you can just stringify some data and
        store it, think again.  It will get cut off if it's too long.

        The `DomStorage` class works around these limitations by converting the
        data to JSON, chunking up the JSON into strings of 1023 characters,
        storing each one, and keeping track of how many chunks there are.  If the
        name of your object is `"foo"`, then the number of string chunks it
        contains is stored in `dom.pngText.foo`.  The first chunk is
        `dom.pngText.foo_0`, the second is `dom.pngText.foo_1`, and so on.

        When you later instantiate the `DomStorage` object again, the constructor
        grabs all of the related strings that are stored in `dom.pngText`, joins
        them, and evals that.  The resulting properties are then copied onto the
        instance.

        One limitation of `dom.pngText` is that once a property has been added to
        it, there is no way to remove it.  So when you call `remove()` on an
        instance, the best it can do is go through all of the properties it had
        previously used and set them to `""`.  The same thing happens when an
        instance is saved and its JSON is shorter than it was previously.

        Note that the data is stored on the `dom.pngText` of the first page in
        the document, as each page in a document has its own copy of the property.
        If the user deletes the first page, the data will be lost.  If the user
        moves the first page to a different location, the saved data won't be
        found by default, but you can pass `true` as the third argument to the
        `DomStorage` constructor to force it to check all the pages

        Also note that the properties `save` and `remove` are reserved and cannot
        be modified on a `DomStorage` instance.

        @param {String} inName The name of the preference.
        @param {Object} [inDefaultData=null] An optional object containing default
            properties that will be added to the instance.
        @param {Boolean} [inCheckAllPages=false] Pass `true` to check all the
            pages in the document if a previously saved `DomStorage` is not
            found on the first page, and copy the first one found back to the
            first page.
        @returns {Object} A `DomStorage` instance with all of the properties
            of the previously stored instance, if any.
        @constructor
    */
    function DomStorage(
        inName,
        inDefaultData,
        inCheckAllPages)
    {
        // ===================================================================
        /**
            Saves all non-method properties of the `DomStorage` instance as a
            JSON string and stores the strings as one or more properties on the
            `dom.pngText` object of the document's first page.

            @param {Boolean} [inDontDirtyDocument=false] Pass true to prevent the
                `DomStorage` instance from dirtying the document.  By default,
                calling `save()` will leave the document in a dirty state, so
                that the user knows there's an unsaved change.  Setting
                `dom.pngText` doesn't normally dirty the document.
            @memberof module:DomStorage~DomStorage#
        */
        function save(
            inDontDirtyDocument)
        {
            var dataString = JSON.stringify(this),
                pngText = getPngText(),
                chunkCount = 0;

            for (var i = 0, len = dataString.length; i < len; i += k.ChunkSize) {
                    // chunkCount hasn't been incremented for this chunk yet,
                    // so the chunkName will be 0-based, e.g., Edge_0
                pngText[_metadata.name + "_" + chunkCount] =
                    dataString.substr(i, k.ChunkSize);

                chunkCount++;
            }

            if (_metadata.chunkCount > chunkCount) {
                    // we had previously used more chunks to store this object,
                    // so remove the extra ones.  unfortunately, delete doesn't
                    // work on dom.pngText, so all we can do is set the unused
                    // chunk to an empty string.
                for (i = chunkCount, len = _metadata.chunkCount; i < len; i++) {
                    pngText[_metadata.name + "_" + i] = "";
                }
            }

                // store the chunk count so we'll know how many chunks to
                // retrieve when we're next instantiated
            _metadata.chunkCount = chunkCount;

                // our metadata is what's actually stored in dom.pngText[inName]
            pngText[_metadata.name] = JSON.stringify(_metadata);

            if (!inDontDirtyDocument) {
                fw.getDocumentDOM().isDirty = true;
            }
        }


        // ===================================================================
        /**
            Sets all of the `dom.pngText` properties used by the instance to
            `""`, since there is no way to completely remove a property from it.

            @memberof module:DomStorage~DomStorage#
        */
        function remove()
        {
            var pngText = getPngText();

                // only set the pngText if the metadata actually already exists,
                // since the caller could create a new DomStorage and then
                // call remove() without first calling save()
            if (pngText[_metadata.name]) {
                for (var i = 0, len = _metadata.chunkCount; i < len; i++) {
                    pngText[_metadata.name + "_" + i] = "";
                }

                pngText[_metadata.name] = "";
            }
        }


        // ===================================================================
        function copyFromOtherPage()
        {
            var	dom = fw.getDocumentDOM(),
                pageSetter = dom.getPageSetter(),
                originalPageNum = dom.currentPageNum,
                firstPngText,
                pngText,
                metadataString,
                metadata,
                chunkName;

            pageSetter.pageNum = 0;
            firstPngText = fw.getDocumentDOM().pngText;

            for (var i = 1, len = dom.pagesCount; i < len; i++) {
                pageSetter.pageNum = i;
                pngText = fw.getDocumentDOM().pngText;
                metadataString = pngText[inName];

                if (metadataString) {
                    try {
                        metadata = JSON.parse(metadataString);
                        firstPngText[inName] = metadataString;
                        pngText[inName] = undefined;

                            // copy each chunk to the first page and clear the
                            // chunk on this page
                        for (var j = 0, jlen = metadata.chunkCount; j < jlen; j++) {
                            chunkName = inName + "_" + j;
                            firstPngText[chunkName] = pngText[chunkName];
                            pngText[chunkName] = undefined;
                        }

                        break;
                    } catch (exception) {
                        // ignore any exceptions
                    }
                }
            }

            pageSetter.pageNum = originalPageNum;
        }


        // ===================================================================
        function getPngText()
        {
            var	dom = fw.getDocumentDOM(),
                pageSetter = dom.getPageSetter(),
                currentPageNum = dom.currentPageNum,
                pngText;

                // get the pngText from the first page, regardless of what page
                // the user is currently on
            pageSetter.pageNum = 0;
            pngText = fw.getDocumentDOM().pngText;
            pageSetter.pageNum = currentPageNum;

            return pngText;
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


        if (!fw.documents.length) {
                // there are no docs open, so bail before trying to call
                // fw.getDocumentDOM(), which will throw an error if the doc is
                // currently being saved
            return null;
        }

        var k = {
                ChunkSize: 1023,
                ReservedNames: {
                    save: true,
                    remove: true
                }
            },
            _metadata = {
                name: inName,
                chunkCount: 1,
                version: arguments.callee.version
            };

        if (!inName || typeof inName != "string") {
            throw "DomStorage requires a string name as the first parameter.";
        }

            // define only getters for these methods, so that trying to assign
            // values to them will throw an error
        this.__defineGetter__("save", function() { return save; });
        this.__defineGetter__("remove", function() { return remove; });


        // ===================================================================
        (function() {
                // do the initialization in a function so we don't leave these
                // vars in the method closures
            if (inDefaultData && typeof inDefaultData == "object") {
                    // we need to copy the default data onto this before looking at
                    // pngText, which will overwrite it with the last saved values
                mixin(this, inDefaultData);
            }

                // now load	any previously saved data from the pngText on the first
                // page, since each page has its own
            var pngText = getPngText(),
                dataString = pngText[_metadata.name];

            if (!dataString && inCheckAllPages) {
                    // the data isn't on the first page, but the caller wants us
                    // to check all the pages, in case they got reordered
                copyFromOtherPage();
                dataString = pngText[_metadata.name];
            }

            if (dataString) {
                try {
                        // there was previously stored data for this element,
                        // so grab the metadata
                    var savedMetadata = JSON.parse(dataString),
                        chunks = [];

                    _metadata.chunkCount = savedMetadata.chunkCount;

                    for (var i = 0, len = _metadata.chunkCount; i < len; i++) {
                        chunks.push(pngText[_metadata.name + "_" + i]);
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
        }).apply(this); // make sure this function has access to this
    }


        // this version is saved with the metadata
    DomStorage.version = 1.0;


    return DomStorage;
});
