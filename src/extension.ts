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
	
	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] {	
		let actions : vscode.CodeAction[] = [];

		let line = document.lineAt(range.start);
		if(Todoer.isTodoLine(line)) {
			const fix = new vscode.CodeAction("Tick TODO item", vscode.CodeActionKind.Refactor);
			fix.edit = new vscode.WorkspaceEdit();
			fix.edit.replace(document.uri, line.range, Todoer.tickedLine(line));
			actions.push(fix);
		}

		return actions;
	}

}
