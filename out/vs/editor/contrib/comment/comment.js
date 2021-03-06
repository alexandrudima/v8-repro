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
define(["require", "exports", "vs/nls", "vs/base/common/keyCodes", "vs/editor/common/editorContextKeys", "vs/editor/browser/editorExtensions", "./blockCommentCommand", "./lineCommentCommand"], function (require, exports, nls, keyCodes_1, editorContextKeys_1, editorExtensions_1, blockCommentCommand_1, lineCommentCommand_1) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    var CommentLineAction = /** @class */ (function (_super) {
        __extends(CommentLineAction, _super);
        function CommentLineAction(type, opts) {
            var _this = _super.call(this, opts) || this;
            _this._type = type;
            return _this;
        }
        CommentLineAction.prototype.run = function (accessor, editor) {
            var model = editor.getModel();
            if (!model) {
                return;
            }
            var commands = [];
            var selections = editor.getSelections();
            var opts = model.getOptions();
            for (var i = 0; i < selections.length; i++) {
                commands.push(new lineCommentCommand_1.LineCommentCommand(selections[i], opts.tabSize, this._type));
            }
            editor.pushUndoStop();
            editor.executeCommands(this.id, commands);
            editor.pushUndoStop();
        };
        return CommentLineAction;
    }(editorExtensions_1.EditorAction));
    var ToggleCommentLineAction = /** @class */ (function (_super) {
        __extends(ToggleCommentLineAction, _super);
        function ToggleCommentLineAction() {
            return _super.call(this, 0 /* Toggle */, {
                id: 'editor.action.commentLine',
                label: nls.localize('comment.line', "Toggle Line Comment"),
                alias: 'Toggle Line Comment',
                precondition: editorContextKeys_1.EditorContextKeys.writable,
                kbOpts: {
                    kbExpr: editorContextKeys_1.EditorContextKeys.textFocus,
                    primary: 2048 /* CtrlCmd */ | 85 /* US_SLASH */
                }
            }) || this;
        }
        return ToggleCommentLineAction;
    }(CommentLineAction));
    var AddLineCommentAction = /** @class */ (function (_super) {
        __extends(AddLineCommentAction, _super);
        function AddLineCommentAction() {
            return _super.call(this, 1 /* ForceAdd */, {
                id: 'editor.action.addCommentLine',
                label: nls.localize('comment.line.add', "Add Line Comment"),
                alias: 'Add Line Comment',
                precondition: editorContextKeys_1.EditorContextKeys.writable,
                kbOpts: {
                    kbExpr: editorContextKeys_1.EditorContextKeys.textFocus,
                    primary: keyCodes_1.KeyChord(2048 /* CtrlCmd */ | 41 /* KEY_K */, 2048 /* CtrlCmd */ | 33 /* KEY_C */)
                }
            }) || this;
        }
        return AddLineCommentAction;
    }(CommentLineAction));
    var RemoveLineCommentAction = /** @class */ (function (_super) {
        __extends(RemoveLineCommentAction, _super);
        function RemoveLineCommentAction() {
            return _super.call(this, 2 /* ForceRemove */, {
                id: 'editor.action.removeCommentLine',
                label: nls.localize('comment.line.remove', "Remove Line Comment"),
                alias: 'Remove Line Comment',
                precondition: editorContextKeys_1.EditorContextKeys.writable,
                kbOpts: {
                    kbExpr: editorContextKeys_1.EditorContextKeys.textFocus,
                    primary: keyCodes_1.KeyChord(2048 /* CtrlCmd */ | 41 /* KEY_K */, 2048 /* CtrlCmd */ | 51 /* KEY_U */)
                }
            }) || this;
        }
        return RemoveLineCommentAction;
    }(CommentLineAction));
    var BlockCommentAction = /** @class */ (function (_super) {
        __extends(BlockCommentAction, _super);
        function BlockCommentAction() {
            return _super.call(this, {
                id: 'editor.action.blockComment',
                label: nls.localize('comment.block', "Toggle Block Comment"),
                alias: 'Toggle Block Comment',
                precondition: editorContextKeys_1.EditorContextKeys.writable,
                kbOpts: {
                    kbExpr: editorContextKeys_1.EditorContextKeys.textFocus,
                    primary: 1024 /* Shift */ | 512 /* Alt */ | 31 /* KEY_A */,
                    linux: { primary: 2048 /* CtrlCmd */ | 1024 /* Shift */ | 31 /* KEY_A */ }
                }
            }) || this;
        }
        BlockCommentAction.prototype.run = function (accessor, editor) {
            var commands = [];
            var selections = editor.getSelections();
            for (var i = 0; i < selections.length; i++) {
                commands.push(new blockCommentCommand_1.BlockCommentCommand(selections[i]));
            }
            editor.pushUndoStop();
            editor.executeCommands(this.id, commands);
            editor.pushUndoStop();
        };
        return BlockCommentAction;
    }(editorExtensions_1.EditorAction));
    editorExtensions_1.registerEditorAction(ToggleCommentLineAction);
    editorExtensions_1.registerEditorAction(AddLineCommentAction);
    editorExtensions_1.registerEditorAction(RemoveLineCommentAction);
    editorExtensions_1.registerEditorAction(BlockCommentAction);
});
