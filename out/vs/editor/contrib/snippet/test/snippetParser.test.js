define(["require", "exports", "assert", "vs/editor/contrib/snippet/snippetParser"], function (require, exports, assert, snippetParser_1) {
    /*---------------------------------------------------------------------------------------------
     *  Copyright (c) Microsoft Corporation. All rights reserved.
     *  Licensed under the MIT License. See License.txt in the project root for license information.
     *--------------------------------------------------------------------------------------------*/
    'use strict';
    Object.defineProperty(exports, "__esModule", { value: true });
    suite('SnippetParser', function () {
        test('Scanner', function () {
            var scanner = new snippetParser_1.Scanner();
            assert.equal(scanner.next().type, snippetParser_1.TokenType.EOF);
            scanner.text('abc');
            assert.equal(scanner.next().type, snippetParser_1.TokenType.VariableName);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.EOF);
            scanner.text('{{abc}}');
            assert.equal(scanner.next().type, snippetParser_1.TokenType.CurlyOpen);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.CurlyOpen);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.VariableName);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.CurlyClose);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.CurlyClose);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.EOF);
            scanner.text('abc() ');
            assert.equal(scanner.next().type, snippetParser_1.TokenType.VariableName);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Format);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.EOF);
            scanner.text('abc 123');
            assert.equal(scanner.next().type, snippetParser_1.TokenType.VariableName);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Format);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Int);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.EOF);
            scanner.text('$foo');
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Dollar);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.VariableName);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.EOF);
            scanner.text('$foo_bar');
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Dollar);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.VariableName);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.EOF);
            scanner.text('$foo-bar');
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Dollar);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.VariableName);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Dash);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.VariableName);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.EOF);
            scanner.text('${foo}');
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Dollar);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.CurlyOpen);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.VariableName);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.CurlyClose);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.EOF);
            scanner.text('${1223:foo}');
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Dollar);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.CurlyOpen);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Int);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Colon);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.VariableName);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.CurlyClose);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.EOF);
            scanner.text('\\${}');
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Backslash);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Dollar);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.CurlyOpen);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.CurlyClose);
            scanner.text('${foo/regex/format/option}');
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Dollar);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.CurlyOpen);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.VariableName);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Forwardslash);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.VariableName);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Forwardslash);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.VariableName);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.Forwardslash);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.VariableName);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.CurlyClose);
            assert.equal(scanner.next().type, snippetParser_1.TokenType.EOF);
        });
        function assertText(value, expected) {
            var p = new snippetParser_1.SnippetParser();
            var actual = p.text(value);
            assert.equal(actual, expected);
        }
        function assertMarker(input) {
            var ctors = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                ctors[_i - 1] = arguments[_i];
            }
            var marker;
            if (input instanceof snippetParser_1.TextmateSnippet) {
                marker = input.children;
            }
            else if (typeof input === 'string') {
                var p = new snippetParser_1.SnippetParser();
                marker = p.parse(input).children;
            }
            else {
                marker = input;
            }
            while (marker.length > 0) {
                var m = marker.pop();
                var ctor = ctors.pop();
                assert.ok(m instanceof ctor);
            }
            assert.equal(marker.length, ctors.length);
            assert.equal(marker.length, 0);
        }
        function assertTextAndMarker(value, escaped) {
            var ctors = [];
            for (var _i = 2; _i < arguments.length; _i++) {
                ctors[_i - 2] = arguments[_i];
            }
            assertText(value, escaped);
            assertMarker.apply(void 0, [value].concat(ctors));
        }
        function assertEscaped(value, expected) {
            var actual = snippetParser_1.SnippetParser.escape(value);
            assert.equal(actual, expected);
        }
        test('Parser, escaped', function () {
            assertEscaped('foo$0', 'foo\\$0');
            assertEscaped('foo\\$0', 'foo\\\\\\$0');
            assertEscaped('f$1oo$0', 'f\\$1oo\\$0');
            assertEscaped('${1:foo}$0', '\\${1:foo\\}\\$0');
            assertEscaped('$', '\\$');
        });
        test('Parser, text', function () {
            assertText('$', '$');
            assertText('\\\\$', '\\$');
            assertText('{', '{');
            assertText('\\}', '}');
            assertText('\\abc', '\\abc');
            assertText('foo${f:\\}}bar', 'foo}bar');
            assertText('\\{', '\\{');
            assertText('I need \\\\\\$', 'I need \\$');
            assertText('\\', '\\');
            assertText('\\{{', '\\{{');
            assertText('{{', '{{');
            assertText('{{dd', '{{dd');
            assertText('}}', '}}');
            assertText('ff}}', 'ff}}');
            assertText('farboo', 'farboo');
            assertText('far{{}}boo', 'far{{}}boo');
            assertText('far{{123}}boo', 'far{{123}}boo');
            assertText('far\\{{123}}boo', 'far\\{{123}}boo');
            assertText('far{{id:bern}}boo', 'far{{id:bern}}boo');
            assertText('far{{id:bern {{basel}}}}boo', 'far{{id:bern {{basel}}}}boo');
            assertText('far{{id:bern {{id:basel}}}}boo', 'far{{id:bern {{id:basel}}}}boo');
            assertText('far{{id:bern {{id2:basel}}}}boo', 'far{{id:bern {{id2:basel}}}}boo');
        });
        test('Parser, TM text', function () {
            assertTextAndMarker('foo${1:bar}}', 'foobar}', snippetParser_1.Text, snippetParser_1.Placeholder, snippetParser_1.Text);
            assertTextAndMarker('foo${1:bar}${2:foo}}', 'foobarfoo}', snippetParser_1.Text, snippetParser_1.Placeholder, snippetParser_1.Placeholder, snippetParser_1.Text);
            assertTextAndMarker('foo${1:bar\\}${2:foo}}', 'foobar}foo', snippetParser_1.Text, snippetParser_1.Placeholder);
            var _a = new snippetParser_1.SnippetParser().parse('foo${1:bar\\}${2:foo}}').children, placeholder = _a[1];
            var children = placeholder.children;
            assert.equal(placeholder.index, '1');
            assert.ok(children[0] instanceof snippetParser_1.Text);
            assert.equal(children[0].toString(), 'bar}');
            assert.ok(children[1] instanceof snippetParser_1.Placeholder);
            assert.equal(children[1].toString(), 'foo');
        });
        test('Parser, placeholder', function () {
            assertTextAndMarker('farboo', 'farboo', snippetParser_1.Text);
            assertTextAndMarker('far{{}}boo', 'far{{}}boo', snippetParser_1.Text);
            assertTextAndMarker('far{{123}}boo', 'far{{123}}boo', snippetParser_1.Text);
            assertTextAndMarker('far\\{{123}}boo', 'far\\{{123}}boo', snippetParser_1.Text);
        });
        test('Parser, literal code', function () {
            assertTextAndMarker('far`123`boo', 'far`123`boo', snippetParser_1.Text);
            assertTextAndMarker('far\\`123\\`boo', 'far\\`123\\`boo', snippetParser_1.Text);
        });
        test('Parser, variables/tabstop', function () {
            assertTextAndMarker('$far-boo', '-boo', snippetParser_1.Variable, snippetParser_1.Text);
            assertTextAndMarker('\\$far-boo', '$far-boo', snippetParser_1.Text);
            assertTextAndMarker('far$farboo', 'far', snippetParser_1.Text, snippetParser_1.Variable);
            assertTextAndMarker('far${farboo}', 'far', snippetParser_1.Text, snippetParser_1.Variable);
            assertTextAndMarker('$123', '', snippetParser_1.Placeholder);
            assertTextAndMarker('$farboo', '', snippetParser_1.Variable);
            assertTextAndMarker('$far12boo', '', snippetParser_1.Variable);
            assertTextAndMarker('000_${far}_000', '000__000', snippetParser_1.Text, snippetParser_1.Variable, snippetParser_1.Text);
            assertTextAndMarker('FFF_${TM_SELECTED_TEXT}_FFF$0', 'FFF__FFF', snippetParser_1.Text, snippetParser_1.Variable, snippetParser_1.Text, snippetParser_1.Placeholder);
        });
        test('Parser, variables/placeholder with defaults', function () {
            assertTextAndMarker('${name:value}', 'value', snippetParser_1.Variable);
            assertTextAndMarker('${1:value}', 'value', snippetParser_1.Placeholder);
            assertTextAndMarker('${1:bar${2:foo}bar}', 'barfoobar', snippetParser_1.Placeholder);
            assertTextAndMarker('${name:value', '${name:value', snippetParser_1.Text);
            assertTextAndMarker('${1:bar${2:foobar}', '${1:barfoobar', snippetParser_1.Text, snippetParser_1.Placeholder);
        });
        test('Parser, variable transforms', function () {
            assertTextAndMarker('${foo///}', '', snippetParser_1.Variable);
            assertTextAndMarker('${foo/regex/format/gmi}', '', snippetParser_1.Variable);
            assertTextAndMarker('${foo/([A-Z][a-z])/format/}', '', snippetParser_1.Variable);
            // invalid regex
            assertTextAndMarker('${foo/([A-Z][a-z])/format/GMI}', '${foo/([A-Z][a-z])/format/GMI}', snippetParser_1.Text);
            assertTextAndMarker('${foo/([A-Z][a-z])/format/funky}', '${foo/([A-Z][a-z])/format/funky}', snippetParser_1.Text);
            assertTextAndMarker('${foo/([A-Z][a-z]/format/}', '${foo/([A-Z][a-z]/format/}', snippetParser_1.Text);
            // tricky regex
            assertTextAndMarker('${foo/m\\/atch/$1/i}', '', snippetParser_1.Variable);
            assertMarker('${foo/regex\/format/options}', snippetParser_1.Text);
            // incomplete
            assertTextAndMarker('${foo///', '${foo///', snippetParser_1.Text);
            assertTextAndMarker('${foo/regex/format/options', '${foo/regex/format/options', snippetParser_1.Text);
            // format string
            assertMarker('${foo/.*/${0:fooo}/i}', snippetParser_1.Variable);
            assertMarker('${foo/.*/${1}/i}', snippetParser_1.Variable);
            assertMarker('${foo/.*/$1/i}', snippetParser_1.Variable);
            assertMarker('${foo/.*/This-$1-encloses/i}', snippetParser_1.Variable);
            assertMarker('${foo/.*/complex${1:else}/i}', snippetParser_1.Variable);
            assertMarker('${foo/.*/complex${1:-else}/i}', snippetParser_1.Variable);
            assertMarker('${foo/.*/complex${1:+if}/i}', snippetParser_1.Variable);
            assertMarker('${foo/.*/complex${1:?if:else}/i}', snippetParser_1.Variable);
            assertMarker('${foo/.*/complex${1:/upcase}/i}', snippetParser_1.Variable);
        });
        test('No way to escape forward slash in snippet regex #36715', function () {
            assertMarker('${TM_DIRECTORY/src\\//$1/}', snippetParser_1.Variable);
        });
        test('No way to escape forward slash in snippet format section #37562', function () {
            assertMarker('${TM_SELECTED_TEXT/a/\\/$1/g}', snippetParser_1.Variable);
            assertMarker('${TM_SELECTED_TEXT/a/in\\/$1ner/g}', snippetParser_1.Variable);
            assertMarker('${TM_SELECTED_TEXT/a/end\\//g}', snippetParser_1.Variable);
        });
        test('Parser, placeholder with choice', function () {
            assertTextAndMarker('${1|one,two,three|}', 'one', snippetParser_1.Placeholder);
            assertTextAndMarker('${1|one|}', 'one', snippetParser_1.Placeholder);
            assertTextAndMarker('${1|one1,two2|}', 'one1', snippetParser_1.Placeholder);
            assertTextAndMarker('${1|one1\\,two2|}', 'one1,two2', snippetParser_1.Placeholder);
            assertTextAndMarker('${1|one1\\|two2|}', 'one1|two2', snippetParser_1.Placeholder);
            assertTextAndMarker('${1|one1\\atwo2|}', 'one1\\atwo2', snippetParser_1.Placeholder);
            assertTextAndMarker('${1|one,two,three,|}', '${1|one,two,three,|}', snippetParser_1.Text);
            assertTextAndMarker('${1|one,', '${1|one,', snippetParser_1.Text);
            var p = new snippetParser_1.SnippetParser();
            var snippet = p.parse('${1|one,two,three|}');
            assertMarker(snippet, snippetParser_1.Placeholder);
            var expected = [snippetParser_1.Placeholder, snippetParser_1.Text, snippetParser_1.Text, snippetParser_1.Text];
            snippet.walk(function (marker) {
                assert.equal(marker, expected.shift());
                return true;
            });
        });
        test('Snippet choices: unable to escape comma and pipe, #31521', function () {
            assertTextAndMarker('console.log(${1|not\\, not, five, 5, 1   23|});', 'console.log(not, not);', snippetParser_1.Text, snippetParser_1.Placeholder, snippetParser_1.Text);
        });
        test('Marker, toTextmateString()', function () {
            function assertTextsnippetString(input, expected) {
                var snippet = new snippetParser_1.SnippetParser().parse(input);
                var actual = snippet.toTextmateString();
                assert.equal(actual, expected);
            }
            assertTextsnippetString('$1', '$1');
            assertTextsnippetString('\\$1', '\\$1');
            assertTextsnippetString('console.log(${1|not\\, not, five, 5, 1   23|});', 'console.log(${1|not\\, not, five, 5, 1   23|});');
            assertTextsnippetString('console.log(${1|not\\, not, \\| five, 5, 1   23|});', 'console.log(${1|not\\, not, \\| five, 5, 1   23|});');
            assertTextsnippetString('this is text', 'this is text');
            assertTextsnippetString('this ${1:is ${2:nested with $var}}', 'this ${1:is ${2:nested with ${var}}}');
            assertTextsnippetString('this ${1:is ${2:nested with $var}}}', 'this ${1:is ${2:nested with ${var}}}\\}');
        });
        test('Marker, toTextmateString() <-> identity', function () {
            function assertIdent(input) {
                // full loop: (1) parse input, (2) generate textmate string, (3) parse, (4) ensure both trees are equal
                var snippet = new snippetParser_1.SnippetParser().parse(input);
                var input2 = snippet.toTextmateString();
                var snippet2 = new snippetParser_1.SnippetParser().parse(input2);
                function checkCheckChildren(marker1, marker2) {
                    assert.ok(marker1 instanceof Object.getPrototypeOf(marker2).constructor);
                    assert.ok(marker2 instanceof Object.getPrototypeOf(marker1).constructor);
                    assert.equal(marker1.children.length, marker2.children.length);
                    assert.equal(marker1.toString(), marker2.toString());
                    for (var i = 0; i < marker1.children.length; i++) {
                        checkCheckChildren(marker1.children[i], marker2.children[i]);
                    }
                }
                checkCheckChildren(snippet, snippet2);
            }
            assertIdent('$1');
            assertIdent('\\$1');
            assertIdent('console.log(${1|not\\, not, five, 5, 1   23|});');
            assertIdent('console.log(${1|not\\, not, \\| five, 5, 1   23|});');
            assertIdent('this is text');
            assertIdent('this ${1:is ${2:nested with $var}}');
            assertIdent('this ${1:is ${2:nested with $var}}}');
            assertIdent('this ${1:is ${2:nested with $var}} and repeating $1');
        });
        test('Parser, choise marker', function () {
            var placeholders = new snippetParser_1.SnippetParser().parse('${1|one,two,three|}').placeholders;
            assert.equal(placeholders.length, 1);
            assert.ok(placeholders[0].choice instanceof snippetParser_1.Choice);
            assert.ok(placeholders[0].children[0] instanceof snippetParser_1.Choice);
            assert.equal(placeholders[0].children[0].options.length, 3);
            assertText('${1|one,two,three|}', 'one');
            assertText('\\${1|one,two,three|}', '${1|one,two,three|}');
            assertText('${1\\|one,two,three|}', '${1\\|one,two,three|}');
            assertText('${1||}', '${1||}');
        });
        test('Parser, only textmate', function () {
            var p = new snippetParser_1.SnippetParser();
            assertMarker(p.parse('far{{}}boo'), snippetParser_1.Text);
            assertMarker(p.parse('far{{123}}boo'), snippetParser_1.Text);
            assertMarker(p.parse('far\\{{123}}boo'), snippetParser_1.Text);
            assertMarker(p.parse('far$0boo'), snippetParser_1.Text, snippetParser_1.Placeholder, snippetParser_1.Text);
            assertMarker(p.parse('far${123}boo'), snippetParser_1.Text, snippetParser_1.Placeholder, snippetParser_1.Text);
            assertMarker(p.parse('far\\${123}boo'), snippetParser_1.Text);
        });
        test('Parser, real world', function () {
            var marker = new snippetParser_1.SnippetParser().parse('console.warn(${1: $TM_SELECTED_TEXT })').children;
            assert.equal(marker[0].toString(), 'console.warn(');
            assert.ok(marker[1] instanceof snippetParser_1.Placeholder);
            assert.equal(marker[2].toString(), ')');
            var placeholder = marker[1];
            assert.equal(placeholder, false);
            assert.equal(placeholder.index, '1');
            assert.equal(placeholder.children.length, 3);
            assert.ok(placeholder.children[0] instanceof snippetParser_1.Text);
            assert.ok(placeholder.children[1] instanceof snippetParser_1.Variable);
            assert.ok(placeholder.children[2] instanceof snippetParser_1.Text);
            assert.equal(placeholder.children[0].toString(), ' ');
            assert.equal(placeholder.children[1].toString(), '');
            assert.equal(placeholder.children[2].toString(), ' ');
            var nestedVariable = placeholder.children[1];
            assert.equal(nestedVariable.name, 'TM_SELECTED_TEXT');
            assert.equal(nestedVariable.children.length, 0);
            marker = new snippetParser_1.SnippetParser().parse('$TM_SELECTED_TEXT').children;
            assert.equal(marker.length, 1);
            assert.ok(marker[0] instanceof snippetParser_1.Variable);
        });
        test('Parser, default placeholder values', function () {
            assertMarker('errorContext: `${1:err}`, error: $1', snippetParser_1.Text, snippetParser_1.Placeholder, snippetParser_1.Text, snippetParser_1.Placeholder);
            var _a = new snippetParser_1.SnippetParser().parse('errorContext: `${1:err}`, error:$1').children, p1 = _a[1], p2 = _a[3];
            assert.equal(p1.index, '1');
            assert.equal(p1.children.length, '1');
            assert.equal(p1.children[0], 'err');
            assert.equal(p2.index, '1');
            assert.equal(p2.children.length, '1');
            assert.equal(p2.children[0], 'err');
        });
        test('Repeated snippet placeholder should always inherit, #31040', function () {
            assertText('${1:foo}-abc-$1', 'foo-abc-foo');
            assertText('${1:foo}-abc-${1}', 'foo-abc-foo');
            assertText('${1:foo}-abc-${1:bar}', 'foo-abc-foo');
            assertText('${1}-abc-${1:foo}', 'foo-abc-foo');
        });
        test('backspace esapce in TM only, #16212', function () {
            var actual = new snippetParser_1.SnippetParser().text('Foo \\\\${abc}bar');
            assert.equal(actual, 'Foo \\bar');
        });
        test('colon as variable/placeholder value, #16717', function () {
            var actual = new snippetParser_1.SnippetParser().text('${TM_SELECTED_TEXT:foo:bar}');
            assert.equal(actual, 'foo:bar');
            actual = new snippetParser_1.SnippetParser().text('${1:foo:bar}');
            assert.equal(actual, 'foo:bar');
        });
        test('incomplete placeholder', function () {
            assertTextAndMarker('${1:}', '', snippetParser_1.Placeholder);
        });
        test('marker#len', function () {
            function assertLen(template) {
                var lengths = [];
                for (var _i = 1; _i < arguments.length; _i++) {
                    lengths[_i - 1] = arguments[_i];
                }
                var snippet = new snippetParser_1.SnippetParser().parse(template, true);
                snippet.walk(function (m) {
                    var expected = lengths.shift();
                    assert.equal(m.len(), expected);
                    return true;
                });
                assert.equal(lengths.length, 0);
            }
            assertLen('text$0', 4, 0);
            assertLen('$1text$0', 0, 4, 0);
            assertLen('te$1xt$0', 2, 0, 2, 0);
            assertLen('errorContext: `${1:err}`, error: $0', 15, 0, 3, 10, 0);
            assertLen('errorContext: `${1:err}`, error: $1$0', 15, 0, 3, 10, 0, 3, 0);
            assertLen('$TM_SELECTED_TEXT$0', 0, 0);
            assertLen('${TM_SELECTED_TEXT:def}$0', 0, 3, 0);
        });
        test('parser, parent node', function () {
            var snippet = new snippetParser_1.SnippetParser().parse('This ${1:is ${2:nested}}$0', true);
            assert.equal(snippet.placeholders.length, 3);
            var _a = snippet.placeholders, first = _a[0], second = _a[1];
            assert.equal(first.index, '1');
            assert.equal(second.index, '2');
            assert.ok(second.parent === first);
            assert.ok(first.parent === snippet);
            snippet = new snippetParser_1.SnippetParser().parse('${VAR:default${1:value}}$0', true);
            assert.equal(snippet.placeholders.length, 2);
            first = snippet.placeholders[0];
            assert.equal(first.index, '1');
            assert.ok(snippet.children[0] instanceof snippetParser_1.Variable);
            assert.ok(first.parent === snippet.children[0]);
        });
        test('TextmateSnippet#enclosingPlaceholders', function () {
            var snippet = new snippetParser_1.SnippetParser().parse('This ${1:is ${2:nested}}$0', true);
            var _a = snippet.placeholders, first = _a[0], second = _a[1];
            assert.deepEqual(snippet.enclosingPlaceholders(first), []);
            assert.deepEqual(snippet.enclosingPlaceholders(second), [first]);
        });
        test('TextmateSnippet#offset', function () {
            var snippet = new snippetParser_1.SnippetParser().parse('te$1xt', true);
            assert.equal(snippet.offset(snippet.children[0]), 0);
            assert.equal(snippet.offset(snippet.children[1]), 2);
            assert.equal(snippet.offset(snippet.children[2]), 2);
            snippet = new snippetParser_1.SnippetParser().parse('${TM_SELECTED_TEXT:def}', true);
            assert.equal(snippet.offset(snippet.children[0]), 0);
            assert.equal(snippet.offset(snippet.children[0].children[0]), 0);
            // forgein marker
            assert.equal(snippet.offset(new snippetParser_1.Text('foo')), -1);
        });
        test('TextmateSnippet#placeholder', function () {
            var snippet = new snippetParser_1.SnippetParser().parse('te$1xt$0', true);
            var placeholders = snippet.placeholders;
            assert.equal(placeholders.length, 2);
            snippet = new snippetParser_1.SnippetParser().parse('te$1xt$1$0', true);
            placeholders = snippet.placeholders;
            assert.equal(placeholders.length, 3);
            snippet = new snippetParser_1.SnippetParser().parse('te$1xt$2$0', true);
            placeholders = snippet.placeholders;
            assert.equal(placeholders.length, 3);
            snippet = new snippetParser_1.SnippetParser().parse('${1:bar${2:foo}bar}$0', true);
            placeholders = snippet.placeholders;
            assert.equal(placeholders.length, 3);
        });
        test('TextmateSnippet#replace 1/2', function () {
            var snippet = new snippetParser_1.SnippetParser().parse('aaa${1:bbb${2:ccc}}$0', true);
            assert.equal(snippet.placeholders.length, 3);
            var _a = snippet.placeholders, second = _a[1];
            assert.equal(second.index, '2');
            var enclosing = snippet.enclosingPlaceholders(second);
            assert.equal(enclosing.length, 1);
            assert.equal(enclosing[0].index, '1');
            var nested = new snippetParser_1.SnippetParser().parse('ddd$1eee$0', true);
            snippet.replace(second, nested.children);
            assert.equal(snippet.toString(), 'aaabbbdddeee');
            assert.equal(snippet.placeholders.length, 4);
            assert.equal(snippet.placeholders[0].index, '1');
            assert.equal(snippet.placeholders[1].index, '1');
            assert.equal(snippet.placeholders[2].index, '0');
            assert.equal(snippet.placeholders[3].index, '0');
            var newEnclosing = snippet.enclosingPlaceholders(snippet.placeholders[1]);
            assert.ok(newEnclosing[0] === snippet.placeholders[0]);
            assert.equal(newEnclosing.length, 1);
            assert.equal(newEnclosing[0].index, '1');
        });
        test('TextmateSnippet#replace 2/2', function () {
            var snippet = new snippetParser_1.SnippetParser().parse('aaa${1:bbb${2:ccc}}$0', true);
            assert.equal(snippet.placeholders.length, 3);
            var _a = snippet.placeholders, second = _a[1];
            assert.equal(second.index, '2');
            var nested = new snippetParser_1.SnippetParser().parse('dddeee$0', true);
            snippet.replace(second, nested.children);
            assert.equal(snippet.toString(), 'aaabbbdddeee');
            assert.equal(snippet.placeholders.length, 3);
        });
        test('Snippet order for placeholders, #28185', function () {
            var _10 = new snippetParser_1.Placeholder(10);
            var _2 = new snippetParser_1.Placeholder(2);
            assert.equal(snippetParser_1.Placeholder.compareByIndex(_10, _2), 1);
        });
        test('Maximum call stack size exceeded, #28983', function () {
            new snippetParser_1.SnippetParser().parse('${1:${foo:${1}}}');
        });
        test('Snippet can freeze the editor, #30407', function () {
            var seen = new Set();
            seen.clear();
            new snippetParser_1.SnippetParser().parse('class ${1:${TM_FILENAME/(?:\\A|_)([A-Za-z0-9]+)(?:\\.rb)?/(?2::\\u$1)/g}} < ${2:Application}Controller\n  $3\nend').walk(function (marker) {
                assert.ok(!seen.has(marker));
                seen.add(marker);
                return true;
            });
            seen.clear();
            new snippetParser_1.SnippetParser().parse('${1:${FOO:abc$1def}}').walk(function (marker) {
                assert.ok(!seen.has(marker));
                seen.add(marker);
                return true;
            });
        });
        test('Snippets: make parser ignore `${0|choice|}`, #31599', function () {
            assertTextAndMarker('${0|foo,bar|}', '${0|foo,bar|}', snippetParser_1.Text);
            assertTextAndMarker('${1|foo,bar|}', 'foo', snippetParser_1.Placeholder);
        });
        test('Transform -> FormatString#resolve', function () {
            // shorthand functions
            assert.equal(new snippetParser_1.FormatString(1, 'upcase').resolve('foo'), 'FOO');
            assert.equal(new snippetParser_1.FormatString(1, 'downcase').resolve('FOO'), 'foo');
            assert.equal(new snippetParser_1.FormatString(1, 'capitalize').resolve('bar'), 'Bar');
            assert.equal(new snippetParser_1.FormatString(1, 'capitalize').resolve('bar no repeat'), 'Bar no repeat');
            assert.equal(new snippetParser_1.FormatString(1, 'notKnown').resolve('input'), 'input');
            // if
            assert.equal(new snippetParser_1.FormatString(1, undefined, 'foo', undefined).resolve(undefined), '');
            assert.equal(new snippetParser_1.FormatString(1, undefined, 'foo', undefined).resolve(''), '');
            assert.equal(new snippetParser_1.FormatString(1, undefined, 'foo', undefined).resolve('bar'), 'foo');
            // else
            assert.equal(new snippetParser_1.FormatString(1, undefined, undefined, 'foo').resolve(undefined), 'foo');
            assert.equal(new snippetParser_1.FormatString(1, undefined, undefined, 'foo').resolve(''), 'foo');
            assert.equal(new snippetParser_1.FormatString(1, undefined, undefined, 'foo').resolve('bar'), 'bar');
            // if-else
            assert.equal(new snippetParser_1.FormatString(1, undefined, 'bar', 'foo').resolve(undefined), 'foo');
            assert.equal(new snippetParser_1.FormatString(1, undefined, 'bar', 'foo').resolve(''), 'foo');
            assert.equal(new snippetParser_1.FormatString(1, undefined, 'bar', 'foo').resolve('baz'), 'bar');
        });
        test('[BUG] HTML attribute suggestions: Snippet session does not have end-position set, #33147', function () {
            var placeholders = new snippetParser_1.SnippetParser().parse('src="$1"', true).placeholders;
            var first = placeholders[0], second = placeholders[1];
            assert.equal(placeholders.length, 2);
            assert.equal(first.index, 1);
            assert.equal(second.index, 0);
        });
        test('Snippet optional transforms are not applied correctly when reusing the same variable, #37702', function () {
            var transform = new snippetParser_1.Transform();
            transform.appendChild(new snippetParser_1.FormatString(1, 'upcase'));
            transform.appendChild(new snippetParser_1.FormatString(2, 'upcase'));
            transform.regexp = /^(.)|-(.)/g;
            assert.equal(transform.resolve('my-file-name'), 'MyFileName');
            var clone = transform.clone();
            assert.equal(clone.resolve('my-file-name'), 'MyFileName');
        });
        test('problem with snippets regex #40570', function () {
            var snippet = new snippetParser_1.SnippetParser().parse('${TM_DIRECTORY/.*src[\\/](.*)/$1/}');
            assertMarker(snippet, snippetParser_1.Variable);
        });
    });
});
