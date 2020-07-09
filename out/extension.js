'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
function activate(context) {
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider('todolang', new Todolang(), {
        providedCodeActionKinds: Todolang.providedCodeActionKinds
    }));
    context.subscriptions.push(vscode.commands.registerCommand(Todolang.tickTodoCommandId, function () {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            let document = editor.document;
            let selection = editor.selection;
            let line = document.lineAt(selection.anchor);
            if (Todolang.IsTodoLine(line.text)) {
                editor.edit(editBuilder => {
                    editBuilder.replace(line.range, Todolang.tickedLine(line.text));
                });
            }
        }
    }));
}
exports.activate = activate;
class Todolang {
    provideCodeActions(document, range, context) {
        let actions = [];
        let line = document.lineAt(range.start);
        if (Todolang.IsTodoLine(line.text)) {
            const todoFix = new vscode.CodeAction("Tick Todo", vscode.CodeActionKind.Refactor);
            todoFix.command = {
                title: "Tick Todo",
                command: Todolang.tickTodoCommandId
            };
            actions.push(todoFix);
            const importantFix = new vscode.CodeAction("Mark/Unmark as important", vscode.CodeActionKind.Refactor);
            importantFix.edit = new vscode.WorkspaceEdit();
            importantFix.edit.replace(document.uri, line.range, Todolang.toggleImportant(line));
            actions.push(importantFix);
        }
        const tagConstants = ["nonfocus"];
        if (Todolang.isTagsLine(line)) {
            let linetext = line.text;
            linetext = linetext.replace(/^\(+|\)+$/g, ''); // trim params
            const tagsArray = linetext.replace(/\s/, "").split(",");
            tagConstants.forEach(tagConstant => {
                if (tagsArray.indexOf(tagConstant) > -1) {
                    const fix = new vscode.CodeAction(`remove \"${tagConstant}\"`, vscode.CodeActionKind.Refactor);
                    fix.edit = new vscode.WorkspaceEdit();
                    const i = tagsArray.indexOf(tagConstant);
                    tagsArray.splice(i, 1);
                    const editedLine = `(${tagsArray.join(", ")})`;
                    fix.edit.replace(document.uri, line.range, editedLine);
                    actions.push(fix);
                }
                else {
                    const fix = new vscode.CodeAction(`add \"${tagConstant}\"`, vscode.CodeActionKind.Refactor);
                    fix.edit = new vscode.WorkspaceEdit();
                    tagsArray.push(tagConstant);
                    const editedLine = `(${tagsArray.join(", ")})`;
                    fix.edit.replace(document.uri, line.range, editedLine);
                    actions.push(fix);
                }
            });
        }
        return actions;
    }
    static IsTodoLine(line) {
        return /\[x\]/gi.test(line) || /\[ \]/gi.test(line);
    }
    static tickedLine(line) {
        const tmpTicked = "{0}";
        const tmpUnticked = "{1}";
        let editedLine = line;
        editedLine = editedLine.replace(/\[ \]/gi, tmpTicked);
        editedLine = editedLine.replace(/\[x\]/gi, tmpUnticked);
        editedLine = editedLine.replace(tmpTicked, "[x]");
        editedLine = editedLine.replace(tmpUnticked, "[ ]");
        return editedLine;
    }
    static isTagsLine(line) {
        const re = /\(.*\)?/gi;
        return re.test(line.text);
    }
    static hasTag(line, tag) {
        return line.text.includes(tag);
    }
    static toggleImportant(line) {
        const importantRe = /[a-zA-Z\\s]+!+/;
        const isImportant = importantRe.test(line.text);
        let editedLine = line.text;
        if (isImportant) {
            editedLine = editedLine.replace(/([a-zA-Z\\s]+)!+/, "$1");
        }
        else {
            editedLine = editedLine + "!";
        }
        return editedLine;
    }
}
exports.Todolang = Todolang;
Todolang.tickTodoCommandId = "extension.tickTodo";
Todolang.providedCodeActionKinds = [vscode.CodeActionKind.Refactor];
//# sourceMappingURL=extension.js.map