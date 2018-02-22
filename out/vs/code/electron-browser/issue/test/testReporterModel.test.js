/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
define(["require", "exports", "assert", "vs/code/electron-browser/issue/issueReporterModel"], function (require, exports, assert, issueReporterModel_1) {
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    suite('IssueReporter', function () {
        test('sets defaults to include all data', function () {
            var issueReporterModel = new issueReporterModel_1.IssueReporterModel();
            assert.deepEqual(issueReporterModel.getData(), {
                includeSystemInfo: true,
                includeWorkspaceInfo: true,
                includeProcessInfo: true,
                includeExtensions: true,
                includeSearchedExtensions: true,
                includeSettingsSearchDetails: true,
                reprosWithoutExtensions: false
            });
        });
        test('serializes model skeleton when no data is provided', function () {
            var issueReporterModel = new issueReporterModel_1.IssueReporterModel();
            assert.equal(issueReporterModel.serialize(), "\n### Issue Type\nFeature Request\n\n### Description\n\nundefined\n\n### VS Code Info\n\nVS Code version: undefined\nOS version: undefined\n\n\n<!-- generated by issue reporter -->");
        });
    });
});