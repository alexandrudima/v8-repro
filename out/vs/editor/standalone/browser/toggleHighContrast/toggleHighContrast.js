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
define(["require", "exports", "vs/nls", "vs/editor/browser/editorExtensions", "vs/editor/standalone/common/standaloneThemeService"], function (require, exports, nls, editorExtensions_1, standaloneThemeService_1) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    var ToggleHighContrast = /** @class */ (function (_super) {
        __extends(ToggleHighContrast, _super);
        function ToggleHighContrast() {
            var _this = _super.call(this, {
                id: 'editor.action.toggleHighContrast',
                label: nls.localize('toggleHighContrast', "Toggle High Contrast Theme"),
                alias: 'Toggle High Contrast Theme',
                precondition: null
            }) || this;
            _this._originalThemeName = null;
            return _this;
        }
        ToggleHighContrast.prototype.run = function (accessor, editor) {
            var standaloneThemeService = accessor.get(standaloneThemeService_1.IStandaloneThemeService);
            if (this._originalThemeName) {
                // We must toggle back to the integrator's theme
                standaloneThemeService.setTheme(this._originalThemeName);
                this._originalThemeName = null;
            }
            else {
                this._originalThemeName = standaloneThemeService.getTheme().themeName;
                standaloneThemeService.setTheme('hc-black');
            }
        };
        return ToggleHighContrast;
    }(editorExtensions_1.EditorAction));
    editorExtensions_1.registerEditorAction(ToggleHighContrast);
});
