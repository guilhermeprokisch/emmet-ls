#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const emmet_1 = require("emmet");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const node_1 = require("vscode-languageserver/node");
let connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
// Create a simple text document manager.
let documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;
connection.onInitialize((params) => {
    let capabilities = params.capabilities;
    // Does the client support the `workspace/configuration` request?
    // If not, we fall back using global settings.
    hasConfigurationCapability = !!(capabilities.workspace && !!capabilities.workspace.configuration);
    hasWorkspaceFolderCapability = !!(capabilities.workspace && !!capabilities.workspace.workspaceFolders);
    hasDiagnosticRelatedInformationCapability = !!(capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation);
    const triggerCharacters = [
        ">",
        ")",
        "]",
        "}",
        "@",
        "*",
        "$",
        "+",
        // alpha
        "a",
        "b",
        "c",
        "d",
        "e",
        "f",
        "g",
        "h",
        "i",
        "j",
        "k",
        "l",
        "m",
        "n",
        "o",
        "p",
        "q",
        "r",
        "s",
        "t",
        "u",
        "v",
        "w",
        "x",
        "y",
        "z",
        // num
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
    ];
    const result = {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
            // Tell the client that this server supports code completion.
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: triggerCharacters,
            },
        },
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true,
            },
        };
    }
    return result;
});
connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(node_1.DidChangeConfigurationNotification.type, undefined);
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders((_event) => {
            connection.console.log("Workspace folder change event received.");
        });
    }
});
// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings = { maxNumberOfProblems: 1000 };
let globalSettings = defaultSettings;
// Cache the settings of all open documents
let documentSettings = new Map();
function getDocumentSettings(resource) {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: "languageServerExample",
        });
        documentSettings.set(resource, result);
    }
    return result;
}
documents.onDidClose((e) => {
    documentSettings.delete(e.document.uri);
});
connection.onCompletion((_textDocumentPosition) => {
    try {
        let docs = documents.get(_textDocumentPosition.textDocument.uri);
        if (!docs)
            throw "failed to find document";
        let languageId = docs.languageId;
        let content = docs.getText();
        let linenr = _textDocumentPosition.position.line;
        let line = String(content.split(/\r?\n/g)[linenr]);
        let character = _textDocumentPosition.position.character;
        let extractPosition = languageId != "css"
            ? (0, emmet_1.extract)(line, character)
            : (0, emmet_1.extract)(line, character, { type: "stylesheet" });
        if ((extractPosition === null || extractPosition === void 0 ? void 0 : extractPosition.abbreviation) == undefined) {
            throw "failed to parse line";
        }
        let left = extractPosition.start;
        let right = extractPosition.end;
        let abbreviation = extractPosition.abbreviation;
        let textResult = "";
        const htmlLanguages = [
            "html",
            "blade",
            "twig",
            "eruby",
            "erb",
            "razor",
            "javascript",
            "javascriptreact",
            "javascript.jsx",
            "typescript",
            "typescriptreact",
            "typescript.tsx",
            "liquid",
        ];
        if (htmlLanguages.includes(languageId)) {
            const htmlconfig = (0, emmet_1.resolveConfig)({
                options: {
                    "output.field": (index, placeholder) => `\$\{${index}${placeholder ? ":" + placeholder : ""}\}`,
                },
            });
            const markup = (0, emmet_1.parseMarkup)(abbreviation, htmlconfig);
            textResult = (0, emmet_1.stringifyMarkup)(markup, htmlconfig);
        }
        else {
            const cssConfig = (0, emmet_1.resolveConfig)({
                type: "stylesheet",
                options: {
                    "output.field": (index, placeholder) => `\$\{${index}${placeholder ? ":" + placeholder : ""}\}`,
                },
            });
            const markup = (0, emmet_1.parseStylesheet)(abbreviation, cssConfig);
            textResult = (0, emmet_1.stringifyStylesheet)(markup, cssConfig);
        }
        const range = {
            start: {
                line: linenr,
                character: left,
            },
            end: {
                line: linenr,
                character: right,
            },
        };
        return [
            {
                insertTextFormat: node_1.InsertTextFormat.Snippet,
                label: abbreviation,
                detail: abbreviation,
                documentation: textResult,
                textEdit: {
                    range,
                    newText: textResult,
                    // newText: textResult.replace(/\$\{\d*\}/g,''),
                },
                kind: node_1.CompletionItemKind.Snippet,
                data: {
                    range,
                    textResult,
                },
            },
        ];
    }
    catch (error) {
        connection.console.log(`ERR: ${error}`);
    }
    return [];
});
documents.listen(connection);
connection.listen();
//# sourceMappingURL=server.js.map