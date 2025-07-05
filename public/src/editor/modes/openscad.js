// openscad.js - Defines the OpenSCAD syntax highlighting mode for Ace Editor

/**
 * Defines the OpenSCAD mode for syntax highlighting in Ace Editor
 */
export function defineOpenSCADMode() {
    ace.define(
        "ace/mode/openscad", 
        ["require", "exports", "module", "ace/lib/oop", "ace/mode/text", "ace/mode/text_highlight_rules"], 
        function(require, exports, module) {
            "use strict";

            const oop = require("../lib/oop");
            const TextMode = require("./text").Mode;
            const TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

            /**
             * OpenSCAD syntax highlighting rules
             */
            const OpenSCADHighlightRules = function() {
                // Define OpenSCAD keywords
                const keywords = "module|function|if|else|for|include|use";
                
                // Define built-in functions
                const builtinFunctions = "cube|cylinder|sphere|polyhedron|hull|translate|rotate|scale|mirror|" +
                    "union|difference|intersection|minkowski|color|linear_extrude|rotate_extrude|" +
                    "projection|surface|offset|resize|text";

                // Define operators
                const operators = "[\\+\\-\\*/%=<>\\^\\|&]";

                // Define highlighting rules
                this.$rules = {
                    "start": [
                        {
                            token: "keyword",
                            regex: "\\b(" + keywords + ")\\b"
                        },
                        {
                            token: "variable",
                            regex: "\\b[a-zA-Z_$][a-zA-Z0-9_$]*\\b"
                        },
                        {
                            token: "constant.numeric",
                            regex: "\\b\\d+(\\.\\d+)?\\b"
                        },
                        {
                            token: "support.function",
                            regex: "\\b(" + builtinFunctions + ")\\b"
                        },
                        {
                            token: "keyword.operator",
                            regex: operators
                        },
                        {
                            token: "string",
                            regex: '["\'][^"\']*["\']'
                        },
                        {
                            token: "constant.language",
                            regex: "\\b(true|false|undef)\\b"
                        },
                        {
                            token: "comment",
                            regex: "//.*$"
                        },
                        {
                            token: "comment",
                            regex: "/\\*",
                            next: "comment"
                        }
                    ],
                    "comment": [
                        {
                            token: "comment",
                            regex: "\\*/",
                            next: "start"
                        },
                        {
                            token: "comment",
                            regex: ".+"
                        }
                    ]
                };
            };

            oop.inherits(OpenSCADHighlightRules, TextHighlightRules);

            /**
             * OpenSCAD Folding Rules - Enhanced for better code folding
             */
            const OpenSCADFoldMode = function() {};
            
            (function() {
                this.foldingStartMarker = /(\{|\[|\(|module\s+\w+\s*\(|function\s+\w+\s*\(|if\s*\(|for\s*\(|difference\s*\(|union\s*\(|intersection\s*\(|hull\s*\(|minkowski\s*\(|translate\s*\(|rotate\s*\(|scale\s*\(|mirror\s*\(|linear_extrude\s*\(|rotate_extrude\s*\()/;
                this.foldingStopMarker = /(\}|\]|\))/;
                
                this.getFoldWidgetRange = function(session, foldStyle, row) {
                    const line = session.getLine(row);
                    const match = line.match(this.foldingStartMarker);
                    
                    if (match) {
                        const startColumn = match.index + match[0].length;
                        const maxRow = session.getLength();
                        let endRow = row;
                        let endColumn = 0;
                        let openBrackets = 0;
                        let openParens = 0;
                        let openSquare = 0;
                        
                        // Count opening brackets/parens in the current line
                        for (let i = startColumn; i < line.length; i++) {
                            const char = line[i];
                            if (char === '{') openBrackets++;
                            else if (char === '(') openParens++;
                            else if (char === '[') openSquare++;
                            else if (char === '}') openBrackets--;
                            else if (char === ')') openParens--;
                            else if (char === ']') openSquare--;
                        }
                        
                        // Find the matching closing bracket/paren
                        for (let i = row + 1; i < maxRow; i++) {
                            const currentLine = session.getLine(i);
                            
                            for (let j = 0; j < currentLine.length; j++) {
                                const char = currentLine[j];
                                if (char === '{') openBrackets++;
                                else if (char === '(') openParens++;
                                else if (char === '[') openSquare++;
                                else if (char === '}') {
                                    openBrackets--;
                                    if (openBrackets < 0) {
                                        endRow = i;
                                        endColumn = j;
                                        break;
                                    }
                                }
                                else if (char === ')') {
                                    openParens--;
                                    if (openParens < 0) {
                                        endRow = i;
                                        endColumn = j;
                                        break;
                                    }
                                }
                                else if (char === ']') {
                                    openSquare--;
                                    if (openSquare < 0) {
                                        endRow = i;
                                        endColumn = j;
                                        break;
                                    }
                                }
                            }
                            
                            if (endRow > row) break;
                        }
                        
                        if (endRow > row) {
                            return new (require("../range").Range)(row, startColumn, endRow, endColumn);
                        }
                    }
                    
                    return null;
                };
                
                this.getFoldWidget = function(session, foldStyle, row) {
                    const line = session.getLine(row);
                    
                    if (this.foldingStartMarker.test(line)) {
                        return "start";
                    }
                    
                    if (foldStyle === "markbeginend" && this.foldingStopMarker.test(line)) {
                        return "end";
                    }
                    
                    return "";
                };
                
            }).call(OpenSCADFoldMode.prototype);

            /**
             * OpenSCAD mode definition
             */
            const Mode = function() {
                this.HighlightRules = OpenSCADHighlightRules;
                this.foldingRules = new OpenSCADFoldMode();
            };
            
            oop.inherits(Mode, TextMode);

            (function() {
                this.lineCommentStart = "//";
                this.blockCommentStart = "/*";
                this.blockCommentEnd = "*/";
                this.foldFunctions = true;
                
                // Enhanced folding support
                this.createWorker = function(session) {
                    return null; // No worker needed for basic syntax highlighting
                };
                
            }).call(Mode.prototype);

            exports.Mode = Mode;
        }
    );
}
