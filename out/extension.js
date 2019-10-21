'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const REGEX_UNTICKED = /\[ \]/gi;
const REGEX_TICKED = /\[x\]/gi;
function activate(context) {
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider('todolang', new Todoer(), {
        providedCodeActionKinds: Todoer.providedCodeActionKinds
    }));
    context.subscriptions.push(vscode.commands.registerCommand('extension.tickTodo', function () {
        let editor = vscode.window.activeTextEditor;
        if (editor) {
            let document = editor.document;
            let selection = editor.selection;
            let line = document.lineAt(selection.anchor);
            if (Todoer.isTodoLine(line)) {
                editor.edit(editBuilder => editBuilder.replace(line.range, Todoer.tickedLine(line)));
            }
        }
    }));
}
exports.activate = activate;
class Todoer {
    static isTodoLine(line) {
        return REGEX_TICKED.test(line.text) || REGEX_UNTICKED.test(line.text);
    }
    static isTagsLine(line) {
        const re = /\(.*\)?/gi;
        return re.test(line.text);
    }
    static hasTag(line, tag) {
        return line.text.includes(tag);
    }
    static tickedLine(line) {
        const tmpTicked = "{0}";
        const tmpUnticked = "{1}";
        let editedLine = line.text;
        editedLine = editedLine.replace(REGEX_UNTICKED, tmpTicked);
        editedLine = editedLine.replace(REGEX_TICKED, tmpUnticked);
        editedLine = editedLine.replace(tmpTicked, "[x]");
        editedLine = editedLine.replace(tmpUnticked, "[ ]");
        return editedLine;
    }
    provideCodeActions(document, range) {
        let actions = [];
        let line = document.lineAt(range.start);
        if (Todoer.isTodoLine(line)) {
            const fix = new vscode.CodeAction("Tick TODO item", vscode.CodeActionKind.Refactor);
            fix.edit = new vscode.WorkspaceEdit();
            fix.edit.replace(document.uri, line.range, Todoer.tickedLine(line));
            actions.push(fix);
        }
        const tagConstants = ["nonfocus"];
        if (Todoer.isTagsLine(line)) {
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
}
exports.Todoer = Todoer;
Todoer.providedCodeActionKinds = [
    vscode.CodeActionKind.Refactor
];
//# sourceMappingURL=extension.js.map