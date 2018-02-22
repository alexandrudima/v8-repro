var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
define(["require", "exports", "vs/nls", "vs/base/common/types", "path", "vs/platform/extensions/common/extensionsRegistry", "vs/platform/extensions/common/extensions", "vs/base/common/event", "vs/workbench/services/themes/electron-browser/fileIconThemeData"], function (require, exports, nls, types, Paths, extensionsRegistry_1, extensions_1, event_1, fileIconThemeData_1) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    var iconThemeExtPoint = extensionsRegistry_1.ExtensionsRegistry.registerExtensionPoint('iconThemes', [], {
        description: nls.localize('vscode.extension.contributes.iconThemes', 'Contributes file icon themes.'),
        type: 'array',
        items: {
            type: 'object',
            defaultSnippets: [{ body: { id: '${1:id}', label: '${2:label}', path: './fileicons/${3:id}-icon-theme.json' } }],
            properties: {
                id: {
                    description: nls.localize('vscode.extension.contributes.iconThemes.id', 'Id of the icon theme as used in the user settings.'),
                    type: 'string'
                },
                label: {
                    description: nls.localize('vscode.extension.contributes.iconThemes.label', 'Label of the icon theme as shown in the UI.'),
                    type: 'string'
                },
                path: {
                    description: nls.localize('vscode.extension.contributes.iconThemes.path', 'Path of the icon theme definition file. The path is relative to the extension folder and is typically \'./icons/awesome-icon-theme.json\'.'),
                    type: 'string'
                }
            },
            required: ['path', 'id']
        }
    });
    var FileIconThemeStore = /** @class */ (function () {
        function FileIconThemeStore(extensionService) {
            this.extensionService = extensionService;
            this.knownIconThemes = [];
            this.onDidChangeEmitter = new event_1.Emitter();
            this.initialize();
        }
        Object.defineProperty(FileIconThemeStore.prototype, "onDidChange", {
            get: function () { return this.onDidChangeEmitter.event; },
            enumerable: true,
            configurable: true
        });
        FileIconThemeStore.prototype.initialize = function () {
            var _this = this;
            iconThemeExtPoint.setHandler(function (extensions) {
                for (var _i = 0, extensions_2 = extensions; _i < extensions_2.length; _i++) {
                    var ext = extensions_2[_i];
                    var extensionData = {
                        extensionId: ext.description.id,
                        extensionPublisher: ext.description.publisher,
                        extensionName: ext.description.name,
                        extensionIsBuiltin: ext.description.isBuiltin
                    };
                    _this.onIconThemes(ext.description.extensionFolderPath, extensionData, ext.value, ext.collector);
                }
                _this.onDidChangeEmitter.fire(_this.knownIconThemes);
            });
        };
        FileIconThemeStore.prototype.onIconThemes = function (extensionFolderPath, extensionData, iconThemes, collector) {
            var _this = this;
            if (!Array.isArray(iconThemes)) {
                collector.error(nls.localize('reqarray', "Extension point `{0}` must be an array.", iconThemeExtPoint.name));
                return;
            }
            iconThemes.forEach(function (iconTheme) {
                if (!iconTheme.path || !types.isString(iconTheme.path)) {
                    collector.error(nls.localize('reqpath', "Expected string in `contributes.{0}.path`. Provided value: {1}", iconThemeExtPoint.name, String(iconTheme.path)));
                    return;
                }
                if (!iconTheme.id || !types.isString(iconTheme.id)) {
                    collector.error(nls.localize('reqid', "Expected string in `contributes.{0}.id`. Provided value: {1}", iconThemeExtPoint.name, String(iconTheme.path)));
                    return;
                }
                var normalizedAbsolutePath = Paths.normalize(Paths.join(extensionFolderPath, iconTheme.path));
                if (normalizedAbsolutePath.indexOf(Paths.normalize(extensionFolderPath)) !== 0) {
                    collector.warn(nls.localize('invalid.path.1', "Expected `contributes.{0}.path` ({1}) to be included inside extension's folder ({2}). This might make the extension non-portable.", iconThemeExtPoint.name, normalizedAbsolutePath, extensionFolderPath));
                }
                var themeData = fileIconThemeData_1.FileIconThemeData.fromExtensionTheme(iconTheme, normalizedAbsolutePath, extensionData);
                _this.knownIconThemes.push(themeData);
            });
        };
        FileIconThemeStore.prototype.findThemeData = function (iconTheme) {
            return this.getFileIconThemes().then(function (allIconSets) {
                for (var _i = 0, allIconSets_1 = allIconSets; _i < allIconSets_1.length; _i++) {
                    var iconSet = allIconSets_1[_i];
                    if (iconSet.id === iconTheme) {
                        return iconSet;
                    }
                }
                return null;
            });
        };
        FileIconThemeStore.prototype.findThemeBySettingsId = function (settingsId) {
            return this.getFileIconThemes().then(function (allIconSets) {
                for (var _i = 0, allIconSets_2 = allIconSets; _i < allIconSets_2.length; _i++) {
                    var iconSet = allIconSets_2[_i];
                    if (iconSet.settingsId === settingsId) {
                        return iconSet;
                    }
                }
                return null;
            });
        };
        FileIconThemeStore.prototype.getFileIconThemes = function () {
            var _this = this;
            return this.extensionService.whenInstalledExtensionsRegistered().then(function (isReady) {
                return _this.knownIconThemes;
            });
        };
        FileIconThemeStore = __decorate([
            __param(0, extensions_1.IExtensionService)
        ], FileIconThemeStore);
        return FileIconThemeStore;
    }());
    exports.FileIconThemeStore = FileIconThemeStore;
});
