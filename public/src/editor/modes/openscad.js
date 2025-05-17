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
                const builtinFunctions = "cube|cylinder|sphere|translate|rotate|scale|union|difference|intersection";

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
                            token: "comment",
                            regex: "//.*$"
                        }
                    ]
                };
            };

            oop.inherits(OpenSCADHighlightRules, TextHighlightRules);

            /**
             * OpenSCAD mode definition
             */
            const Mode = function() {
                this.HighlightRules = OpenSCADHighlightRules;
            };
            
            oop.inherits(Mode, TextMode);

            (function() {
                this.lineCommentStart = "//";
            }).call(Mode.prototype);

            exports.Mode = Mode;
        }
    );
}