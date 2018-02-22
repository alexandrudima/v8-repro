/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
define(["require", "exports", "vs/editor/browser/controller/coreCommands", "vs/editor/browser/widget/codeEditorWidget", "vs/editor/browser/widget/diffEditorWidget", "vs/editor/browser/widget/diffNavigator", "vs/editor/contrib/bracketMatching/bracketMatching", "vs/editor/contrib/caretOperations/caretOperations", "vs/editor/contrib/caretOperations/transpose", "vs/editor/contrib/clipboard/clipboard", "vs/editor/contrib/codelens/codelensController", "vs/editor/contrib/colorPicker/colorDetector", "vs/editor/contrib/comment/comment", "vs/editor/contrib/contextmenu/contextmenu", "vs/editor/contrib/cursorUndo/cursorUndo", "vs/editor/contrib/dnd/dnd", "vs/editor/contrib/find/findController", "vs/editor/contrib/folding/folding", "vs/editor/contrib/format/formatActions", "vs/editor/contrib/goToDeclaration/goToDeclarationCommands", "vs/editor/contrib/goToDeclaration/goToDeclarationMouse", "vs/editor/contrib/gotoError/gotoError", "vs/editor/contrib/hover/hover", "vs/editor/contrib/inPlaceReplace/inPlaceReplace", "vs/editor/contrib/linesOperations/linesOperations", "vs/editor/contrib/links/links", "vs/editor/contrib/multicursor/multicursor", "vs/editor/contrib/parameterHints/parameterHints", "vs/editor/contrib/quickFix/quickFixCommands", "vs/editor/contrib/referenceSearch/referenceSearch", "vs/editor/contrib/rename/rename", "vs/editor/contrib/smartSelect/smartSelect", "vs/editor/contrib/snippet/snippetController2", "vs/editor/contrib/suggest/suggestController", "vs/editor/contrib/toggleTabFocusMode/toggleTabFocusMode", "vs/editor/contrib/wordHighlighter/wordHighlighter", "vs/editor/contrib/wordOperations/wordOperations"], function (require, exports) {
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
});
