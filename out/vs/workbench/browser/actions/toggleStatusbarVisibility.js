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
define(["require", "exports", "vs/nls", "vs/platform/registry/common/platform", "vs/base/common/actions", "vs/platform/actions/common/actions", "vs/workbench/common/actions", "vs/platform/configuration/common/configuration", "vs/workbench/services/part/common/partService"], function (require, exports, nls, platform_1, actions_1, actions_2, actions_3, configuration_1, partService_1) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    var ToggleStatusbarVisibilityAction = /** @class */ (function (_super) {
        __extends(ToggleStatusbarVisibilityAction, _super);
        function ToggleStatusbarVisibilityAction(id, label, partService, configurationService) {
            var _this = _super.call(this, id, label) || this;
            _this.partService = partService;
            _this.configurationService = configurationService;
            _this.enabled = !!_this.partService;
            return _this;
        }
        ToggleStatusbarVisibilityAction.prototype.run = function () {
            var visibility = this.partService.isVisible(partService_1.Parts.STATUSBAR_PART);
            var newVisibilityValue = !visibility;
            return this.configurationService.updateValue(ToggleStatusbarVisibilityAction.statusbarVisibleKey, newVisibilityValue, configuration_1.ConfigurationTarget.USER);
        };
        ToggleStatusbarVisibilityAction.ID = 'workbench.action.toggleStatusbarVisibility';
        ToggleStatusbarVisibilityAction.LABEL = nls.localize('toggleStatusbar', "Toggle Status Bar Visibility");
        ToggleStatusbarVisibilityAction.statusbarVisibleKey = 'workbench.statusBar.visible';
        ToggleStatusbarVisibilityAction = __decorate([
            __param(2, partService_1.IPartService),
            __param(3, configuration_1.IConfigurationService)
        ], ToggleStatusbarVisibilityAction);
        return ToggleStatusbarVisibilityAction;
    }(actions_1.Action));
    exports.ToggleStatusbarVisibilityAction = ToggleStatusbarVisibilityAction;
    var registry = platform_1.Registry.as(actions_3.Extensions.WorkbenchActions);
    registry.registerWorkbenchAction(new actions_2.SyncActionDescriptor(ToggleStatusbarVisibilityAction, ToggleStatusbarVisibilityAction.ID, ToggleStatusbarVisibilityAction.LABEL), 'View: Toggle Status Bar Visibility', nls.localize('view', "View"));
});
