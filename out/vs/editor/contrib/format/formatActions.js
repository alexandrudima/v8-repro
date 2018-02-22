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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "vs/nls", "vs/base/common/arrays", "vs/base/common/keyCodes", "vs/base/common/lifecycle", "vs/base/common/winjs.base", "vs/platform/contextkey/common/contextkey", "vs/editor/browser/editorExtensions", "vs/editor/common/modes", "vs/editor/contrib/format/format", "vs/editor/contrib/format/formatCommand", "vs/platform/commands/common/commands", "vs/editor/browser/services/codeEditorService", "vs/editor/common/services/editorWorkerService", "vs/editor/common/core/characterClassifier", "vs/editor/common/core/range", "vs/base/browser/ui/aria/aria", "vs/editor/browser/core/editorState", "vs/editor/common/editorContextKeys", "vs/platform/message/common/message"], function (require, exports, nls, arrays_1, keyCodes_1, lifecycle_1, winjs_base_1, contextkey_1, editorExtensions_1, modes_1, format_1, formatCommand_1, commands_1, codeEditorService_1, editorWorkerService_1, characterClassifier_1, range_1, aria_1, editorState_1, editorContextKeys_1, message_1) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    function alertFormattingEdits(edits) {
        edits = edits.filter(function (edit) { return edit.range; });
        if (!edits.length) {
            return;
        }
        var range = edits[0].range;
        for (var i = 1; i < edits.length; i++) {
            range = range_1.Range.plusRange(range, edits[i].range);
        }
        var startLineNumber = range.startLineNumber, endLineNumber = range.endLineNumber;
        if (startLineNumber === endLineNumber) {
            if (edits.length === 1) {
                aria_1.alert(nls.localize('hint11', "Made 1 formatting edit on line {0}", startLineNumber));
            }
            else {
                aria_1.alert(nls.localize('hintn1', "Made {0} formatting edits on line {1}", edits.length, startLineNumber));
            }
        }
        else {
            if (edits.length === 1) {
                aria_1.alert(nls.localize('hint1n', "Made 1 formatting edit between lines {0} and {1}", startLineNumber, endLineNumber));
            }
            else {
                aria_1.alert(nls.localize('hintnn', "Made {0} formatting edits between lines {1} and {2}", edits.length, startLineNumber, endLineNumber));
            }
        }
    }
    var FormatOnType = /** @class */ (function () {
        function FormatOnType(editor, workerService) {
            var _this = this;
            this.editor = editor;
            this.workerService = workerService;
            this.callOnDispose = [];
            this.callOnModel = [];
            this.callOnDispose.push(editor.onDidChangeConfiguration(function () { return _this.update(); }));
            this.callOnDispose.push(editor.onDidChangeModel(function () { return _this.update(); }));
            this.callOnDispose.push(editor.onDidChangeModelLanguage(function () { return _this.update(); }));
            this.callOnDispose.push(modes_1.OnTypeFormattingEditProviderRegistry.onDidChange(this.update, this));
        }
        FormatOnType.prototype.update = function () {
            var _this = this;
            // clean up
            this.callOnModel = lifecycle_1.dispose(this.callOnModel);
            // we are disabled
            if (!this.editor.getConfiguration().contribInfo.formatOnType) {
                return;
            }
            // no model
            if (!this.editor.getModel()) {
                return;
            }
            var model = this.editor.getModel();
            // no support
            var support = modes_1.OnTypeFormattingEditProviderRegistry.ordered(model)[0];
            if (!support || !support.autoFormatTriggerCharacters) {
                return;
            }
            // register typing listeners that will trigger the format
            var triggerChars = new characterClassifier_1.CharacterSet();
            for (var _i = 0, _a = support.autoFormatTriggerCharacters; _i < _a.length; _i++) {
                var ch = _a[_i];
                triggerChars.add(ch.charCodeAt(0));
            }
            this.callOnModel.push(this.editor.onDidType(function (text) {
                var lastCharCode = text.charCodeAt(text.length - 1);
                if (triggerChars.has(lastCharCode)) {
                    _this.trigger(String.fromCharCode(lastCharCode));
                }
            }));
        };
        FormatOnType.prototype.trigger = function (ch) {
            var _this = this;
            if (this.editor.getSelections().length > 1) {
                return;
            }
            var model = this.editor.getModel(), position = this.editor.getPosition(), canceled = false;
            // install a listener that checks if edits happens before the
            // position on which we format right now. If so, we won't
            // apply the format edits
            var unbind = this.editor.onDidChangeModelContent(function (e) {
                if (e.isFlush) {
                    // a model.setValue() was called
                    // cancel only once
                    canceled = true;
                    unbind.dispose();
                    return;
                }
                for (var i = 0, len = e.changes.length; i < len; i++) {
                    var change = e.changes[i];
                    if (change.range.endLineNumber <= position.lineNumber) {
                        // cancel only once
                        canceled = true;
                        unbind.dispose();
                        return;
                    }
                }
            });
            var modelOpts = model.getOptions();
            format_1.getOnTypeFormattingEdits(model, position, ch, {
                tabSize: modelOpts.tabSize,
                insertSpaces: modelOpts.insertSpaces
            }).then(function (edits) {
                return _this.workerService.computeMoreMinimalEdits(model.uri, edits);
            }).then(function (edits) {
                unbind.dispose();
                if (canceled || arrays_1.isFalsyOrEmpty(edits)) {
                    return;
                }
                formatCommand_1.EditOperationsCommand.execute(_this.editor, edits, true);
                alertFormattingEdits(edits);
            }, function (err) {
                unbind.dispose();
                throw err;
            });
        };
        FormatOnType.prototype.getId = function () {
            return FormatOnType.ID;
        };
        FormatOnType.prototype.dispose = function () {
            this.callOnDispose = lifecycle_1.dispose(this.callOnDispose);
            this.callOnModel = lifecycle_1.dispose(this.callOnModel);
        };
        FormatOnType.ID = 'editor.contrib.autoFormat';
        FormatOnType = __decorate([
            __param(1, editorWorkerService_1.IEditorWorkerService)
        ], FormatOnType);
        return FormatOnType;
    }());
    var FormatOnPaste = /** @class */ (function () {
        function FormatOnPaste(editor, workerService) {
            var _this = this;
            this.editor = editor;
            this.workerService = workerService;
            this.callOnDispose = [];
            this.callOnModel = [];
            this.callOnDispose.push(editor.onDidChangeConfiguration(function () { return _this.update(); }));
            this.callOnDispose.push(editor.onDidChangeModel(function () { return _this.update(); }));
            this.callOnDispose.push(editor.onDidChangeModelLanguage(function () { return _this.update(); }));
            this.callOnDispose.push(modes_1.DocumentRangeFormattingEditProviderRegistry.onDidChange(this.update, this));
        }
        FormatOnPaste.prototype.update = function () {
            var _this = this;
            // clean up
            this.callOnModel = lifecycle_1.dispose(this.callOnModel);
            // we are disabled
            if (!this.editor.getConfiguration().contribInfo.formatOnPaste) {
                return;
            }
            // no model
            if (!this.editor.getModel()) {
                return;
            }
            var model = this.editor.getModel();
            // no support
            var support = modes_1.DocumentRangeFormattingEditProviderRegistry.ordered(model)[0];
            if (!support || !support.provideDocumentRangeFormattingEdits) {
                return;
            }
            this.callOnModel.push(this.editor.onDidPaste(function (range) {
                _this.trigger(range);
            }));
        };
        FormatOnPaste.prototype.trigger = function (range) {
            var _this = this;
            if (this.editor.getSelections().length > 1) {
                return;
            }
            var model = this.editor.getModel();
            var _a = model.getOptions(), tabSize = _a.tabSize, insertSpaces = _a.insertSpaces;
            var state = new editorState_1.EditorState(this.editor, 1 /* Value */ | 4 /* Position */);
            format_1.getDocumentRangeFormattingEdits(model, range, { tabSize: tabSize, insertSpaces: insertSpaces }).then(function (edits) {
                return _this.workerService.computeMoreMinimalEdits(model.uri, edits);
            }).then(function (edits) {
                if (!state.validate(_this.editor) || arrays_1.isFalsyOrEmpty(edits)) {
                    return;
                }
                formatCommand_1.EditOperationsCommand.execute(_this.editor, edits, false);
                alertFormattingEdits(edits);
            });
        };
        FormatOnPaste.prototype.getId = function () {
            return FormatOnPaste.ID;
        };
        FormatOnPaste.prototype.dispose = function () {
            this.callOnDispose = lifecycle_1.dispose(this.callOnDispose);
            this.callOnModel = lifecycle_1.dispose(this.callOnModel);
        };
        FormatOnPaste.ID = 'editor.contrib.formatOnPaste';
        FormatOnPaste = __decorate([
            __param(1, editorWorkerService_1.IEditorWorkerService)
        ], FormatOnPaste);
        return FormatOnPaste;
    }());
    var AbstractFormatAction = /** @class */ (function (_super) {
        __extends(AbstractFormatAction, _super);
        function AbstractFormatAction() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        AbstractFormatAction.prototype.run = function (accessor, editor) {
            var workerService = accessor.get(editorWorkerService_1.IEditorWorkerService);
            var messageService = accessor.get(message_1.IMessageService);
            var formattingPromise = this._getFormattingEdits(editor);
            if (!formattingPromise) {
                return winjs_base_1.TPromise.as(void 0);
            }
            // Capture the state of the editor
            var state = new editorState_1.EditorState(editor, 1 /* Value */ | 4 /* Position */);
            // Receive formatted value from worker
            return formattingPromise.then(function (edits) { return workerService.computeMoreMinimalEdits(editor.getModel().uri, edits); }).then(function (edits) {
                if (!state.validate(editor) || arrays_1.isFalsyOrEmpty(edits)) {
                    return;
                }
                formatCommand_1.EditOperationsCommand.execute(editor, edits, false);
                alertFormattingEdits(edits);
                editor.focus();
            }, function (err) {
                if (err instanceof Error && err.name === format_1.NoProviderError.Name) {
                    messageService.show(message_1.Severity.Info, nls.localize('no.provider', "Sorry, but there is no formatter for '{0}'-files installed.", editor.getModel().getLanguageIdentifier().language));
                }
                else {
                    throw err;
                }
            });
        };
        return AbstractFormatAction;
    }(editorExtensions_1.EditorAction));
    exports.AbstractFormatAction = AbstractFormatAction;
    var FormatDocumentAction = /** @class */ (function (_super) {
        __extends(FormatDocumentAction, _super);
        function FormatDocumentAction() {
            return _super.call(this, {
                id: 'editor.action.formatDocument',
                label: nls.localize('formatDocument.label', "Format Document"),
                alias: 'Format Document',
                precondition: editorContextKeys_1.EditorContextKeys.writable,
                kbOpts: {
                    kbExpr: editorContextKeys_1.EditorContextKeys.textFocus,
                    primary: 1024 /* Shift */ | 512 /* Alt */ | 36 /* KEY_F */,
                    // secondary: [KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_D)],
                    linux: { primary: 2048 /* CtrlCmd */ | 1024 /* Shift */ | 39 /* KEY_I */ }
                },
                menuOpts: {
                    when: editorContextKeys_1.EditorContextKeys.hasDocumentFormattingProvider,
                    group: '1_modification',
                    order: 1.3
                }
            }) || this;
        }
        FormatDocumentAction.prototype._getFormattingEdits = function (editor) {
            var model = editor.getModel();
            var _a = model.getOptions(), tabSize = _a.tabSize, insertSpaces = _a.insertSpaces;
            return format_1.getDocumentFormattingEdits(model, { tabSize: tabSize, insertSpaces: insertSpaces });
        };
        return FormatDocumentAction;
    }(AbstractFormatAction));
    exports.FormatDocumentAction = FormatDocumentAction;
    var FormatSelectionAction = /** @class */ (function (_super) {
        __extends(FormatSelectionAction, _super);
        function FormatSelectionAction() {
            return _super.call(this, {
                id: 'editor.action.formatSelection',
                label: nls.localize('formatSelection.label', "Format Selection"),
                alias: 'Format Code',
                precondition: contextkey_1.ContextKeyExpr.and(editorContextKeys_1.EditorContextKeys.writable, editorContextKeys_1.EditorContextKeys.hasNonEmptySelection),
                kbOpts: {
                    kbExpr: editorContextKeys_1.EditorContextKeys.textFocus,
                    primary: keyCodes_1.KeyChord(2048 /* CtrlCmd */ | 41 /* KEY_K */, 2048 /* CtrlCmd */ | 36 /* KEY_F */)
                },
                menuOpts: {
                    when: contextkey_1.ContextKeyExpr.and(editorContextKeys_1.EditorContextKeys.hasDocumentSelectionFormattingProvider, editorContextKeys_1.EditorContextKeys.hasNonEmptySelection),
                    group: '1_modification',
                    order: 1.31
                }
            }) || this;
        }
        FormatSelectionAction.prototype._getFormattingEdits = function (editor) {
            var model = editor.getModel();
            var _a = model.getOptions(), tabSize = _a.tabSize, insertSpaces = _a.insertSpaces;
            return format_1.getDocumentRangeFormattingEdits(model, editor.getSelection(), { tabSize: tabSize, insertSpaces: insertSpaces });
        };
        return FormatSelectionAction;
    }(AbstractFormatAction));
    exports.FormatSelectionAction = FormatSelectionAction;
    editorExtensions_1.registerEditorContribution(FormatOnType);
    editorExtensions_1.registerEditorContribution(FormatOnPaste);
    editorExtensions_1.registerEditorAction(FormatDocumentAction);
    editorExtensions_1.registerEditorAction(FormatSelectionAction);
    // this is the old format action that does both (format document OR format selection)
    // and we keep it here such that existing keybinding configurations etc will still work
    commands_1.CommandsRegistry.registerCommand('editor.action.format', function (accessor) {
        var editor = accessor.get(codeEditorService_1.ICodeEditorService).getFocusedCodeEditor();
        if (editor) {
            return new /** @class */ (function (_super) {
                __extends(class_1, _super);
                function class_1() {
                    return _super.call(this, {}) || this;
                }
                class_1.prototype._getFormattingEdits = function (editor) {
                    var model = editor.getModel();
                    var editorSelection = editor.getSelection();
                    var _a = model.getOptions(), tabSize = _a.tabSize, insertSpaces = _a.insertSpaces;
                    return editorSelection.isEmpty()
                        ? format_1.getDocumentFormattingEdits(model, { tabSize: tabSize, insertSpaces: insertSpaces })
                        : format_1.getDocumentRangeFormattingEdits(model, editorSelection, { tabSize: tabSize, insertSpaces: insertSpaces });
                };
                return class_1;
            }(AbstractFormatAction))().run(accessor, editor);
        }
        return undefined;
    });
});
