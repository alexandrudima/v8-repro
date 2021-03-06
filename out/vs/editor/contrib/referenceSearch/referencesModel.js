define(["require", "exports", "vs/nls", "vs/base/common/event", "vs/base/common/paths", "vs/base/common/lifecycle", "vs/base/common/strings", "vs/base/common/idGenerator", "vs/base/common/winjs.base", "vs/editor/common/core/range"], function (require, exports, nls_1, event_1, paths_1, lifecycle_1, strings, idGenerator_1, winjs_base_1, range_1) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    var OneReference = /** @class */ (function () {
        function OneReference(_parent, _range) {
            this._parent = _parent;
            this._range = _range;
            this._onRefChanged = new event_1.Emitter();
            this.onRefChanged = this._onRefChanged.event;
            this._id = idGenerator_1.defaultGenerator.nextId();
        }
        Object.defineProperty(OneReference.prototype, "id", {
            get: function () {
                return this._id;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OneReference.prototype, "model", {
            get: function () {
                return this._parent;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OneReference.prototype, "parent", {
            get: function () {
                return this._parent;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OneReference.prototype, "uri", {
            get: function () {
                return this._parent.uri;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OneReference.prototype, "name", {
            get: function () {
                return this._parent.name;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OneReference.prototype, "directory", {
            get: function () {
                return this._parent.directory;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(OneReference.prototype, "range", {
            get: function () {
                return this._range;
            },
            set: function (value) {
                this._range = value;
                this._onRefChanged.fire(this);
            },
            enumerable: true,
            configurable: true
        });
        OneReference.prototype.getAriaMessage = function () {
            return nls_1.localize('aria.oneReference', "symbol in {0} on line {1} at column {2}", paths_1.basename(this.uri.fsPath), this.range.startLineNumber, this.range.startColumn);
        };
        return OneReference;
    }());
    exports.OneReference = OneReference;
    var FilePreview = /** @class */ (function () {
        function FilePreview(_modelReference) {
            this._modelReference = _modelReference;
        }
        Object.defineProperty(FilePreview.prototype, "_model", {
            get: function () { return this._modelReference.object.textEditorModel; },
            enumerable: true,
            configurable: true
        });
        FilePreview.prototype.preview = function (range, n) {
            if (n === void 0) { n = 8; }
            var model = this._model;
            if (!model) {
                return undefined;
            }
            var startLineNumber = range.startLineNumber, startColumn = range.startColumn, endLineNumber = range.endLineNumber, endColumn = range.endColumn;
            var word = model.getWordUntilPosition({ lineNumber: startLineNumber, column: startColumn - n });
            var beforeRange = new range_1.Range(startLineNumber, word.startColumn, startLineNumber, startColumn);
            var afterRange = new range_1.Range(endLineNumber, endColumn, endLineNumber, Number.MAX_VALUE);
            var ret = {
                before: model.getValueInRange(beforeRange).replace(/^\s+/, strings.empty),
                inside: model.getValueInRange(range),
                after: model.getValueInRange(afterRange).replace(/\s+$/, strings.empty)
            };
            return ret;
        };
        FilePreview.prototype.dispose = function () {
            if (this._modelReference) {
                this._modelReference.dispose();
                this._modelReference = null;
            }
        };
        return FilePreview;
    }());
    exports.FilePreview = FilePreview;
    var FileReferences = /** @class */ (function () {
        function FileReferences(_parent, _uri) {
            this._parent = _parent;
            this._uri = _uri;
            this._children = [];
        }
        Object.defineProperty(FileReferences.prototype, "id", {
            get: function () {
                return this._uri.toString();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FileReferences.prototype, "parent", {
            get: function () {
                return this._parent;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FileReferences.prototype, "children", {
            get: function () {
                return this._children;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FileReferences.prototype, "uri", {
            get: function () {
                return this._uri;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FileReferences.prototype, "name", {
            get: function () {
                return paths_1.basename(this.uri.fsPath);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FileReferences.prototype, "directory", {
            get: function () {
                return paths_1.dirname(this.uri.fsPath);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FileReferences.prototype, "preview", {
            get: function () {
                return this._preview;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(FileReferences.prototype, "failure", {
            get: function () {
                return this._loadFailure;
            },
            enumerable: true,
            configurable: true
        });
        FileReferences.prototype.getAriaMessage = function () {
            var len = this.children.length;
            if (len === 1) {
                return nls_1.localize('aria.fileReferences.1', "1 symbol in {0}, full path {1}", paths_1.basename(this.uri.fsPath), this.uri.fsPath);
            }
            else {
                return nls_1.localize('aria.fileReferences.N', "{0} symbols in {1}, full path {2}", len, paths_1.basename(this.uri.fsPath), this.uri.fsPath);
            }
        };
        FileReferences.prototype.resolve = function (textModelResolverService) {
            var _this = this;
            if (this._resolved) {
                return winjs_base_1.TPromise.as(this);
            }
            return textModelResolverService.createModelReference(this._uri).then(function (modelReference) {
                var model = modelReference.object;
                if (!model) {
                    modelReference.dispose();
                    throw new Error();
                }
                _this._preview = new FilePreview(modelReference);
                _this._resolved = true;
                return _this;
            }, function (err) {
                // something wrong here
                _this._children = [];
                _this._resolved = true;
                _this._loadFailure = err;
                return _this;
            });
        };
        FileReferences.prototype.dispose = function () {
            if (this._preview) {
                this._preview.dispose();
                this._preview = null;
            }
        };
        return FileReferences;
    }());
    exports.FileReferences = FileReferences;
    var ReferencesModel = /** @class */ (function () {
        function ReferencesModel(references) {
            var _this = this;
            this._groups = [];
            this._references = [];
            this._onDidChangeReferenceRange = new event_1.Emitter();
            this.onDidChangeReferenceRange = this._onDidChangeReferenceRange.event;
            this._disposables = [];
            // grouping and sorting
            references.sort(ReferencesModel._compareReferences);
            var current;
            for (var _i = 0, references_1 = references; _i < references_1.length; _i++) {
                var ref = references_1[_i];
                if (!current || current.uri.toString() !== ref.uri.toString()) {
                    // new group
                    current = new FileReferences(this, ref.uri);
                    this.groups.push(current);
                }
                // append, check for equality first!
                if (current.children.length === 0
                    || !range_1.Range.equalsRange(ref.range, current.children[current.children.length - 1].range)) {
                    var oneRef = new OneReference(current, ref.range);
                    this._disposables.push(oneRef.onRefChanged(function (e) { return _this._onDidChangeReferenceRange.fire(e); }));
                    this._references.push(oneRef);
                    current.children.push(oneRef);
                }
            }
        }
        Object.defineProperty(ReferencesModel.prototype, "empty", {
            get: function () {
                return this._groups.length === 0;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReferencesModel.prototype, "references", {
            get: function () {
                return this._references;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReferencesModel.prototype, "groups", {
            get: function () {
                return this._groups;
            },
            enumerable: true,
            configurable: true
        });
        ReferencesModel.prototype.getAriaMessage = function () {
            if (this.empty) {
                return nls_1.localize('aria.result.0', "No results found");
            }
            else if (this.references.length === 1) {
                return nls_1.localize('aria.result.1', "Found 1 symbol in {0}", this.references[0].uri.fsPath);
            }
            else if (this.groups.length === 1) {
                return nls_1.localize('aria.result.n1', "Found {0} symbols in {1}", this.references.length, this.groups[0].uri.fsPath);
            }
            else {
                return nls_1.localize('aria.result.nm', "Found {0} symbols in {1} files", this.references.length, this.groups.length);
            }
        };
        ReferencesModel.prototype.nextReference = function (reference) {
            var idx = reference.parent.children.indexOf(reference), len = reference.parent.children.length, totalLength = reference.parent.parent.groups.length;
            if (idx + 1 < len || totalLength === 1) {
                return reference.parent.children[(idx + 1) % len];
            }
            idx = reference.parent.parent.groups.indexOf(reference.parent);
            idx = (idx + 1) % totalLength;
            return reference.parent.parent.groups[idx].children[0];
        };
        ReferencesModel.prototype.nearestReference = function (resource, position) {
            var nearest = this._references.map(function (ref, idx) {
                return {
                    idx: idx,
                    prefixLen: strings.commonPrefixLength(ref.uri.toString(), resource.toString()),
                    offsetDist: Math.abs(ref.range.startLineNumber - position.lineNumber) * 100 + Math.abs(ref.range.startColumn - position.column)
                };
            }).sort(function (a, b) {
                if (a.prefixLen > b.prefixLen) {
                    return -1;
                }
                else if (a.prefixLen < b.prefixLen) {
                    return 1;
                }
                else if (a.offsetDist < b.offsetDist) {
                    return -1;
                }
                else if (a.offsetDist > b.offsetDist) {
                    return 1;
                }
                else {
                    return 0;
                }
            })[0];
            if (nearest) {
                return this._references[nearest.idx];
            }
            return undefined;
        };
        ReferencesModel.prototype.dispose = function () {
            this._groups = lifecycle_1.dispose(this._groups);
            lifecycle_1.dispose(this._disposables);
            this._disposables.length = 0;
        };
        ReferencesModel._compareReferences = function (a, b) {
            var auri = a.uri.toString();
            var buri = b.uri.toString();
            if (auri < buri) {
                return -1;
            }
            else if (auri > buri) {
                return 1;
            }
            else {
                return range_1.Range.compareRangesUsingStarts(a.range, b.range);
            }
        };
        return ReferencesModel;
    }());
    exports.ReferencesModel = ReferencesModel;
});
