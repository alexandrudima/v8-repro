/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
(function () {
    'use strict';
    var MonacoEnvironment = self.MonacoEnvironment;
    var monacoBaseUrl = MonacoEnvironment && MonacoEnvironment.baseUrl ? MonacoEnvironment.baseUrl : '../../../';
    if (typeof self.define !== 'function' || !self.define.amd) {
        importScripts(monacoBaseUrl + 'vs/loader.js');
    }
    require.config({
        baseUrl: monacoBaseUrl,
        catchError: true
    });
    var loadCode = function (moduleId) {
        require([moduleId], function (ws) {
            setTimeout(function () {
                var messageHandler = ws.create(function (msg) {
                    self.postMessage(msg);
                }, null);
                self.onmessage = function (e) { return messageHandler.onmessage(e.data); };
                while (beforeReadyMessages.length > 0) {
                    self.onmessage(beforeReadyMessages.shift());
                }
            }, 0);
        });
    };
    var isFirstMessage = true;
    var beforeReadyMessages = [];
    self.onmessage = function (message) {
        if (!isFirstMessage) {
            beforeReadyMessages.push(message);
            return;
        }
        isFirstMessage = false;
        loadCode(message.data);
    };
})();
