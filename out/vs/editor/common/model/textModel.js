var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define(["require", "exports", "vs/base/common/uri", "vs/base/common/event", "vs/editor/common/model", "vs/editor/common/modes", "vs/editor/common/model/editStack", "vs/editor/common/core/range", "vs/editor/common/core/selection", "vs/editor/common/model/textModelEvents", "vs/base/common/errors", "vs/base/common/strings", "vs/editor/common/model/intervalTree", "vs/base/common/lifecycle", "vs/base/common/stopwatch", "vs/editor/common/modes/nullMode", "vs/editor/common/modes/supports", "vs/editor/common/modes/supports/richEditBrackets", "vs/editor/common/core/position", "vs/editor/common/modes/languageConfigurationRegistry", "vs/editor/common/model/wordHelper", "vs/editor/common/model/textModelTokens", "vs/editor/common/model/indentationGuesser", "vs/editor/common/config/editorOptions", "vs/editor/common/model/textModelSearch", "vs/base/common/winjs.base", "vs/editor/common/model/linesTextBuffer/linesTextBufferBuilder", "vs/editor/common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder", "vs/editor/common/model/chunksTextBuffer/chunksTextBufferBuilder"], function (require, exports, uri_1, event_1, model, modes_1, editStack_1, range_1, selection_1, textModelEvents_1, errors_1, strings, intervalTree_1, lifecycle_1, stopwatch_1, nullMode_1, supports_1, richEditBrackets_1, position_1, languageConfigurationRegistry_1, wordHelper_1, textModelTokens_1, indentationGuesser_1, editorOptions_1, textModelSearch_1, winjs_base_1, linesTextBufferBuilder_1, pieceTreeTextBufferBuilder_1, chunksTextBufferBuilder_1) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    var TextBufferType;
    (function (TextBufferType) {
        TextBufferType[TextBufferType["LinesArray"] = 0] = "LinesArray";
        TextBufferType[TextBufferType["PieceTree"] = 1] = "PieceTree";
        TextBufferType[TextBufferType["Chunks"] = 2] = "Chunks";
    })(TextBufferType = exports.TextBufferType || (exports.TextBufferType = {}));
    // Here is the master switch for the text buffer implementation:
    exports.OPTIONS = {
        TEXT_BUFFER_IMPLEMENTATION: TextBufferType.PieceTree
    };
    function createTextBufferBuilder() {
        if (exports.OPTIONS.TEXT_BUFFER_IMPLEMENTATION === TextBufferType.PieceTree) {
            return new pieceTreeTextBufferBuilder_1.PieceTreeTextBufferBuilder();
        }
        if (exports.OPTIONS.TEXT_BUFFER_IMPLEMENTATION === TextBufferType.Chunks) {
            return new chunksTextBufferBuilder_1.ChunksTextBufferBuilder();
        }
        return new linesTextBufferBuilder_1.LinesTextBufferBuilder();
    }
    function createTextBufferFactory(text) {
        var builder = createTextBufferBuilder();
        builder.acceptChunk(text);
        return builder.finish();
    }
    exports.createTextBufferFactory = createTextBufferFactory;
    function createTextBufferFactoryFromStream(stream, filter) {
        return new winjs_base_1.TPromise(function (c, e, p) {
            var done = false;
            var builder = createTextBufferBuilder();
            stream.on('data', function (chunk) {
                if (filter) {
                    chunk = filter(chunk);
                }
                builder.acceptChunk(chunk);
            });
            stream.on('error', function (error) {
                if (!done) {
                    done = true;
                    e(error);
                }
            });
            stream.on('end', function () {
                if (!done) {
                    done = true;
                    c(builder.finish());
                }
            });
        });
    }
    exports.createTextBufferFactoryFromStream = createTextBufferFactoryFromStream;
    function createTextBufferFactoryFromSnapshot(snapshot) {
        var builder = createTextBufferBuilder();
        var chunk;
        while (typeof (chunk = snapshot.read()) === 'string') {
            builder.acceptChunk(chunk);
        }
        return builder.finish();
    }
    exports.createTextBufferFactoryFromSnapshot = createTextBufferFactoryFromSnapshot;
    function createTextBuffer(value, defaultEOL) {
        var factory = (typeof value === 'string' ? createTextBufferFactory(value) : value);
        return factory.create(defaultEOL);
    }
    exports.createTextBuffer = createTextBuffer;
    var MODEL_ID = 0;
    /**
     * Produces 'a'-'z', followed by 'A'-'Z'... followed by 'a'-'z', etc.
     */
    function singleLetter(result) {
        var LETTERS_CNT = (90 /* Z */ - 65 /* A */ + 1);
        result = result % (2 * LETTERS_CNT);
        if (result < LETTERS_CNT) {
            return String.fromCharCode(97 /* a */ + result);
        }
        return String.fromCharCode(65 /* A */ + result - LETTERS_CNT);
    }
    var LIMIT_FIND_COUNT = 999;
    exports.LONG_LINE_BOUNDARY = 10000;
    var TextModelSnapshot = /** @class */ (function () {
        function TextModelSnapshot(source) {
            this._source = source;
            this._eos = false;
        }
        TextModelSnapshot.prototype.read = function () {
            if (this._eos) {
                return null;
            }
            var result = [], resultCnt = 0, resultLength = 0;
            do {
                var tmp = this._source.read();
                if (tmp === null) {
                    // end-of-stream
                    this._eos = true;
                    if (resultCnt === 0) {
                        return null;
                    }
                    else {
                        return result.join('');
                    }
                }
                if (tmp.length > 0) {
                    result[resultCnt++] = tmp;
                    resultLength += tmp.length;
                }
                if (resultLength >= 64 * 1024) {
                    return result.join('');
                }
            } while (true);
        };
        return TextModelSnapshot;
    }());
    var TextModel = /** @class */ (function (_super) {
        __extends(TextModel, _super);
        //#endregion
        function TextModel(source, creationOptions, languageIdentifier, associatedResource) {
            if (associatedResource === void 0) { associatedResource = null; }
            var _this = _super.call(this) || this;
            //#region Events
            _this._onWillDispose = _this._register(new event_1.Emitter());
            _this.onWillDispose = _this._onWillDispose.event;
            _this._onDidChangeDecorations = _this._register(new DidChangeDecorationsEmitter());
            _this.onDidChangeDecorations = _this._onDidChangeDecorations.event;
            _this._onDidChangeLanguage = _this._register(new event_1.Emitter());
            _this.onDidChangeLanguage = _this._onDidChangeLanguage.event;
            _this._onDidChangeLanguageConfiguration = _this._register(new event_1.Emitter());
            _this.onDidChangeLanguageConfiguration = _this._onDidChangeLanguageConfiguration.event;
            _this._onDidChangeTokens = _this._register(new event_1.Emitter());
            _this.onDidChangeTokens = _this._onDidChangeTokens.event;
            _this._onDidChangeOptions = _this._register(new event_1.Emitter());
            _this.onDidChangeOptions = _this._onDidChangeOptions.event;
            _this._eventEmitter = _this._register(new DidChangeContentEmitter());
            // Generate a new unique model id
            MODEL_ID++;
            _this.id = '$model' + MODEL_ID;
            if (typeof associatedResource === 'undefined' || associatedResource === null) {
                _this._associatedResource = uri_1.default.parse('inmemory://model/' + MODEL_ID);
            }
            else {
                _this._associatedResource = associatedResource;
            }
            _this._attachedEditorCount = 0;
            _this._buffer = createTextBuffer(source, creationOptions.defaultEOL);
            _this._options = TextModel.resolveOptions(_this._buffer, creationOptions);
            var bufferLineCount = _this._buffer.getLineCount();
            var bufferTextLength = _this._buffer.getValueLengthInRange(new range_1.Range(1, 1, bufferLineCount, _this._buffer.getLineLength(bufferLineCount) + 1), model.EndOfLinePreference.TextDefined);
            // !!! Make a decision in the ctor and permanently respect this decision !!!
            // If a model is too large at construction time, it will never get tokenized,
            // under no circumstances.
            _this._isTooLargeForTokenization = ((bufferTextLength > TextModel.MODEL_TOKENIZATION_LIMIT)
                || (bufferLineCount > TextModel.MANY_MANY_LINES));
            _this._shouldSimplifyMode = (_this._isTooLargeForTokenization
                || (bufferTextLength > TextModel.MODEL_SYNC_LIMIT));
            _this._setVersionId(1);
            _this._isDisposed = false;
            _this._isDisposing = false;
            _this._languageIdentifier = languageIdentifier || nullMode_1.NULL_LANGUAGE_IDENTIFIER;
            _this._tokenizationListener = modes_1.TokenizationRegistry.onDidChange(function (e) {
                if (e.changedLanguages.indexOf(_this._languageIdentifier.language) === -1) {
                    return;
                }
                _this._resetTokenizationState();
                _this.emitModelTokensChangedEvent({
                    ranges: [{
                            fromLineNumber: 1,
                            toLineNumber: _this.getLineCount()
                        }]
                });
                if (_this._shouldAutoTokenize()) {
                    _this._warmUpTokens();
                }
            });
            _this._revalidateTokensTimeout = -1;
            _this._languageRegistryListener = languageConfigurationRegistry_1.LanguageConfigurationRegistry.onDidChange(function (e) {
                if (e.languageIdentifier.id === _this._languageIdentifier.id) {
                    _this._onDidChangeLanguageConfiguration.fire({});
                }
            });
            _this._resetTokenizationState();
            _this._instanceId = singleLetter(MODEL_ID);
            _this._lastDecorationId = 0;
            _this._decorations = Object.create(null);
            _this._decorationsTree = new DecorationsTrees();
            _this._commandManager = new editStack_1.EditStack(_this);
            _this._isUndoing = false;
            _this._isRedoing = false;
            _this._trimAutoWhitespaceLines = null;
            return _this;
        }
        TextModel.createFromString = function (text, options, languageIdentifier, uri) {
            if (options === void 0) { options = TextModel.DEFAULT_CREATION_OPTIONS; }
            if (languageIdentifier === void 0) { languageIdentifier = null; }
            if (uri === void 0) { uri = null; }
            return new TextModel(text, options, languageIdentifier, uri);
        };
        TextModel.resolveOptions = function (textBuffer, options) {
            if (options.detectIndentation) {
                var guessedIndentation = indentationGuesser_1.guessIndentation(textBuffer, options.tabSize, options.insertSpaces);
                return new model.TextModelResolvedOptions({
                    tabSize: guessedIndentation.tabSize,
                    insertSpaces: guessedIndentation.insertSpaces,
                    trimAutoWhitespace: options.trimAutoWhitespace,
                    defaultEOL: options.defaultEOL
                });
            }
            return new model.TextModelResolvedOptions({
                tabSize: options.tabSize,
                insertSpaces: options.insertSpaces,
                trimAutoWhitespace: options.trimAutoWhitespace,
                defaultEOL: options.defaultEOL
            });
        };
        TextModel.prototype.onDidChangeRawContent = function (listener) {
            return this._eventEmitter.event(function (e) { return listener(e.rawContentChangedEvent); });
        };
        TextModel.prototype.onDidChangeContent = function (listener) {
            return this._eventEmitter.event(function (e) { return listener(e.contentChangedEvent); });
        };
        TextModel.prototype.dispose = function () {
            this._isDisposing = true;
            this._onWillDispose.fire();
            this._commandManager = null;
            this._decorations = null;
            this._decorationsTree = null;
            this._tokenizationListener.dispose();
            this._languageRegistryListener.dispose();
            this._clearTimers();
            this._tokens = null;
            this._isDisposed = true;
            // Null out members, such that any use of a disposed model will throw exceptions sooner rather than later
            this._buffer = null;
            _super.prototype.dispose.call(this);
            this._isDisposing = false;
        };
        TextModel.prototype._assertNotDisposed = function () {
            if (this._isDisposed) {
                throw new Error('Model is disposed!');
            }
        };
        TextModel.prototype.equalsTextBuffer = function (other) {
            this._assertNotDisposed();
            return this._buffer.equals(other);
        };
        TextModel.prototype._emitContentChangedEvent = function (rawChange, change) {
            if (this._isDisposing) {
                // Do not confuse listeners by emitting any event after disposing
                return;
            }
            this._eventEmitter.fire(new textModelEvents_1.InternalModelContentChangeEvent(rawChange, change));
        };
        TextModel.prototype.setValue = function (value) {
            this._assertNotDisposed();
            if (value === null) {
                // There's nothing to do
                return;
            }
            var textBuffer = createTextBuffer(value, this._options.defaultEOL);
            this.setValueFromTextBuffer(textBuffer);
        };
        TextModel.prototype._createContentChanged2 = function (startLineNumber, startColumn, endLineNumber, endColumn, rangeLength, text, isUndoing, isRedoing, isFlush) {
            return {
                changes: [{
                        range: new range_1.Range(startLineNumber, startColumn, endLineNumber, endColumn),
                        rangeLength: rangeLength,
                        text: text,
                    }],
                eol: this._buffer.getEOL(),
                versionId: this.getVersionId(),
                isUndoing: isUndoing,
                isRedoing: isRedoing,
                isFlush: isFlush
            };
        };
        TextModel.prototype.setValueFromTextBuffer = function (textBuffer) {
            this._assertNotDisposed();
            if (textBuffer === null) {
                // There's nothing to do
                return;
            }
            var oldFullModelRange = this.getFullModelRange();
            var oldModelValueLength = this.getValueLengthInRange(oldFullModelRange);
            var endLineNumber = this.getLineCount();
            var endColumn = this.getLineMaxColumn(endLineNumber);
            this._buffer = textBuffer;
            this._increaseVersionId();
            // Cancel tokenization, clear all tokens and begin tokenizing
            this._resetTokenizationState();
            // Destroy all my decorations
            this._decorations = Object.create(null);
            this._decorationsTree = new DecorationsTrees();
            // Destroy my edit history and settings
            this._commandManager = new editStack_1.EditStack(this);
            this._trimAutoWhitespaceLines = null;
            this._emitContentChangedEvent(new textModelEvents_1.ModelRawContentChangedEvent([
                new textModelEvents_1.ModelRawFlush()
            ], this._versionId, false, false), this._createContentChanged2(1, 1, endLineNumber, endColumn, oldModelValueLength, this.getValue(), false, false, true));
        };
        TextModel.prototype.setEOL = function (eol) {
            this._assertNotDisposed();
            var newEOL = (eol === model.EndOfLineSequence.CRLF ? '\r\n' : '\n');
            if (this._buffer.getEOL() === newEOL) {
                // Nothing to do
                return;
            }
            var oldFullModelRange = this.getFullModelRange();
            var oldModelValueLength = this.getValueLengthInRange(oldFullModelRange);
            var endLineNumber = this.getLineCount();
            var endColumn = this.getLineMaxColumn(endLineNumber);
            this._onBeforeEOLChange();
            this._buffer.setEOL(newEOL);
            this._increaseVersionId();
            this._onAfterEOLChange();
            this._emitContentChangedEvent(new textModelEvents_1.ModelRawContentChangedEvent([
                new textModelEvents_1.ModelRawEOLChanged()
            ], this._versionId, false, false), this._createContentChanged2(1, 1, endLineNumber, endColumn, oldModelValueLength, this.getValue(), false, false, false));
        };
        TextModel.prototype._onBeforeEOLChange = function () {
            // Ensure all decorations get their `range` set.
            var versionId = this.getVersionId();
            var allDecorations = this._decorationsTree.search(0, false, false, versionId);
            this._ensureNodesHaveRanges(allDecorations);
        };
        TextModel.prototype._onAfterEOLChange = function () {
            // Transform back `range` to offsets
            var versionId = this.getVersionId();
            var allDecorations = this._decorationsTree.collectNodesPostOrder();
            for (var i = 0, len = allDecorations.length; i < len; i++) {
                var node = allDecorations[i];
                var delta = node.cachedAbsoluteStart - node.start;
                var startOffset = this._buffer.getOffsetAt(node.range.startLineNumber, node.range.startColumn);
                var endOffset = this._buffer.getOffsetAt(node.range.endLineNumber, node.range.endColumn);
                node.cachedAbsoluteStart = startOffset;
                node.cachedAbsoluteEnd = endOffset;
                node.cachedVersionId = versionId;
                node.start = startOffset - delta;
                node.end = endOffset - delta;
                intervalTree_1.recomputeMaxEnd(node);
            }
        };
        TextModel.prototype._resetTokenizationState = function () {
            this._clearTimers();
            var tokenizationSupport = (this._isTooLargeForTokenization
                ? null
                : modes_1.TokenizationRegistry.get(this._languageIdentifier.language));
            this._tokens = new textModelTokens_1.ModelLinesTokens(this._languageIdentifier, tokenizationSupport);
            this._beginBackgroundTokenization();
        };
        TextModel.prototype._clearTimers = function () {
            if (this._revalidateTokensTimeout !== -1) {
                clearTimeout(this._revalidateTokensTimeout);
                this._revalidateTokensTimeout = -1;
            }
        };
        TextModel.prototype.onBeforeAttached = function () {
            this._attachedEditorCount++;
            // Warm up tokens for the editor
            this._warmUpTokens();
        };
        TextModel.prototype.onBeforeDetached = function () {
            this._attachedEditorCount--;
        };
        TextModel.prototype._shouldAutoTokenize = function () {
            return this.isAttachedToEditor();
        };
        TextModel.prototype.isAttachedToEditor = function () {
            return this._attachedEditorCount > 0;
        };
        TextModel.prototype.isTooLargeForHavingARichMode = function () {
            return this._shouldSimplifyMode;
        };
        TextModel.prototype.isTooLargeForTokenization = function () {
            return this._isTooLargeForTokenization;
        };
        TextModel.prototype.isDisposed = function () {
            return this._isDisposed;
        };
        TextModel.prototype.isDominatedByLongLines = function () {
            this._assertNotDisposed();
            if (this.isTooLargeForTokenization()) {
                // Cannot word wrap huge files anyways, so it doesn't really matter
                return false;
            }
            var smallLineCharCount = 0;
            var longLineCharCount = 0;
            var lineCount = this._buffer.getLineCount();
            for (var lineNumber = 1; lineNumber <= lineCount; lineNumber++) {
                var lineLength = this._buffer.getLineLength(lineNumber);
                if (lineLength >= exports.LONG_LINE_BOUNDARY) {
                    longLineCharCount += lineLength;
                }
                else {
                    smallLineCharCount += lineLength;
                }
            }
            return (longLineCharCount > smallLineCharCount);
        };
        Object.defineProperty(TextModel.prototype, "uri", {
            get: function () {
                return this._associatedResource;
            },
            enumerable: true,
            configurable: true
        });
        //#region Options
        TextModel.prototype.getOptions = function () {
            this._assertNotDisposed();
            return this._options;
        };
        TextModel.prototype.updateOptions = function (_newOpts) {
            this._assertNotDisposed();
            var tabSize = (typeof _newOpts.tabSize !== 'undefined') ? _newOpts.tabSize : this._options.tabSize;
            var insertSpaces = (typeof _newOpts.insertSpaces !== 'undefined') ? _newOpts.insertSpaces : this._options.insertSpaces;
            var trimAutoWhitespace = (typeof _newOpts.trimAutoWhitespace !== 'undefined') ? _newOpts.trimAutoWhitespace : this._options.trimAutoWhitespace;
            var newOpts = new model.TextModelResolvedOptions({
                tabSize: tabSize,
                insertSpaces: insertSpaces,
                defaultEOL: this._options.defaultEOL,
                trimAutoWhitespace: trimAutoWhitespace
            });
            if (this._options.equals(newOpts)) {
                return;
            }
            var e = this._options.createChangeEvent(newOpts);
            this._options = newOpts;
            this._onDidChangeOptions.fire(e);
        };
        TextModel.prototype.detectIndentation = function (defaultInsertSpaces, defaultTabSize) {
            this._assertNotDisposed();
            var guessedIndentation = indentationGuesser_1.guessIndentation(this._buffer, defaultTabSize, defaultInsertSpaces);
            this.updateOptions({
                insertSpaces: guessedIndentation.insertSpaces,
                tabSize: guessedIndentation.tabSize
            });
        };
        TextModel._normalizeIndentationFromWhitespace = function (str, tabSize, insertSpaces) {
            var spacesCnt = 0;
            for (var i = 0; i < str.length; i++) {
                if (str.charAt(i) === '\t') {
                    spacesCnt += tabSize;
                }
                else {
                    spacesCnt++;
                }
            }
            var result = '';
            if (!insertSpaces) {
                var tabsCnt = Math.floor(spacesCnt / tabSize);
                spacesCnt = spacesCnt % tabSize;
                for (var i = 0; i < tabsCnt; i++) {
                    result += '\t';
                }
            }
            for (var i = 0; i < spacesCnt; i++) {
                result += ' ';
            }
            return result;
        };
        TextModel.normalizeIndentation = function (str, tabSize, insertSpaces) {
            var firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(str);
            if (firstNonWhitespaceIndex === -1) {
                firstNonWhitespaceIndex = str.length;
            }
            return TextModel._normalizeIndentationFromWhitespace(str.substring(0, firstNonWhitespaceIndex), tabSize, insertSpaces) + str.substring(firstNonWhitespaceIndex);
        };
        TextModel.prototype.normalizeIndentation = function (str) {
            this._assertNotDisposed();
            return TextModel.normalizeIndentation(str, this._options.tabSize, this._options.insertSpaces);
        };
        TextModel.prototype.getOneIndent = function () {
            this._assertNotDisposed();
            var tabSize = this._options.tabSize;
            var insertSpaces = this._options.insertSpaces;
            if (insertSpaces) {
                var result = '';
                for (var i = 0; i < tabSize; i++) {
                    result += ' ';
                }
                return result;
            }
            else {
                return '\t';
            }
        };
        //#endregion
        //#region Reading
        TextModel.prototype.getVersionId = function () {
            this._assertNotDisposed();
            return this._versionId;
        };
        TextModel.prototype.mightContainRTL = function () {
            return this._buffer.mightContainRTL();
        };
        TextModel.prototype.mightContainNonBasicASCII = function () {
            return this._buffer.mightContainNonBasicASCII();
        };
        TextModel.prototype.getAlternativeVersionId = function () {
            this._assertNotDisposed();
            return this._alternativeVersionId;
        };
        TextModel.prototype.getOffsetAt = function (rawPosition) {
            this._assertNotDisposed();
            var position = this._validatePosition(rawPosition.lineNumber, rawPosition.column, false);
            return this._buffer.getOffsetAt(position.lineNumber, position.column);
        };
        TextModel.prototype.getPositionAt = function (rawOffset) {
            this._assertNotDisposed();
            var offset = (Math.min(this._buffer.getLength(), Math.max(0, rawOffset)));
            return this._buffer.getPositionAt(offset);
        };
        TextModel.prototype._increaseVersionId = function () {
            this._setVersionId(this._versionId + 1);
        };
        TextModel.prototype._setVersionId = function (newVersionId) {
            this._versionId = newVersionId;
            this._alternativeVersionId = this._versionId;
        };
        TextModel.prototype._overwriteAlternativeVersionId = function (newAlternativeVersionId) {
            this._alternativeVersionId = newAlternativeVersionId;
        };
        TextModel.prototype.getValue = function (eol, preserveBOM) {
            if (preserveBOM === void 0) { preserveBOM = false; }
            this._assertNotDisposed();
            var fullModelRange = this.getFullModelRange();
            var fullModelValue = this.getValueInRange(fullModelRange, eol);
            if (preserveBOM) {
                return this._buffer.getBOM() + fullModelValue;
            }
            return fullModelValue;
        };
        TextModel.prototype.createSnapshot = function (preserveBOM) {
            if (preserveBOM === void 0) { preserveBOM = false; }
            return new TextModelSnapshot(this._buffer.createSnapshot(preserveBOM));
        };
        TextModel.prototype.getValueLength = function (eol, preserveBOM) {
            if (preserveBOM === void 0) { preserveBOM = false; }
            this._assertNotDisposed();
            var fullModelRange = this.getFullModelRange();
            var fullModelValue = this.getValueLengthInRange(fullModelRange, eol);
            if (preserveBOM) {
                return this._buffer.getBOM().length + fullModelValue;
            }
            return fullModelValue;
        };
        TextModel.prototype.getValueInRange = function (rawRange, eol) {
            if (eol === void 0) { eol = model.EndOfLinePreference.TextDefined; }
            this._assertNotDisposed();
            return this._buffer.getValueInRange(this.validateRange(rawRange), eol);
        };
        TextModel.prototype.getValueLengthInRange = function (rawRange, eol) {
            if (eol === void 0) { eol = model.EndOfLinePreference.TextDefined; }
            this._assertNotDisposed();
            return this._buffer.getValueLengthInRange(this.validateRange(rawRange), eol);
        };
        TextModel.prototype.getLineCount = function () {
            this._assertNotDisposed();
            return this._buffer.getLineCount();
        };
        TextModel.prototype.getLineContent = function (lineNumber) {
            this._assertNotDisposed();
            if (lineNumber < 1 || lineNumber > this.getLineCount()) {
                throw new Error('Illegal value for lineNumber');
            }
            return this._buffer.getLineContent(lineNumber);
        };
        TextModel.prototype.getLinesContent = function () {
            this._assertNotDisposed();
            return this._buffer.getLinesContent();
        };
        TextModel.prototype.getEOL = function () {
            this._assertNotDisposed();
            return this._buffer.getEOL();
        };
        TextModel.prototype.getLineMinColumn = function (lineNumber) {
            this._assertNotDisposed();
            return 1;
        };
        TextModel.prototype.getLineMaxColumn = function (lineNumber) {
            this._assertNotDisposed();
            if (lineNumber < 1 || lineNumber > this.getLineCount()) {
                throw new Error('Illegal value for lineNumber');
            }
            return this._buffer.getLineLength(lineNumber) + 1;
        };
        TextModel.prototype.getLineFirstNonWhitespaceColumn = function (lineNumber) {
            this._assertNotDisposed();
            if (lineNumber < 1 || lineNumber > this.getLineCount()) {
                throw new Error('Illegal value for lineNumber');
            }
            return this._buffer.getLineFirstNonWhitespaceColumn(lineNumber);
        };
        TextModel.prototype.getLineLastNonWhitespaceColumn = function (lineNumber) {
            this._assertNotDisposed();
            if (lineNumber < 1 || lineNumber > this.getLineCount()) {
                throw new Error('Illegal value for lineNumber');
            }
            return this._buffer.getLineLastNonWhitespaceColumn(lineNumber);
        };
        /**
         * Validates `range` is within buffer bounds, but allows it to sit in between surrogate pairs, etc.
         * Will try to not allocate if possible.
         */
        TextModel.prototype._validateRangeRelaxedNoAllocations = function (range) {
            var linesCount = this._buffer.getLineCount();
            var initialStartLineNumber = range.startLineNumber;
            var initialStartColumn = range.startColumn;
            var startLineNumber;
            var startColumn;
            if (initialStartLineNumber < 1) {
                startLineNumber = 1;
                startColumn = 1;
            }
            else if (initialStartLineNumber > linesCount) {
                startLineNumber = linesCount;
                startColumn = this.getLineMaxColumn(startLineNumber);
            }
            else {
                startLineNumber = initialStartLineNumber | 0;
                if (initialStartColumn <= 1) {
                    startColumn = 1;
                }
                else {
                    var maxColumn = this.getLineMaxColumn(startLineNumber);
                    if (initialStartColumn >= maxColumn) {
                        startColumn = maxColumn;
                    }
                    else {
                        startColumn = initialStartColumn | 0;
                    }
                }
            }
            var initialEndLineNumber = range.endLineNumber;
            var initialEndColumn = range.endColumn;
            var endLineNumber;
            var endColumn;
            if (initialEndLineNumber < 1) {
                endLineNumber = 1;
                endColumn = 1;
            }
            else if (initialEndLineNumber > linesCount) {
                endLineNumber = linesCount;
                endColumn = this.getLineMaxColumn(endLineNumber);
            }
            else {
                endLineNumber = initialEndLineNumber | 0;
                if (initialEndColumn <= 1) {
                    endColumn = 1;
                }
                else {
                    var maxColumn = this.getLineMaxColumn(endLineNumber);
                    if (initialEndColumn >= maxColumn) {
                        endColumn = maxColumn;
                    }
                    else {
                        endColumn = initialEndColumn | 0;
                    }
                }
            }
            if (initialStartLineNumber === startLineNumber
                && initialStartColumn === startColumn
                && initialEndLineNumber === endLineNumber
                && initialEndColumn === endColumn
                && range instanceof range_1.Range
                && !(range instanceof selection_1.Selection)) {
                return range;
            }
            return new range_1.Range(startLineNumber, startColumn, endLineNumber, endColumn);
        };
        /**
         * @param strict Do NOT allow a position inside a high-low surrogate pair
         */
        TextModel.prototype._validatePosition = function (_lineNumber, _column, strict) {
            var lineNumber = Math.floor(typeof _lineNumber === 'number' ? _lineNumber : 1);
            var column = Math.floor(typeof _column === 'number' ? _column : 1);
            var lineCount = this._buffer.getLineCount();
            if (lineNumber < 1) {
                return new position_1.Position(1, 1);
            }
            if (lineNumber > lineCount) {
                return new position_1.Position(lineCount, this.getLineMaxColumn(lineCount));
            }
            if (column <= 1) {
                return new position_1.Position(lineNumber, 1);
            }
            var maxColumn = this.getLineMaxColumn(lineNumber);
            if (column >= maxColumn) {
                return new position_1.Position(lineNumber, maxColumn);
            }
            if (strict) {
                // If the position would end up in the middle of a high-low surrogate pair,
                // we move it to before the pair
                // !!At this point, column > 1
                var charCodeBefore = this._buffer.getLineCharCode(lineNumber, column - 2);
                if (strings.isHighSurrogate(charCodeBefore)) {
                    return new position_1.Position(lineNumber, column - 1);
                }
            }
            return new position_1.Position(lineNumber, column);
        };
        TextModel.prototype.validatePosition = function (position) {
            this._assertNotDisposed();
            return this._validatePosition(position.lineNumber, position.column, true);
        };
        TextModel.prototype.validateRange = function (_range) {
            this._assertNotDisposed();
            var start = this._validatePosition(_range.startLineNumber, _range.startColumn, false);
            var end = this._validatePosition(_range.endLineNumber, _range.endColumn, false);
            var startLineNumber = start.lineNumber;
            var startColumn = start.column;
            var endLineNumber = end.lineNumber;
            var endColumn = end.column;
            var charCodeBeforeStart = (startColumn > 1 ? this._buffer.getLineCharCode(startLineNumber, startColumn - 2) : 0);
            var charCodeBeforeEnd = (endColumn > 1 && endColumn <= this._buffer.getLineLength(endLineNumber) ? this._buffer.getLineCharCode(endLineNumber, endColumn - 2) : 0);
            var startInsideSurrogatePair = strings.isHighSurrogate(charCodeBeforeStart);
            var endInsideSurrogatePair = strings.isHighSurrogate(charCodeBeforeEnd);
            if (!startInsideSurrogatePair && !endInsideSurrogatePair) {
                return new range_1.Range(startLineNumber, startColumn, endLineNumber, endColumn);
            }
            if (startLineNumber === endLineNumber && startColumn === endColumn) {
                // do not expand a collapsed range, simply move it to a valid location
                return new range_1.Range(startLineNumber, startColumn - 1, endLineNumber, endColumn - 1);
            }
            if (startInsideSurrogatePair && endInsideSurrogatePair) {
                // expand range at both ends
                return new range_1.Range(startLineNumber, startColumn - 1, endLineNumber, endColumn + 1);
            }
            if (startInsideSurrogatePair) {
                // only expand range at the start
                return new range_1.Range(startLineNumber, startColumn - 1, endLineNumber, endColumn);
            }
            // only expand range at the end
            return new range_1.Range(startLineNumber, startColumn, endLineNumber, endColumn + 1);
        };
        TextModel.prototype.modifyPosition = function (rawPosition, offset) {
            this._assertNotDisposed();
            var candidate = this.getOffsetAt(rawPosition) + offset;
            return this.getPositionAt(Math.min(this._buffer.getLength(), Math.max(0, candidate)));
        };
        TextModel.prototype.getFullModelRange = function () {
            this._assertNotDisposed();
            var lineCount = this.getLineCount();
            return new range_1.Range(1, 1, lineCount, this.getLineMaxColumn(lineCount));
        };
        TextModel.prototype.findMatches = function (searchString, rawSearchScope, isRegex, matchCase, wordSeparators, captureMatches, limitResultCount) {
            if (limitResultCount === void 0) { limitResultCount = LIMIT_FIND_COUNT; }
            this._assertNotDisposed();
            var searchRange;
            if (range_1.Range.isIRange(rawSearchScope)) {
                searchRange = this.validateRange(rawSearchScope);
            }
            else {
                searchRange = this.getFullModelRange();
            }
            return textModelSearch_1.TextModelSearch.findMatches(this, new textModelSearch_1.SearchParams(searchString, isRegex, matchCase, wordSeparators), searchRange, captureMatches, limitResultCount);
        };
        TextModel.prototype.findNextMatch = function (searchString, rawSearchStart, isRegex, matchCase, wordSeparators, captureMatches) {
            this._assertNotDisposed();
            var searchStart = this.validatePosition(rawSearchStart);
            return textModelSearch_1.TextModelSearch.findNextMatch(this, new textModelSearch_1.SearchParams(searchString, isRegex, matchCase, wordSeparators), searchStart, captureMatches);
        };
        TextModel.prototype.findPreviousMatch = function (searchString, rawSearchStart, isRegex, matchCase, wordSeparators, captureMatches) {
            this._assertNotDisposed();
            var searchStart = this.validatePosition(rawSearchStart);
            return textModelSearch_1.TextModelSearch.findPreviousMatch(this, new textModelSearch_1.SearchParams(searchString, isRegex, matchCase, wordSeparators), searchStart, captureMatches);
        };
        //#endregion
        //#region Editing
        TextModel.prototype.pushStackElement = function () {
            this._commandManager.pushStackElement();
        };
        TextModel.prototype.pushEditOperations = function (beforeCursorState, editOperations, cursorStateComputer) {
            try {
                this._eventEmitter.beginDeferredEmit();
                this._onDidChangeDecorations.beginDeferredEmit();
                return this._pushEditOperations(beforeCursorState, editOperations, cursorStateComputer);
            }
            finally {
                this._onDidChangeDecorations.endDeferredEmit();
                this._eventEmitter.endDeferredEmit();
            }
        };
        TextModel.prototype._pushEditOperations = function (beforeCursorState, editOperations, cursorStateComputer) {
            var _this = this;
            if (this._options.trimAutoWhitespace && this._trimAutoWhitespaceLines) {
                // Go through each saved line number and insert a trim whitespace edit
                // if it is safe to do so (no conflicts with other edits).
                var incomingEdits = editOperations.map(function (op) {
                    return {
                        range: _this.validateRange(op.range),
                        text: op.text
                    };
                });
                // Sometimes, auto-formatters change ranges automatically which can cause undesired auto whitespace trimming near the cursor
                // We'll use the following heuristic: if the edits occur near the cursor, then it's ok to trim auto whitespace
                var editsAreNearCursors = true;
                for (var i = 0, len = beforeCursorState.length; i < len; i++) {
                    var sel = beforeCursorState[i];
                    var foundEditNearSel = false;
                    for (var j = 0, lenJ = incomingEdits.length; j < lenJ; j++) {
                        var editRange = incomingEdits[j].range;
                        var selIsAbove = editRange.startLineNumber > sel.endLineNumber;
                        var selIsBelow = sel.startLineNumber > editRange.endLineNumber;
                        if (!selIsAbove && !selIsBelow) {
                            foundEditNearSel = true;
                            break;
                        }
                    }
                    if (!foundEditNearSel) {
                        editsAreNearCursors = false;
                        break;
                    }
                }
                if (editsAreNearCursors) {
                    for (var i = 0, len = this._trimAutoWhitespaceLines.length; i < len; i++) {
                        var trimLineNumber = this._trimAutoWhitespaceLines[i];
                        var maxLineColumn = this.getLineMaxColumn(trimLineNumber);
                        var allowTrimLine = true;
                        for (var j = 0, lenJ = incomingEdits.length; j < lenJ; j++) {
                            var editRange = incomingEdits[j].range;
                            var editText = incomingEdits[j].text;
                            if (trimLineNumber < editRange.startLineNumber || trimLineNumber > editRange.endLineNumber) {
                                // `trimLine` is completely outside this edit
                                continue;
                            }
                            // At this point:
                            //   editRange.startLineNumber <= trimLine <= editRange.endLineNumber
                            if (trimLineNumber === editRange.startLineNumber && editRange.startColumn === maxLineColumn
                                && editRange.isEmpty() && editText && editText.length > 0 && editText.charAt(0) === '\n') {
                                // This edit inserts a new line (and maybe other text) after `trimLine`
                                continue;
                            }
                            // Looks like we can't trim this line as it would interfere with an incoming edit
                            allowTrimLine = false;
                            break;
                        }
                        if (allowTrimLine) {
                            editOperations.push({
                                range: new range_1.Range(trimLineNumber, 1, trimLineNumber, maxLineColumn),
                                text: null
                            });
                        }
                    }
                }
                this._trimAutoWhitespaceLines = null;
            }
            return this._commandManager.pushEditOperation(beforeCursorState, editOperations, cursorStateComputer);
        };
        TextModel.prototype.applyEdits = function (rawOperations) {
            try {
                this._eventEmitter.beginDeferredEmit();
                this._onDidChangeDecorations.beginDeferredEmit();
                return this._applyEdits(rawOperations);
            }
            finally {
                this._onDidChangeDecorations.endDeferredEmit();
                this._eventEmitter.endDeferredEmit();
            }
        };
        TextModel._eolCount = function (text) {
            var eolCount = 0;
            var firstLineLength = 0;
            for (var i = 0, len = text.length; i < len; i++) {
                var chr = text.charCodeAt(i);
                if (chr === 13 /* CarriageReturn */) {
                    if (eolCount === 0) {
                        firstLineLength = i;
                    }
                    eolCount++;
                    if (i + 1 < len && text.charCodeAt(i + 1) === 10 /* LineFeed */) {
                        // \r\n... case
                        i++; // skip \n
                    }
                    else {
                        // \r... case
                    }
                }
                else if (chr === 10 /* LineFeed */) {
                    if (eolCount === 0) {
                        firstLineLength = i;
                    }
                    eolCount++;
                }
            }
            if (eolCount === 0) {
                firstLineLength = text.length;
            }
            return [eolCount, firstLineLength];
        };
        TextModel.prototype._applyEdits = function (rawOperations) {
            for (var i = 0, len = rawOperations.length; i < len; i++) {
                rawOperations[i].range = this.validateRange(rawOperations[i].range);
            }
            var oldLineCount = this._buffer.getLineCount();
            var result = this._buffer.applyEdits(rawOperations, this._options.trimAutoWhitespace);
            var newLineCount = this._buffer.getLineCount();
            var contentChanges = result.changes;
            this._trimAutoWhitespaceLines = result.trimAutoWhitespaceLineNumbers;
            if (contentChanges.length !== 0) {
                var rawContentChanges = [];
                var lineCount = oldLineCount;
                for (var i = 0, len = contentChanges.length; i < len; i++) {
                    var change = contentChanges[i];
                    var _a = TextModel._eolCount(change.text), eolCount = _a[0], firstLineLength = _a[1];
                    this._tokens.applyEdits(change.range, eolCount, firstLineLength);
                    this._onDidChangeDecorations.fire();
                    this._decorationsTree.acceptReplace(change.rangeOffset, change.rangeLength, change.text.length, change.forceMoveMarkers);
                    var startLineNumber = change.range.startLineNumber;
                    var endLineNumber = change.range.endLineNumber;
                    var deletingLinesCnt = endLineNumber - startLineNumber;
                    var insertingLinesCnt = eolCount;
                    var editingLinesCnt = Math.min(deletingLinesCnt, insertingLinesCnt);
                    var changeLineCountDelta = (insertingLinesCnt - deletingLinesCnt);
                    for (var j = editingLinesCnt; j >= 0; j--) {
                        var editLineNumber = startLineNumber + j;
                        var currentEditLineNumber = newLineCount - lineCount - changeLineCountDelta + editLineNumber;
                        rawContentChanges.push(new textModelEvents_1.ModelRawLineChanged(editLineNumber, this.getLineContent(currentEditLineNumber)));
                    }
                    if (editingLinesCnt < deletingLinesCnt) {
                        // Must delete some lines
                        var spliceStartLineNumber = startLineNumber + editingLinesCnt;
                        rawContentChanges.push(new textModelEvents_1.ModelRawLinesDeleted(spliceStartLineNumber + 1, endLineNumber));
                    }
                    if (editingLinesCnt < insertingLinesCnt) {
                        // Must insert some lines
                        var spliceLineNumber = startLineNumber + editingLinesCnt;
                        var cnt = insertingLinesCnt - editingLinesCnt;
                        var fromLineNumber = newLineCount - lineCount - cnt + spliceLineNumber + 1;
                        var newLines = [];
                        for (var i_1 = 0; i_1 < cnt; i_1++) {
                            var lineNumber = fromLineNumber + i_1;
                            newLines[lineNumber - fromLineNumber] = this.getLineContent(lineNumber);
                        }
                        rawContentChanges.push(new textModelEvents_1.ModelRawLinesInserted(spliceLineNumber + 1, startLineNumber + insertingLinesCnt, newLines));
                    }
                    lineCount += changeLineCountDelta;
                }
                this._increaseVersionId();
                this._emitContentChangedEvent(new textModelEvents_1.ModelRawContentChangedEvent(rawContentChanges, this.getVersionId(), this._isUndoing, this._isRedoing), {
                    changes: contentChanges,
                    eol: this._buffer.getEOL(),
                    versionId: this.getVersionId(),
                    isUndoing: this._isUndoing,
                    isRedoing: this._isRedoing,
                    isFlush: false
                });
            }
            if (this._tokens.hasLinesToTokenize(this._buffer)) {
                this._beginBackgroundTokenization();
            }
            return result.reverseEdits;
        };
        TextModel.prototype._undo = function () {
            this._isUndoing = true;
            var r = this._commandManager.undo();
            this._isUndoing = false;
            if (!r) {
                return null;
            }
            this._overwriteAlternativeVersionId(r.recordedVersionId);
            return r.selections;
        };
        TextModel.prototype.undo = function () {
            try {
                this._eventEmitter.beginDeferredEmit();
                this._onDidChangeDecorations.beginDeferredEmit();
                return this._undo();
            }
            finally {
                this._onDidChangeDecorations.endDeferredEmit();
                this._eventEmitter.endDeferredEmit();
            }
        };
        TextModel.prototype._redo = function () {
            this._isRedoing = true;
            var r = this._commandManager.redo();
            this._isRedoing = false;
            if (!r) {
                return null;
            }
            this._overwriteAlternativeVersionId(r.recordedVersionId);
            return r.selections;
        };
        TextModel.prototype.redo = function () {
            try {
                this._eventEmitter.beginDeferredEmit();
                this._onDidChangeDecorations.beginDeferredEmit();
                return this._redo();
            }
            finally {
                this._onDidChangeDecorations.endDeferredEmit();
                this._eventEmitter.endDeferredEmit();
            }
        };
        //#endregion
        //#region Decorations
        TextModel.prototype.changeDecorations = function (callback, ownerId) {
            if (ownerId === void 0) { ownerId = 0; }
            this._assertNotDisposed();
            try {
                this._onDidChangeDecorations.beginDeferredEmit();
                return this._changeDecorations(ownerId, callback);
            }
            finally {
                this._onDidChangeDecorations.endDeferredEmit();
            }
        };
        TextModel.prototype._changeDecorations = function (ownerId, callback) {
            var _this = this;
            var changeAccessor = {
                addDecoration: function (range, options) {
                    _this._onDidChangeDecorations.fire();
                    return _this._deltaDecorationsImpl(ownerId, [], [{ range: range, options: options }])[0];
                },
                changeDecoration: function (id, newRange) {
                    _this._onDidChangeDecorations.fire();
                    _this._changeDecorationImpl(id, newRange);
                },
                changeDecorationOptions: function (id, options) {
                    _this._onDidChangeDecorations.fire();
                    _this._changeDecorationOptionsImpl(id, _normalizeOptions(options));
                },
                removeDecoration: function (id) {
                    _this._onDidChangeDecorations.fire();
                    _this._deltaDecorationsImpl(ownerId, [id], []);
                },
                deltaDecorations: function (oldDecorations, newDecorations) {
                    if (oldDecorations.length === 0 && newDecorations.length === 0) {
                        // nothing to do
                        return [];
                    }
                    _this._onDidChangeDecorations.fire();
                    return _this._deltaDecorationsImpl(ownerId, oldDecorations, newDecorations);
                }
            };
            var result = null;
            try {
                result = callback(changeAccessor);
            }
            catch (e) {
                errors_1.onUnexpectedError(e);
            }
            // Invalidate change accessor
            changeAccessor.addDecoration = null;
            changeAccessor.changeDecoration = null;
            changeAccessor.removeDecoration = null;
            changeAccessor.deltaDecorations = null;
            return result;
        };
        TextModel.prototype.deltaDecorations = function (oldDecorations, newDecorations, ownerId) {
            if (ownerId === void 0) { ownerId = 0; }
            this._assertNotDisposed();
            if (!oldDecorations) {
                oldDecorations = [];
            }
            if (oldDecorations.length === 0 && newDecorations.length === 0) {
                // nothing to do
                return [];
            }
            try {
                this._onDidChangeDecorations.beginDeferredEmit();
                this._onDidChangeDecorations.fire();
                return this._deltaDecorationsImpl(ownerId, oldDecorations, newDecorations);
            }
            finally {
                this._onDidChangeDecorations.endDeferredEmit();
            }
        };
        TextModel.prototype._getTrackedRange = function (id) {
            return this.getDecorationRange(id);
        };
        TextModel.prototype._setTrackedRange = function (id, newRange, newStickiness) {
            var node = (id ? this._decorations[id] : null);
            if (!node) {
                if (!newRange) {
                    // node doesn't exist, the request is to delete => nothing to do
                    return null;
                }
                // node doesn't exist, the request is to set => add the tracked range
                return this._deltaDecorationsImpl(0, [], [{ range: newRange, options: TRACKED_RANGE_OPTIONS[newStickiness] }])[0];
            }
            if (!newRange) {
                // node exists, the request is to delete => delete node
                this._decorationsTree.delete(node);
                delete this._decorations[node.id];
                return null;
            }
            // node exists, the request is to set => change the tracked range and its options
            var range = this._validateRangeRelaxedNoAllocations(newRange);
            var startOffset = this._buffer.getOffsetAt(range.startLineNumber, range.startColumn);
            var endOffset = this._buffer.getOffsetAt(range.endLineNumber, range.endColumn);
            this._decorationsTree.delete(node);
            node.reset(this.getVersionId(), startOffset, endOffset, range);
            node.setOptions(TRACKED_RANGE_OPTIONS[newStickiness]);
            this._decorationsTree.insert(node);
            return node.id;
        };
        TextModel.prototype.removeAllDecorationsWithOwnerId = function (ownerId) {
            if (this._isDisposed) {
                return;
            }
            var nodes = this._decorationsTree.collectNodesFromOwner(ownerId);
            for (var i = 0, len = nodes.length; i < len; i++) {
                var node = nodes[i];
                this._decorationsTree.delete(node);
                delete this._decorations[node.id];
            }
        };
        TextModel.prototype.getDecorationOptions = function (decorationId) {
            var node = this._decorations[decorationId];
            if (!node) {
                return null;
            }
            return node.options;
        };
        TextModel.prototype.getDecorationRange = function (decorationId) {
            var node = this._decorations[decorationId];
            if (!node) {
                return null;
            }
            var versionId = this.getVersionId();
            if (node.cachedVersionId !== versionId) {
                this._decorationsTree.resolveNode(node, versionId);
            }
            if (node.range === null) {
                node.range = this._getRangeAt(node.cachedAbsoluteStart, node.cachedAbsoluteEnd);
            }
            return node.range;
        };
        TextModel.prototype.getLineDecorations = function (lineNumber, ownerId, filterOutValidation) {
            if (ownerId === void 0) { ownerId = 0; }
            if (filterOutValidation === void 0) { filterOutValidation = false; }
            if (lineNumber < 1 || lineNumber > this.getLineCount()) {
                return [];
            }
            return this.getLinesDecorations(lineNumber, lineNumber, ownerId, filterOutValidation);
        };
        TextModel.prototype.getLinesDecorations = function (_startLineNumber, _endLineNumber, ownerId, filterOutValidation) {
            if (ownerId === void 0) { ownerId = 0; }
            if (filterOutValidation === void 0) { filterOutValidation = false; }
            var lineCount = this.getLineCount();
            var startLineNumber = Math.min(lineCount, Math.max(1, _startLineNumber));
            var endLineNumber = Math.min(lineCount, Math.max(1, _endLineNumber));
            var endColumn = this.getLineMaxColumn(endLineNumber);
            return this._getDecorationsInRange(new range_1.Range(startLineNumber, 1, endLineNumber, endColumn), ownerId, filterOutValidation);
        };
        TextModel.prototype.getDecorationsInRange = function (range, ownerId, filterOutValidation) {
            if (ownerId === void 0) { ownerId = 0; }
            if (filterOutValidation === void 0) { filterOutValidation = false; }
            var validatedRange = this.validateRange(range);
            return this._getDecorationsInRange(validatedRange, ownerId, filterOutValidation);
        };
        TextModel.prototype.getOverviewRulerDecorations = function (ownerId, filterOutValidation) {
            if (ownerId === void 0) { ownerId = 0; }
            if (filterOutValidation === void 0) { filterOutValidation = false; }
            var versionId = this.getVersionId();
            var result = this._decorationsTree.search(ownerId, filterOutValidation, true, versionId);
            return this._ensureNodesHaveRanges(result);
        };
        TextModel.prototype.getAllDecorations = function (ownerId, filterOutValidation) {
            if (ownerId === void 0) { ownerId = 0; }
            if (filterOutValidation === void 0) { filterOutValidation = false; }
            var versionId = this.getVersionId();
            var result = this._decorationsTree.search(ownerId, filterOutValidation, false, versionId);
            return this._ensureNodesHaveRanges(result);
        };
        TextModel.prototype._getDecorationsInRange = function (filterRange, filterOwnerId, filterOutValidation) {
            var startOffset = this._buffer.getOffsetAt(filterRange.startLineNumber, filterRange.startColumn);
            var endOffset = this._buffer.getOffsetAt(filterRange.endLineNumber, filterRange.endColumn);
            var versionId = this.getVersionId();
            var result = this._decorationsTree.intervalSearch(startOffset, endOffset, filterOwnerId, filterOutValidation, versionId);
            return this._ensureNodesHaveRanges(result);
        };
        TextModel.prototype._ensureNodesHaveRanges = function (nodes) {
            for (var i = 0, len = nodes.length; i < len; i++) {
                var node = nodes[i];
                if (node.range === null) {
                    node.range = this._getRangeAt(node.cachedAbsoluteStart, node.cachedAbsoluteEnd);
                }
            }
            return nodes;
        };
        TextModel.prototype._getRangeAt = function (start, end) {
            return this._buffer.getRangeAt(start, end - start);
        };
        TextModel.prototype._changeDecorationImpl = function (decorationId, _range) {
            var node = this._decorations[decorationId];
            if (!node) {
                return;
            }
            var range = this._validateRangeRelaxedNoAllocations(_range);
            var startOffset = this._buffer.getOffsetAt(range.startLineNumber, range.startColumn);
            var endOffset = this._buffer.getOffsetAt(range.endLineNumber, range.endColumn);
            this._decorationsTree.delete(node);
            node.reset(this.getVersionId(), startOffset, endOffset, range);
            this._decorationsTree.insert(node);
        };
        TextModel.prototype._changeDecorationOptionsImpl = function (decorationId, options) {
            var node = this._decorations[decorationId];
            if (!node) {
                return;
            }
            var nodeWasInOverviewRuler = (node.options.overviewRuler.color ? true : false);
            var nodeIsInOverviewRuler = (options.overviewRuler.color ? true : false);
            if (nodeWasInOverviewRuler !== nodeIsInOverviewRuler) {
                // Delete + Insert due to an overview ruler status change
                this._decorationsTree.delete(node);
                node.setOptions(options);
                this._decorationsTree.insert(node);
            }
            else {
                node.setOptions(options);
            }
        };
        TextModel.prototype._deltaDecorationsImpl = function (ownerId, oldDecorationsIds, newDecorations) {
            var versionId = this.getVersionId();
            var oldDecorationsLen = oldDecorationsIds.length;
            var oldDecorationIndex = 0;
            var newDecorationsLen = newDecorations.length;
            var newDecorationIndex = 0;
            var result = new Array(newDecorationsLen);
            while (oldDecorationIndex < oldDecorationsLen || newDecorationIndex < newDecorationsLen) {
                var node = null;
                if (oldDecorationIndex < oldDecorationsLen) {
                    // (1) get ourselves an old node
                    do {
                        node = this._decorations[oldDecorationsIds[oldDecorationIndex++]];
                    } while (!node && oldDecorationIndex < oldDecorationsLen);
                    // (2) remove the node from the tree (if it exists)
                    if (node) {
                        this._decorationsTree.delete(node);
                    }
                }
                if (newDecorationIndex < newDecorationsLen) {
                    // (3) create a new node if necessary
                    if (!node) {
                        var internalDecorationId = (++this._lastDecorationId);
                        var decorationId = this._instanceId + ";" + internalDecorationId;
                        node = new intervalTree_1.IntervalNode(decorationId, 0, 0);
                        this._decorations[decorationId] = node;
                    }
                    // (4) initialize node
                    var newDecoration = newDecorations[newDecorationIndex];
                    var range = this._validateRangeRelaxedNoAllocations(newDecoration.range);
                    var options = _normalizeOptions(newDecoration.options);
                    var startOffset = this._buffer.getOffsetAt(range.startLineNumber, range.startColumn);
                    var endOffset = this._buffer.getOffsetAt(range.endLineNumber, range.endColumn);
                    node.ownerId = ownerId;
                    node.reset(versionId, startOffset, endOffset, range);
                    node.setOptions(options);
                    this._decorationsTree.insert(node);
                    result[newDecorationIndex] = node.id;
                    newDecorationIndex++;
                }
                else {
                    if (node) {
                        delete this._decorations[node.id];
                    }
                }
            }
            return result;
        };
        //#endregion
        //#region Tokenization
        TextModel.prototype.forceTokenization = function (lineNumber) {
            if (lineNumber < 1 || lineNumber > this.getLineCount()) {
                throw new Error('Illegal value for lineNumber');
            }
            var eventBuilder = new textModelTokens_1.ModelTokensChangedEventBuilder();
            this._tokens._updateTokensUntilLine(this._buffer, eventBuilder, lineNumber);
            var e = eventBuilder.build();
            if (e) {
                this._onDidChangeTokens.fire(e);
            }
        };
        TextModel.prototype.isCheapToTokenize = function (lineNumber) {
            return this._tokens.isCheapToTokenize(lineNumber);
        };
        TextModel.prototype.tokenizeIfCheap = function (lineNumber) {
            if (this.isCheapToTokenize(lineNumber)) {
                this.forceTokenization(lineNumber);
            }
        };
        TextModel.prototype.getLineTokens = function (lineNumber) {
            if (lineNumber < 1 || lineNumber > this.getLineCount()) {
                throw new Error('Illegal value for lineNumber');
            }
            return this._getLineTokens(lineNumber);
        };
        TextModel.prototype._getLineTokens = function (lineNumber) {
            var lineText = this._buffer.getLineContent(lineNumber);
            return this._tokens.getTokens(this._languageIdentifier.id, lineNumber - 1, lineText);
        };
        TextModel.prototype.getLanguageIdentifier = function () {
            return this._languageIdentifier;
        };
        TextModel.prototype.getModeId = function () {
            return this._languageIdentifier.language;
        };
        TextModel.prototype.setMode = function (languageIdentifier) {
            if (this._languageIdentifier.id === languageIdentifier.id) {
                // There's nothing to do
                return;
            }
            var e = {
                oldLanguage: this._languageIdentifier.language,
                newLanguage: languageIdentifier.language
            };
            this._languageIdentifier = languageIdentifier;
            // Cancel tokenization, clear all tokens and begin tokenizing
            this._resetTokenizationState();
            this.emitModelTokensChangedEvent({
                ranges: [{
                        fromLineNumber: 1,
                        toLineNumber: this.getLineCount()
                    }]
            });
            this._onDidChangeLanguage.fire(e);
            this._onDidChangeLanguageConfiguration.fire({});
        };
        TextModel.prototype.getLanguageIdAtPosition = function (_lineNumber, _column) {
            if (!this._tokens.tokenizationSupport) {
                return this._languageIdentifier.id;
            }
            var _a = this.validatePosition({ lineNumber: _lineNumber, column: _column }), lineNumber = _a.lineNumber, column = _a.column;
            var lineTokens = this._getLineTokens(lineNumber);
            return lineTokens.getLanguageId(lineTokens.findTokenIndexAtOffset(column - 1));
        };
        TextModel.prototype._beginBackgroundTokenization = function () {
            var _this = this;
            if (this._shouldAutoTokenize() && this._revalidateTokensTimeout === -1) {
                this._revalidateTokensTimeout = setTimeout(function () {
                    _this._revalidateTokensTimeout = -1;
                    _this._revalidateTokensNow();
                }, 0);
            }
        };
        TextModel.prototype._warmUpTokens = function () {
            // Warm up first 100 lines (if it takes less than 50ms)
            var maxLineNumber = Math.min(100, this.getLineCount());
            this._revalidateTokensNow(maxLineNumber);
            if (this._tokens.hasLinesToTokenize(this._buffer)) {
                this._beginBackgroundTokenization();
            }
        };
        TextModel.prototype._revalidateTokensNow = function (toLineNumber) {
            if (toLineNumber === void 0) { toLineNumber = this._buffer.getLineCount(); }
            var MAX_ALLOWED_TIME = 20;
            var eventBuilder = new textModelTokens_1.ModelTokensChangedEventBuilder();
            var sw = stopwatch_1.StopWatch.create(false);
            while (this._tokens.hasLinesToTokenize(this._buffer)) {
                if (sw.elapsed() > MAX_ALLOWED_TIME) {
                    // Stop if MAX_ALLOWED_TIME is reached
                    break;
                }
                var tokenizedLineNumber = this._tokens._tokenizeOneLine(this._buffer, eventBuilder);
                if (tokenizedLineNumber >= toLineNumber) {
                    break;
                }
            }
            if (this._tokens.hasLinesToTokenize(this._buffer)) {
                this._beginBackgroundTokenization();
            }
            var e = eventBuilder.build();
            if (e) {
                this._onDidChangeTokens.fire(e);
            }
        };
        TextModel.prototype.emitModelTokensChangedEvent = function (e) {
            if (!this._isDisposing) {
                this._onDidChangeTokens.fire(e);
            }
        };
        // Having tokens allows implementing additional helper methods
        TextModel.prototype.getWordAtPosition = function (_position) {
            this._assertNotDisposed();
            var position = this.validatePosition(_position);
            var lineContent = this.getLineContent(position.lineNumber);
            var lineTokens = this._getLineTokens(position.lineNumber);
            var offset = position.column - 1;
            var tokenIndex = lineTokens.findTokenIndexAtOffset(offset);
            var languageId = lineTokens.getLanguageId(tokenIndex);
            // go left until a different language is hit
            var startOffset;
            for (var i = tokenIndex; i >= 0 && lineTokens.getLanguageId(i) === languageId; i--) {
                startOffset = lineTokens.getStartOffset(i);
            }
            // go right until a different language is hit
            var endOffset;
            for (var i = tokenIndex, tokenCount = lineTokens.getCount(); i < tokenCount && lineTokens.getLanguageId(i) === languageId; i++) {
                endOffset = lineTokens.getEndOffset(i);
            }
            return wordHelper_1.getWordAtText(position.column, languageConfigurationRegistry_1.LanguageConfigurationRegistry.getWordDefinition(languageId), lineContent.substring(startOffset, endOffset), startOffset);
        };
        TextModel.prototype.getWordUntilPosition = function (position) {
            var wordAtPosition = this.getWordAtPosition(position);
            if (!wordAtPosition) {
                return {
                    word: '',
                    startColumn: position.column,
                    endColumn: position.column
                };
            }
            return {
                word: wordAtPosition.word.substr(0, position.column - wordAtPosition.startColumn),
                startColumn: wordAtPosition.startColumn,
                endColumn: position.column
            };
        };
        TextModel.prototype.findMatchingBracketUp = function (_bracket, _position) {
            var bracket = _bracket.toLowerCase();
            var position = this.validatePosition(_position);
            var lineTokens = this._getLineTokens(position.lineNumber);
            var languageId = lineTokens.getLanguageId(lineTokens.findTokenIndexAtOffset(position.column - 1));
            var bracketsSupport = languageConfigurationRegistry_1.LanguageConfigurationRegistry.getBracketsSupport(languageId);
            if (!bracketsSupport) {
                return null;
            }
            var data = bracketsSupport.textIsBracket[bracket];
            if (!data) {
                return null;
            }
            return this._findMatchingBracketUp(data, position);
        };
        TextModel.prototype.matchBracket = function (position) {
            return this._matchBracket(this.validatePosition(position));
        };
        TextModel.prototype._matchBracket = function (position) {
            var lineNumber = position.lineNumber;
            var lineTokens = this._getLineTokens(lineNumber);
            var lineText = this._buffer.getLineContent(lineNumber);
            var tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
            if (tokenIndex < 0) {
                return null;
            }
            var currentModeBrackets = languageConfigurationRegistry_1.LanguageConfigurationRegistry.getBracketsSupport(lineTokens.getLanguageId(tokenIndex));
            // check that the token is not to be ignored
            if (currentModeBrackets && !supports_1.ignoreBracketsInToken(lineTokens.getStandardTokenType(tokenIndex))) {
                // limit search to not go before `maxBracketLength`
                var searchStartOffset = Math.max(lineTokens.getStartOffset(tokenIndex), position.column - 1 - currentModeBrackets.maxBracketLength);
                // limit search to not go after `maxBracketLength`
                var searchEndOffset = Math.min(lineTokens.getEndOffset(tokenIndex), position.column - 1 + currentModeBrackets.maxBracketLength);
                // first, check if there is a bracket to the right of `position`
                var foundBracket = richEditBrackets_1.BracketsUtils.findNextBracketInToken(currentModeBrackets.forwardRegex, lineNumber, lineText, position.column - 1, searchEndOffset);
                if (foundBracket && foundBracket.startColumn === position.column) {
                    var foundBracketText = lineText.substring(foundBracket.startColumn - 1, foundBracket.endColumn - 1);
                    foundBracketText = foundBracketText.toLowerCase();
                    var r = this._matchFoundBracket(foundBracket, currentModeBrackets.textIsBracket[foundBracketText], currentModeBrackets.textIsOpenBracket[foundBracketText]);
                    // check that we can actually match this bracket
                    if (r) {
                        return r;
                    }
                }
                // it might still be the case that [currentTokenStart -> currentTokenEnd] contains multiple brackets
                while (true) {
                    var foundBracket_1 = richEditBrackets_1.BracketsUtils.findNextBracketInToken(currentModeBrackets.forwardRegex, lineNumber, lineText, searchStartOffset, searchEndOffset);
                    if (!foundBracket_1) {
                        // there are no brackets in this text
                        break;
                    }
                    // check that we didn't hit a bracket too far away from position
                    if (foundBracket_1.startColumn <= position.column && position.column <= foundBracket_1.endColumn) {
                        var foundBracketText = lineText.substring(foundBracket_1.startColumn - 1, foundBracket_1.endColumn - 1);
                        foundBracketText = foundBracketText.toLowerCase();
                        var r = this._matchFoundBracket(foundBracket_1, currentModeBrackets.textIsBracket[foundBracketText], currentModeBrackets.textIsOpenBracket[foundBracketText]);
                        // check that we can actually match this bracket
                        if (r) {
                            return r;
                        }
                    }
                    searchStartOffset = foundBracket_1.endColumn - 1;
                }
            }
            // If position is in between two tokens, try also looking in the previous token
            if (tokenIndex > 0 && lineTokens.getStartOffset(tokenIndex) === position.column - 1) {
                var searchEndOffset = lineTokens.getStartOffset(tokenIndex);
                tokenIndex--;
                var prevModeBrackets = languageConfigurationRegistry_1.LanguageConfigurationRegistry.getBracketsSupport(lineTokens.getLanguageId(tokenIndex));
                // check that previous token is not to be ignored
                if (prevModeBrackets && !supports_1.ignoreBracketsInToken(lineTokens.getStandardTokenType(tokenIndex))) {
                    // limit search in case previous token is very large, there's no need to go beyond `maxBracketLength`
                    var searchStartOffset = Math.max(lineTokens.getStartOffset(tokenIndex), position.column - 1 - prevModeBrackets.maxBracketLength);
                    var foundBracket = richEditBrackets_1.BracketsUtils.findPrevBracketInToken(prevModeBrackets.reversedRegex, lineNumber, lineText, searchStartOffset, searchEndOffset);
                    // check that we didn't hit a bracket too far away from position
                    if (foundBracket && foundBracket.startColumn <= position.column && position.column <= foundBracket.endColumn) {
                        var foundBracketText = lineText.substring(foundBracket.startColumn - 1, foundBracket.endColumn - 1);
                        foundBracketText = foundBracketText.toLowerCase();
                        var r = this._matchFoundBracket(foundBracket, prevModeBrackets.textIsBracket[foundBracketText], prevModeBrackets.textIsOpenBracket[foundBracketText]);
                        // check that we can actually match this bracket
                        if (r) {
                            return r;
                        }
                    }
                }
            }
            return null;
        };
        TextModel.prototype._matchFoundBracket = function (foundBracket, data, isOpen) {
            if (isOpen) {
                var matched = this._findMatchingBracketDown(data, foundBracket.getEndPosition());
                if (matched) {
                    return [foundBracket, matched];
                }
            }
            else {
                var matched = this._findMatchingBracketUp(data, foundBracket.getStartPosition());
                if (matched) {
                    return [foundBracket, matched];
                }
            }
            return null;
        };
        TextModel.prototype._findMatchingBracketUp = function (bracket, position) {
            // console.log('_findMatchingBracketUp: ', 'bracket: ', JSON.stringify(bracket), 'startPosition: ', String(position));
            var languageId = bracket.languageIdentifier.id;
            var reversedBracketRegex = bracket.reversedRegex;
            var count = -1;
            for (var lineNumber = position.lineNumber; lineNumber >= 1; lineNumber--) {
                var lineTokens = this._getLineTokens(lineNumber);
                var tokenCount = lineTokens.getCount();
                var lineText = this._buffer.getLineContent(lineNumber);
                var tokenIndex = tokenCount - 1;
                var searchStopOffset = -1;
                if (lineNumber === position.lineNumber) {
                    tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
                    searchStopOffset = position.column - 1;
                }
                for (; tokenIndex >= 0; tokenIndex--) {
                    var tokenLanguageId = lineTokens.getLanguageId(tokenIndex);
                    var tokenType = lineTokens.getStandardTokenType(tokenIndex);
                    var tokenStartOffset = lineTokens.getStartOffset(tokenIndex);
                    var tokenEndOffset = lineTokens.getEndOffset(tokenIndex);
                    if (searchStopOffset === -1) {
                        searchStopOffset = tokenEndOffset;
                    }
                    if (tokenLanguageId === languageId && !supports_1.ignoreBracketsInToken(tokenType)) {
                        while (true) {
                            var r = richEditBrackets_1.BracketsUtils.findPrevBracketInToken(reversedBracketRegex, lineNumber, lineText, tokenStartOffset, searchStopOffset);
                            if (!r) {
                                break;
                            }
                            var hitText = lineText.substring(r.startColumn - 1, r.endColumn - 1);
                            hitText = hitText.toLowerCase();
                            if (hitText === bracket.open) {
                                count++;
                            }
                            else if (hitText === bracket.close) {
                                count--;
                            }
                            if (count === 0) {
                                return r;
                            }
                            searchStopOffset = r.startColumn - 1;
                        }
                    }
                    searchStopOffset = -1;
                }
            }
            return null;
        };
        TextModel.prototype._findMatchingBracketDown = function (bracket, position) {
            // console.log('_findMatchingBracketDown: ', 'bracket: ', JSON.stringify(bracket), 'startPosition: ', String(position));
            var languageId = bracket.languageIdentifier.id;
            var bracketRegex = bracket.forwardRegex;
            var count = 1;
            for (var lineNumber = position.lineNumber, lineCount = this.getLineCount(); lineNumber <= lineCount; lineNumber++) {
                var lineTokens = this._getLineTokens(lineNumber);
                var tokenCount = lineTokens.getCount();
                var lineText = this._buffer.getLineContent(lineNumber);
                var tokenIndex = 0;
                var searchStartOffset = 0;
                if (lineNumber === position.lineNumber) {
                    tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
                    searchStartOffset = position.column - 1;
                }
                for (; tokenIndex < tokenCount; tokenIndex++) {
                    var tokenLanguageId = lineTokens.getLanguageId(tokenIndex);
                    var tokenType = lineTokens.getStandardTokenType(tokenIndex);
                    var tokenStartOffset = lineTokens.getStartOffset(tokenIndex);
                    var tokenEndOffset = lineTokens.getEndOffset(tokenIndex);
                    if (searchStartOffset === 0) {
                        searchStartOffset = tokenStartOffset;
                    }
                    if (tokenLanguageId === languageId && !supports_1.ignoreBracketsInToken(tokenType)) {
                        while (true) {
                            var r = richEditBrackets_1.BracketsUtils.findNextBracketInToken(bracketRegex, lineNumber, lineText, searchStartOffset, tokenEndOffset);
                            if (!r) {
                                break;
                            }
                            var hitText = lineText.substring(r.startColumn - 1, r.endColumn - 1);
                            hitText = hitText.toLowerCase();
                            if (hitText === bracket.open) {
                                count++;
                            }
                            else if (hitText === bracket.close) {
                                count--;
                            }
                            if (count === 0) {
                                return r;
                            }
                            searchStartOffset = r.endColumn - 1;
                        }
                    }
                    searchStartOffset = 0;
                }
            }
            return null;
        };
        TextModel.prototype.findPrevBracket = function (_position) {
            var position = this.validatePosition(_position);
            var languageId = -1;
            var modeBrackets = null;
            for (var lineNumber = position.lineNumber; lineNumber >= 1; lineNumber--) {
                var lineTokens = this._getLineTokens(lineNumber);
                var tokenCount = lineTokens.getCount();
                var lineText = this._buffer.getLineContent(lineNumber);
                var tokenIndex = tokenCount - 1;
                var searchStopOffset = -1;
                if (lineNumber === position.lineNumber) {
                    tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
                    searchStopOffset = position.column - 1;
                }
                for (; tokenIndex >= 0; tokenIndex--) {
                    var tokenLanguageId = lineTokens.getLanguageId(tokenIndex);
                    var tokenType = lineTokens.getStandardTokenType(tokenIndex);
                    var tokenStartOffset = lineTokens.getStartOffset(tokenIndex);
                    var tokenEndOffset = lineTokens.getEndOffset(tokenIndex);
                    if (searchStopOffset === -1) {
                        searchStopOffset = tokenEndOffset;
                    }
                    if (languageId !== tokenLanguageId) {
                        languageId = tokenLanguageId;
                        modeBrackets = languageConfigurationRegistry_1.LanguageConfigurationRegistry.getBracketsSupport(languageId);
                    }
                    if (modeBrackets && !supports_1.ignoreBracketsInToken(tokenType)) {
                        var r = richEditBrackets_1.BracketsUtils.findPrevBracketInToken(modeBrackets.reversedRegex, lineNumber, lineText, tokenStartOffset, searchStopOffset);
                        if (r) {
                            return this._toFoundBracket(modeBrackets, r);
                        }
                    }
                    searchStopOffset = -1;
                }
            }
            return null;
        };
        TextModel.prototype.findNextBracket = function (_position) {
            var position = this.validatePosition(_position);
            var languageId = -1;
            var modeBrackets = null;
            for (var lineNumber = position.lineNumber, lineCount = this.getLineCount(); lineNumber <= lineCount; lineNumber++) {
                var lineTokens = this._getLineTokens(lineNumber);
                var tokenCount = lineTokens.getCount();
                var lineText = this._buffer.getLineContent(lineNumber);
                var tokenIndex = 0;
                var searchStartOffset = 0;
                if (lineNumber === position.lineNumber) {
                    tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
                    searchStartOffset = position.column - 1;
                }
                for (; tokenIndex < tokenCount; tokenIndex++) {
                    var tokenLanguageId = lineTokens.getLanguageId(tokenIndex);
                    var tokenType = lineTokens.getStandardTokenType(tokenIndex);
                    var tokenStartOffset = lineTokens.getStartOffset(tokenIndex);
                    var tokenEndOffset = lineTokens.getEndOffset(tokenIndex);
                    if (searchStartOffset === 0) {
                        searchStartOffset = tokenStartOffset;
                    }
                    if (languageId !== tokenLanguageId) {
                        languageId = tokenLanguageId;
                        modeBrackets = languageConfigurationRegistry_1.LanguageConfigurationRegistry.getBracketsSupport(languageId);
                    }
                    if (modeBrackets && !supports_1.ignoreBracketsInToken(tokenType)) {
                        var r = richEditBrackets_1.BracketsUtils.findNextBracketInToken(modeBrackets.forwardRegex, lineNumber, lineText, searchStartOffset, tokenEndOffset);
                        if (r) {
                            return this._toFoundBracket(modeBrackets, r);
                        }
                    }
                    searchStartOffset = 0;
                }
            }
            return null;
        };
        TextModel.prototype._toFoundBracket = function (modeBrackets, r) {
            if (!r) {
                return null;
            }
            var text = this.getValueInRange(r);
            text = text.toLowerCase();
            var data = modeBrackets.textIsBracket[text];
            if (!data) {
                return null;
            }
            return {
                range: r,
                open: data.open,
                close: data.close,
                isOpen: modeBrackets.textIsOpenBracket[text]
            };
        };
        /**
         * Returns:
         *  - -1 => the line consists of whitespace
         *  - otherwise => the indent level is returned value
         */
        TextModel.computeIndentLevel = function (line, tabSize) {
            var indent = 0;
            var i = 0;
            var len = line.length;
            while (i < len) {
                var chCode = line.charCodeAt(i);
                if (chCode === 32 /* Space */) {
                    indent++;
                }
                else if (chCode === 9 /* Tab */) {
                    indent = indent - indent % tabSize + tabSize;
                }
                else {
                    break;
                }
                i++;
            }
            if (i === len) {
                return -1; // line only consists of whitespace
            }
            return indent;
        };
        TextModel.prototype._computeIndentLevel = function (lineIndex) {
            return TextModel.computeIndentLevel(this._buffer.getLineContent(lineIndex + 1), this._options.tabSize);
        };
        TextModel.prototype.getLinesIndentGuides = function (startLineNumber, endLineNumber) {
            this._assertNotDisposed();
            var lineCount = this.getLineCount();
            if (startLineNumber < 1 || startLineNumber > lineCount) {
                throw new Error('Illegal value for startLineNumber');
            }
            if (endLineNumber < 1 || endLineNumber > lineCount) {
                throw new Error('Illegal value for endLineNumber');
            }
            var foldingRules = languageConfigurationRegistry_1.LanguageConfigurationRegistry.getFoldingRules(this._languageIdentifier.id);
            var offSide = foldingRules && foldingRules.offSide;
            var result = new Array(endLineNumber - startLineNumber + 1);
            var aboveContentLineIndex = -2; /* -2 is a marker for not having computed it */
            var aboveContentLineIndent = -1;
            var belowContentLineIndex = -2; /* -2 is a marker for not having computed it */
            var belowContentLineIndent = -1;
            for (var lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
                var resultIndex = lineNumber - startLineNumber;
                var currentIndent = this._computeIndentLevel(lineNumber - 1);
                if (currentIndent >= 0) {
                    // This line has content (besides whitespace)
                    // Use the line's indent
                    aboveContentLineIndex = lineNumber - 1;
                    aboveContentLineIndent = currentIndent;
                    result[resultIndex] = Math.ceil(currentIndent / this._options.tabSize);
                    continue;
                }
                if (aboveContentLineIndex === -2) {
                    aboveContentLineIndex = -1;
                    aboveContentLineIndent = -1;
                    // must find previous line with content
                    for (var lineIndex = lineNumber - 2; lineIndex >= 0; lineIndex--) {
                        var indent = this._computeIndentLevel(lineIndex);
                        if (indent >= 0) {
                            aboveContentLineIndex = lineIndex;
                            aboveContentLineIndent = indent;
                            break;
                        }
                    }
                }
                if (belowContentLineIndex !== -1 && (belowContentLineIndex === -2 || belowContentLineIndex < lineNumber - 1)) {
                    belowContentLineIndex = -1;
                    belowContentLineIndent = -1;
                    // must find next line with content
                    for (var lineIndex = lineNumber; lineIndex < lineCount; lineIndex++) {
                        var indent = this._computeIndentLevel(lineIndex);
                        if (indent >= 0) {
                            belowContentLineIndex = lineIndex;
                            belowContentLineIndent = indent;
                            break;
                        }
                    }
                }
                if (aboveContentLineIndent === -1 || belowContentLineIndent === -1) {
                    // At the top or bottom of the file
                    result[resultIndex] = 0;
                }
                else if (aboveContentLineIndent < belowContentLineIndent) {
                    // we are inside the region above
                    result[resultIndex] = (1 + Math.floor(aboveContentLineIndent / this._options.tabSize));
                }
                else if (aboveContentLineIndent === belowContentLineIndent) {
                    // we are in between two regions
                    result[resultIndex] = Math.ceil(belowContentLineIndent / this._options.tabSize);
                }
                else {
                    if (offSide) {
                        // same level as region below
                        result[resultIndex] = Math.ceil(belowContentLineIndent / this._options.tabSize);
                    }
                    else {
                        // we are inside the region that ends below
                        result[resultIndex] = (1 + Math.floor(belowContentLineIndent / this._options.tabSize));
                    }
                }
            }
            return result;
        };
        TextModel.MODEL_SYNC_LIMIT = 50 * 1024 * 1024; // 50 MB
        TextModel.MODEL_TOKENIZATION_LIMIT = 20 * 1024 * 1024; // 20 MB
        TextModel.MANY_MANY_LINES = 300 * 1000; // 300K lines
        TextModel.DEFAULT_CREATION_OPTIONS = {
            tabSize: editorOptions_1.EDITOR_MODEL_DEFAULTS.tabSize,
            insertSpaces: editorOptions_1.EDITOR_MODEL_DEFAULTS.insertSpaces,
            detectIndentation: false,
            defaultEOL: model.DefaultEndOfLine.LF,
            trimAutoWhitespace: editorOptions_1.EDITOR_MODEL_DEFAULTS.trimAutoWhitespace,
        };
        return TextModel;
    }(lifecycle_1.Disposable));
    exports.TextModel = TextModel;
    //#region Decorations
    var DecorationsTrees = /** @class */ (function () {
        function DecorationsTrees() {
            this._decorationsTree0 = new intervalTree_1.IntervalTree();
            this._decorationsTree1 = new intervalTree_1.IntervalTree();
        }
        DecorationsTrees.prototype.intervalSearch = function (start, end, filterOwnerId, filterOutValidation, cachedVersionId) {
            var r0 = this._decorationsTree0.intervalSearch(start, end, filterOwnerId, filterOutValidation, cachedVersionId);
            var r1 = this._decorationsTree1.intervalSearch(start, end, filterOwnerId, filterOutValidation, cachedVersionId);
            return r0.concat(r1);
        };
        DecorationsTrees.prototype.search = function (filterOwnerId, filterOutValidation, overviewRulerOnly, cachedVersionId) {
            if (overviewRulerOnly) {
                return this._decorationsTree1.search(filterOwnerId, filterOutValidation, cachedVersionId);
            }
            else {
                var r0 = this._decorationsTree0.search(filterOwnerId, filterOutValidation, cachedVersionId);
                var r1 = this._decorationsTree1.search(filterOwnerId, filterOutValidation, cachedVersionId);
                return r0.concat(r1);
            }
        };
        DecorationsTrees.prototype.collectNodesFromOwner = function (ownerId) {
            var r0 = this._decorationsTree0.collectNodesFromOwner(ownerId);
            var r1 = this._decorationsTree1.collectNodesFromOwner(ownerId);
            return r0.concat(r1);
        };
        DecorationsTrees.prototype.collectNodesPostOrder = function () {
            var r0 = this._decorationsTree0.collectNodesPostOrder();
            var r1 = this._decorationsTree1.collectNodesPostOrder();
            return r0.concat(r1);
        };
        DecorationsTrees.prototype.insert = function (node) {
            if (intervalTree_1.getNodeIsInOverviewRuler(node)) {
                this._decorationsTree1.insert(node);
            }
            else {
                this._decorationsTree0.insert(node);
            }
        };
        DecorationsTrees.prototype.delete = function (node) {
            if (intervalTree_1.getNodeIsInOverviewRuler(node)) {
                this._decorationsTree1.delete(node);
            }
            else {
                this._decorationsTree0.delete(node);
            }
        };
        DecorationsTrees.prototype.resolveNode = function (node, cachedVersionId) {
            if (intervalTree_1.getNodeIsInOverviewRuler(node)) {
                this._decorationsTree1.resolveNode(node, cachedVersionId);
            }
            else {
                this._decorationsTree0.resolveNode(node, cachedVersionId);
            }
        };
        DecorationsTrees.prototype.acceptReplace = function (offset, length, textLength, forceMoveMarkers) {
            this._decorationsTree0.acceptReplace(offset, length, textLength, forceMoveMarkers);
            this._decorationsTree1.acceptReplace(offset, length, textLength, forceMoveMarkers);
        };
        return DecorationsTrees;
    }());
    function cleanClassName(className) {
        return className.replace(/[^a-z0-9\-]/gi, ' ');
    }
    var ModelDecorationOverviewRulerOptions = /** @class */ (function () {
        function ModelDecorationOverviewRulerOptions(options) {
            this.color = strings.empty;
            this.darkColor = strings.empty;
            this.hcColor = strings.empty;
            this.position = model.OverviewRulerLane.Center;
            this._resolvedColor = null;
            if (options && options.color) {
                this.color = options.color;
            }
            if (options && options.darkColor) {
                this.darkColor = options.darkColor;
                this.hcColor = options.darkColor;
            }
            if (options && options.hcColor) {
                this.hcColor = options.hcColor;
            }
            if (options && options.hasOwnProperty('position')) {
                this.position = options.position;
            }
        }
        return ModelDecorationOverviewRulerOptions;
    }());
    exports.ModelDecorationOverviewRulerOptions = ModelDecorationOverviewRulerOptions;
    var lastStaticId = 0;
    var ModelDecorationOptions = /** @class */ (function () {
        function ModelDecorationOptions(staticId, options) {
            this.staticId = staticId;
            this.stickiness = options.stickiness || model.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges;
            this.className = options.className ? cleanClassName(options.className) : strings.empty;
            this.hoverMessage = options.hoverMessage || [];
            this.glyphMarginHoverMessage = options.glyphMarginHoverMessage || [];
            this.isWholeLine = options.isWholeLine || false;
            this.showIfCollapsed = options.showIfCollapsed || false;
            this.overviewRuler = new ModelDecorationOverviewRulerOptions(options.overviewRuler);
            this.glyphMarginClassName = options.glyphMarginClassName ? cleanClassName(options.glyphMarginClassName) : strings.empty;
            this.linesDecorationsClassName = options.linesDecorationsClassName ? cleanClassName(options.linesDecorationsClassName) : strings.empty;
            this.marginClassName = options.marginClassName ? cleanClassName(options.marginClassName) : strings.empty;
            this.inlineClassName = options.inlineClassName ? cleanClassName(options.inlineClassName) : strings.empty;
            this.beforeContentClassName = options.beforeContentClassName ? cleanClassName(options.beforeContentClassName) : strings.empty;
            this.afterContentClassName = options.afterContentClassName ? cleanClassName(options.afterContentClassName) : strings.empty;
        }
        ModelDecorationOptions.register = function (options) {
            return new ModelDecorationOptions(++lastStaticId, options);
        };
        ModelDecorationOptions.createDynamic = function (options) {
            return new ModelDecorationOptions(0, options);
        };
        return ModelDecorationOptions;
    }());
    exports.ModelDecorationOptions = ModelDecorationOptions;
    ModelDecorationOptions.EMPTY = ModelDecorationOptions.register({});
    /**
     * The order carefully matches the values of the enum.
     */
    var TRACKED_RANGE_OPTIONS = [
        ModelDecorationOptions.register({ stickiness: model.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges }),
        ModelDecorationOptions.register({ stickiness: model.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges }),
        ModelDecorationOptions.register({ stickiness: model.TrackedRangeStickiness.GrowsOnlyWhenTypingBefore }),
        ModelDecorationOptions.register({ stickiness: model.TrackedRangeStickiness.GrowsOnlyWhenTypingAfter }),
    ];
    function _normalizeOptions(options) {
        if (options instanceof ModelDecorationOptions) {
            return options;
        }
        return ModelDecorationOptions.createDynamic(options);
    }
    var DidChangeDecorationsEmitter = /** @class */ (function (_super) {
        __extends(DidChangeDecorationsEmitter, _super);
        function DidChangeDecorationsEmitter() {
            var _this = _super.call(this) || this;
            _this._actual = _this._register(new event_1.Emitter());
            _this.event = _this._actual.event;
            _this._deferredCnt = 0;
            _this._shouldFire = false;
            return _this;
        }
        DidChangeDecorationsEmitter.prototype.beginDeferredEmit = function () {
            this._deferredCnt++;
        };
        DidChangeDecorationsEmitter.prototype.endDeferredEmit = function () {
            this._deferredCnt--;
            if (this._deferredCnt === 0) {
                if (this._shouldFire) {
                    this._shouldFire = false;
                    this._actual.fire({});
                }
            }
        };
        DidChangeDecorationsEmitter.prototype.fire = function () {
            this._shouldFire = true;
        };
        return DidChangeDecorationsEmitter;
    }(lifecycle_1.Disposable));
    exports.DidChangeDecorationsEmitter = DidChangeDecorationsEmitter;
    //#endregion
    var DidChangeContentEmitter = /** @class */ (function (_super) {
        __extends(DidChangeContentEmitter, _super);
        function DidChangeContentEmitter() {
            var _this = _super.call(this) || this;
            _this._actual = _this._register(new event_1.Emitter());
            _this.event = _this._actual.event;
            _this._deferredCnt = 0;
            _this._deferredEvents = [];
            return _this;
        }
        DidChangeContentEmitter.prototype.beginDeferredEmit = function () {
            this._deferredCnt++;
        };
        DidChangeContentEmitter.prototype.endDeferredEmit = function () {
            this._deferredCnt--;
            if (this._deferredCnt === 0) {
                while (this._deferredEvents.length > 0) {
                    this._actual.fire(this._deferredEvents.shift());
                }
            }
        };
        DidChangeContentEmitter.prototype.fire = function (e) {
            if (this._deferredCnt > 0) {
                this._deferredEvents.push(e);
                return;
            }
            this._actual.fire(e);
        };
        return DidChangeContentEmitter;
    }(lifecycle_1.Disposable));
    exports.DidChangeContentEmitter = DidChangeContentEmitter;
});
