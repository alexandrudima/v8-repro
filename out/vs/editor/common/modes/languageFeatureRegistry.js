/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
define(["require", "exports", "vs/base/common/event", "vs/editor/common/modes/languageSelector"], function (require, exports, event_1, languageSelector_1) {
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    var LanguageFeatureRegistry = /** @class */ (function () {
        function LanguageFeatureRegistry() {
            this._clock = 0;
            this._entries = [];
            this._onDidChange = new event_1.Emitter();
        }
        Object.defineProperty(LanguageFeatureRegistry.prototype, "onDidChange", {
            get: function () {
                return this._onDidChange.event;
            },
            enumerable: true,
            configurable: true
        });
        LanguageFeatureRegistry.prototype.register = function (selector, provider) {
            var _this = this;
            var entry = {
                selector: selector,
                provider: provider,
                _score: -1,
                _time: this._clock++
            };
            this._entries.push(entry);
            this._lastCandidate = undefined;
            this._onDidChange.fire(this._entries.length);
            return {
                dispose: function () {
                    if (entry) {
                        var idx = _this._entries.indexOf(entry);
                        if (idx >= 0) {
                            _this._entries.splice(idx, 1);
                            _this._lastCandidate = undefined;
                            _this._onDidChange.fire(_this._entries.length);
                            entry = undefined;
                        }
                    }
                }
            };
        };
        LanguageFeatureRegistry.prototype.has = function (model) {
            return this.all(model).length > 0;
        };
        LanguageFeatureRegistry.prototype.all = function (model) {
            if (!model || model.isTooLargeForHavingARichMode()) {
                return [];
            }
            this._updateScores(model);
            var result = [];
            // from registry
            for (var _i = 0, _a = this._entries; _i < _a.length; _i++) {
                var entry = _a[_i];
                if (entry._score > 0) {
                    result.push(entry.provider);
                }
            }
            return result;
        };
        LanguageFeatureRegistry.prototype.ordered = function (model) {
            var result = [];
            this._orderedForEach(model, function (entry) { return result.push(entry.provider); });
            return result;
        };
        LanguageFeatureRegistry.prototype.orderedGroups = function (model) {
            var result = [];
            var lastBucket;
            var lastBucketScore;
            this._orderedForEach(model, function (entry) {
                if (lastBucket && lastBucketScore === entry._score) {
                    lastBucket.push(entry.provider);
                }
                else {
                    lastBucketScore = entry._score;
                    lastBucket = [entry.provider];
                    result.push(lastBucket);
                }
            });
            return result;
        };
        LanguageFeatureRegistry.prototype._orderedForEach = function (model, callback) {
            if (!model || model.isTooLargeForHavingARichMode()) {
                return;
            }
            this._updateScores(model);
            for (var from = 0; from < this._entries.length; from++) {
                var entry = this._entries[from];
                if (entry._score > 0) {
                    callback(entry);
                }
            }
        };
        LanguageFeatureRegistry.prototype._updateScores = function (model) {
            var candidate = {
                uri: model.uri.toString(),
                language: model.getLanguageIdentifier().language
            };
            if (this._lastCandidate
                && this._lastCandidate.language === candidate.language
                && this._lastCandidate.uri === candidate.uri) {
                // nothing has changed
                return;
            }
            this._lastCandidate = candidate;
            for (var _i = 0, _a = this._entries; _i < _a.length; _i++) {
                var entry = _a[_i];
                entry._score = languageSelector_1.score(entry.selector, model.uri, model.getLanguageIdentifier().language);
            }
            // needs sorting
            this._entries.sort(LanguageFeatureRegistry._compareByScoreAndTime);
        };
        LanguageFeatureRegistry._compareByScoreAndTime = function (a, b) {
            if (a._score < b._score) {
                return 1;
            }
            else if (a._score > b._score) {
                return -1;
            }
            else if (a._time < b._time) {
                return 1;
            }
            else if (a._time > b._time) {
                return -1;
            }
            else {
                return 0;
            }
        };
        return LanguageFeatureRegistry;
    }());
    exports.default = LanguageFeatureRegistry;
});
