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
define(["require", "exports"], function (require, exports) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    var ContextMenuEvent = /** @class */ (function () {
        function ContextMenuEvent(posx, posy, target) {
            this._posx = posx;
            this._posy = posy;
            this._target = target;
        }
        ContextMenuEvent.prototype.preventDefault = function () {
            // no-op
        };
        ContextMenuEvent.prototype.stopPropagation = function () {
            // no-op
        };
        Object.defineProperty(ContextMenuEvent.prototype, "posx", {
            get: function () {
                return this._posx;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ContextMenuEvent.prototype, "posy", {
            get: function () {
                return this._posy;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ContextMenuEvent.prototype, "target", {
            get: function () {
                return this._target;
            },
            enumerable: true,
            configurable: true
        });
        return ContextMenuEvent;
    }());
    exports.ContextMenuEvent = ContextMenuEvent;
    var MouseContextMenuEvent = /** @class */ (function (_super) {
        __extends(MouseContextMenuEvent, _super);
        function MouseContextMenuEvent(originalEvent) {
            var _this = _super.call(this, originalEvent.posx, originalEvent.posy, originalEvent.target) || this;
            _this.originalEvent = originalEvent;
            return _this;
        }
        MouseContextMenuEvent.prototype.preventDefault = function () {
            this.originalEvent.preventDefault();
        };
        MouseContextMenuEvent.prototype.stopPropagation = function () {
            this.originalEvent.stopPropagation();
        };
        return MouseContextMenuEvent;
    }(ContextMenuEvent));
    exports.MouseContextMenuEvent = MouseContextMenuEvent;
    var KeyboardContextMenuEvent = /** @class */ (function (_super) {
        __extends(KeyboardContextMenuEvent, _super);
        function KeyboardContextMenuEvent(posx, posy, originalEvent) {
            var _this = _super.call(this, posx, posy, originalEvent.target) || this;
            _this.originalEvent = originalEvent;
            return _this;
        }
        KeyboardContextMenuEvent.prototype.preventDefault = function () {
            this.originalEvent.preventDefault();
        };
        KeyboardContextMenuEvent.prototype.stopPropagation = function () {
            this.originalEvent.stopPropagation();
        };
        return KeyboardContextMenuEvent;
    }(ContextMenuEvent));
    exports.KeyboardContextMenuEvent = KeyboardContextMenuEvent;
    var DragOverEffect;
    (function (DragOverEffect) {
        DragOverEffect[DragOverEffect["COPY"] = 0] = "COPY";
        DragOverEffect[DragOverEffect["MOVE"] = 1] = "MOVE";
    })(DragOverEffect = exports.DragOverEffect || (exports.DragOverEffect = {}));
    var DragOverBubble;
    (function (DragOverBubble) {
        DragOverBubble[DragOverBubble["BUBBLE_DOWN"] = 0] = "BUBBLE_DOWN";
        DragOverBubble[DragOverBubble["BUBBLE_UP"] = 1] = "BUBBLE_UP";
    })(DragOverBubble = exports.DragOverBubble || (exports.DragOverBubble = {}));
    exports.DRAG_OVER_REJECT = { accept: false };
    exports.DRAG_OVER_ACCEPT = { accept: true };
    exports.DRAG_OVER_ACCEPT_BUBBLE_UP = { accept: true, bubble: DragOverBubble.BUBBLE_UP };
    exports.DRAG_OVER_ACCEPT_BUBBLE_DOWN = function (autoExpand) {
        if (autoExpand === void 0) { autoExpand = false; }
        return ({ accept: true, bubble: DragOverBubble.BUBBLE_DOWN, autoExpand: autoExpand });
    };
    exports.DRAG_OVER_ACCEPT_BUBBLE_UP_COPY = { accept: true, bubble: DragOverBubble.BUBBLE_UP, effect: DragOverEffect.COPY };
    exports.DRAG_OVER_ACCEPT_BUBBLE_DOWN_COPY = function (autoExpand) {
        if (autoExpand === void 0) { autoExpand = false; }
        return ({ accept: true, bubble: DragOverBubble.BUBBLE_DOWN, effect: DragOverEffect.COPY, autoExpand: autoExpand });
    };
});
