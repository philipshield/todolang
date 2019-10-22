'use strict';

import * as vscode from 'vscode';

const REGEX_UNTICKED = /\[ \]/gi;
const REGEX_TICKED = /\[x\]/gi;

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('todolang', new Todoer(), {
			providedCodeActionKinds: Todoer.providedCodeActionKinds
		}));

	context.subscriptions.push(
		vscode.commands.registerCommand('extension.tickTodo', function () {
			let editor = vscode.window.activeTextEditor;
			if (editor) {
				let document = editor.document;
				let selection = editor.selection;
				let line = document.lineAt(selection.anchor);

				if(Todoer.isTodoLine(line)) {
					editor.edit(editBuilder => 
						editBuilder.replace(line.range, Todoer.tickedLine(line))
					);
				}
			}
		})
	);
}

export class Todoer implements vscode.CodeActionProvider {
	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.Refactor
	];

	public static isTodoLine(line: vscode.TextLine) {
		return REGEX_TICKED.test(line.text) || REGEX_UNTICKED.test(line.text);
	}

	public static isTagsLine(line: vscode.TextLine) {
		const re = /\(.*\)?/gi;
		return re.test(line.text);
	}

	public static hasTag(line: vscode.TextLine, tag: string) {
		return line.text.includes(tag);
	}

	public static tickedLine(line: vscode.TextLine): string {
		const tmpTicked = "{0}"
		const tmpUnticked = "{1}"
		let editedLine = line.text;
		editedLine = editedLine.replace(REGEX_UNTICKED, tmpTicked);
		editedLine = editedLine.replace(REGEX_TICKED, tmpUnticked);
		editedLine = editedLine.replace(tmpTicked, "[x]");
		editedLine = editedLine.replace(tmpUnticked, "[ ]");
		return editedLine;
	}

	public static toggleImportant(line: vscode.TextLine): string {
		const importantRe = /[a-zA-Z\\s]+!+/;
		const isImportant = importantRe.test(line.text);
		
		let editedLine = line.text;
		if(isImportant) {
			editedLine = editedLine.replace(/([a-zA-Z\\s]+)!+/, "$1");
		} else {
			editedLine = editedLine + "!";
		}


		return editedLine;
	}
	
	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] {	
		let actions : vscode.CodeAction[] = [];

		let line = document.lineAt(range.start);
		if(Todoer.isTodoLine(line)) {
			const tickTodoFix = new vscode.CodeAction("Tick TODO item", vscode.CodeActionKind.Refactor);
			tickTodoFix.edit = new vscode.WorkspaceEdit();
			tickTodoFix.edit.replace(document.uri, line.range, Todoer.tickedLine(line));
			actions.push(tickTodoFix);

			const importantFix = new vscode.CodeAction("Mark/Unmark as important", vscode.CodeActionKind.Refactor);
			importantFix.edit = new vscode.WorkspaceEdit();
			importantFix.edit.replace(document.uri, line.range, Todoer.toggleImportant(line));
			actions.push(importantFix);
		}

		const tagConstants = ["nonfocus"];
		if(Todoer.isTagsLine(line))
		{
			let linetext = line.text;
			linetext = linetext.replace(/^\(+|\)+$/g, ''); // trim params
			const tagsArray = linetext.replace(/\s/, "").split(",");

			tagConstants.forEach(tagConstant => {
				if(tagsArray.indexOf(tagConstant) > -1) {
					const fix = new vscode.CodeAction(`remove \"${tagConstant}\"`, vscode.CodeActionKind.Refactor);
					fix.edit = new vscode.WorkspaceEdit();
					const i = tagsArray.indexOf(tagConstant);
					tagsArray.splice(i, 1);
					const editedLine = `(${tagsArray.join(", ")})`;
					fix.edit.replace(document.uri, line.range, editedLine);
					actions.push(fix);
				} else {
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
