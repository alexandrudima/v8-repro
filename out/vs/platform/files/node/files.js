/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // See https://github.com/Microsoft/vscode/issues/30180
    var WIN32_MAX_FILE_SIZE = 300 * 1024 * 1024; // 300 MB
    var GENERAL_MAX_FILE_SIZE = 16 * 1024 * 1024 * 1024; // 16 GB
    var arch = (typeof MonacoSnapshotArch !== 'undefined' ? MonacoSnapshotArch : process.arch);
    // See https://github.com/v8/v8/blob/5918a23a3d571b9625e5cce246bdd5b46ff7cd8b/src/heap/heap.cc#L149
    var WIN32_MAX_HEAP_SIZE = 700 * 1024 * 1024; // 700 MB
    var GENERAL_MAX_HEAP_SIZE = 700 * 2 * 1024 * 1024; // 1400 MB
    exports.MAX_FILE_SIZE = arch === 'ia32' ? WIN32_MAX_FILE_SIZE : GENERAL_MAX_FILE_SIZE;
    exports.MAX_HEAP_SIZE = arch === 'ia32' ? WIN32_MAX_HEAP_SIZE : GENERAL_MAX_HEAP_SIZE;
});
