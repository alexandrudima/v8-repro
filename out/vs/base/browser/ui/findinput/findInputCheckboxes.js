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
define(["require", "exports", "vs/nls", "vs/base/browser/ui/checkbox/checkbox", "vs/css!./findInputCheckboxes"], function (require, exports, nls, checkbox_1) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    var NLS_CASE_SENSITIVE_CHECKBOX_LABEL = nls.localize('caseDescription', "Match Case");
    var NLS_WHOLE_WORD_CHECKBOX_LABEL = nls.localize('wordsDescription', "Match Whole Word");
    var NLS_REGEX_CHECKBOX_LABEL = nls.localize('regexDescription', "Use Regular Expression");
    var CaseSensitiveCheckbox = /** @class */ (function (_super) {
        __extends(CaseSensitiveCheckbox, _super);
        function CaseSensitiveCheckbox(opts) {
            return _super.call(this, {
                actionClassName: 'monaco-case-sensitive',
                title: NLS_CASE_SENSITIVE_CHECKBOX_LABEL + opts.appendTitle,
                isChecked: opts.isChecked,
                onChange: opts.onChange,
                onKeyDown: opts.onKeyDown,
                inputActiveOptionBorder: opts.inputActiveOptionBorder
            }) || this;
        }
        return CaseSensitiveCheckbox;
    }(checkbox_1.Checkbox));
    exports.CaseSensitiveCheckbox = CaseSensitiveCheckbox;
    var WholeWordsCheckbox = /** @class */ (function (_super) {
        __extends(WholeWordsCheckbox, _super);
        function WholeWordsCheckbox(opts) {
            return _super.call(this, {
                actionClassName: 'monaco-whole-word',
                title: NLS_WHOLE_WORD_CHECKBOX_LABEL + opts.appendTitle,
                isChecked: opts.isChecked,
                onChange: opts.onChange,
                onKeyDown: opts.onKeyDown,
                inputActiveOptionBorder: opts.inputActiveOptionBorder
            }) || this;
        }
        return WholeWordsCheckbox;
    }(checkbox_1.Checkbox));
    exports.WholeWordsCheckbox = WholeWordsCheckbox;
    var RegexCheckbox = /** @class */ (function (_super) {
        __extends(RegexCheckbox, _super);
        function RegexCheckbox(opts) {
            return _super.call(this, {
                actionClassName: 'monaco-regex',
                title: NLS_REGEX_CHECKBOX_LABEL + opts.appendTitle,
                isChecked: opts.isChecked,
                onChange: opts.onChange,
                onKeyDown: opts.onKeyDown,
                inputActiveOptionBorder: opts.inputActiveOptionBorder
            }) || this;
        }
        return RegexCheckbox;
    }(checkbox_1.Checkbox));
    exports.RegexCheckbox = RegexCheckbox;
});
