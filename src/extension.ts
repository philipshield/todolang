'use strict';

import * as vscode from 'vscode';

const REGEX_UNTICKED = /\[ \]/gi; 
const REGEX_TICKED = /\[x\]/gi; 

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('todolang', new Todoer(), {
			providedCodeActionKinds: Todoer.providedCodeActionKinds
		}));
}

export class Todoer implements vscode.CodeActionProvider {
	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.Refactor
	];

	public static tickLine(line : string) : string {
		let editedLine = line;

		const tmpTicked = "{0}"
		const tmpUnticked = "{1}"

		editedLine = editedLine.replace(REGEX_UNTICKED, tmpTicked);
		editedLine = editedLine.replace(REGEX_TICKED, tmpUnticked);
		editedLine = editedLine.replace(tmpTicked, "[x]");
		editedLine = editedLine.replace(tmpUnticked, "[ ]");

		return editedLine;
	}
	
	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] {	
		let actions : vscode.CodeAction[] = [];
		
		let line = document.lineAt(range.start);
		let linetext = line.text;

		// Tick TODO
		if(REGEX_TICKED.test(linetext) || REGEX_UNTICKED.test(linetext)) {

			let editedLine = Todoer.tickLine(linetext);
			const fix = new vscode.CodeAction("Tick TODO item", vscode.CodeActionKind.Refactor);
			fix.edit = new vscode.WorkspaceEdit();
			fix.edit.replace(document.uri, line.range, editedLine);
			actions.push(fix);
		}

		return actions;
	}

}
