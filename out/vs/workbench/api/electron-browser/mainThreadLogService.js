/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
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
define(["require", "exports", "vs/workbench/api/electron-browser/extHostCustomers", "vs/platform/log/common/log", "vs/base/common/lifecycle", "vs/workbench/api/node/extHost.protocol"], function (require, exports, extHostCustomers_1, log_1, lifecycle_1, extHost_protocol_1) {
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    var MainThreadLogService = /** @class */ (function (_super) {
        __extends(MainThreadLogService, _super);
        function MainThreadLogService(extHostContext, logService) {
            var _this = _super.call(this) || this;
            _this._register(logService.onDidChangeLogLevel(function (level) { return extHostContext.getProxy(extHost_protocol_1.ExtHostContext.ExtHostLogService).$setLevel(level); }));
            return _this;
        }
        MainThreadLogService = __decorate([
            extHostCustomers_1.extHostCustomer,
            __param(1, log_1.ILogService)
        ], MainThreadLogService);
        return MainThreadLogService;
    }(lifecycle_1.Disposable));
    exports.MainThreadLogService = MainThreadLogService;
});
