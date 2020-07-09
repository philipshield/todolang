'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('todolang', new Todolang(), {
			providedCodeActionKinds: Todolang.providedCodeActionKinds
		}));

	context.subscriptions.push(
		vscode.commands.registerCommand(Todolang.tickTodoCommandId, function () {
			let editor = vscode.window.activeTextEditor;
			if (editor) {
				let document = editor.document;
				let selection = editor.selection;
				let line = document.lineAt(selection.anchor);

				if(Todolang.IsTodoLine(line.text)) {
					editor.edit(editBuilder => {
						editBuilder.replace(line.range, Todolang.tickedLine(line.text));
					});
				}
			}
		})
	);
}

export class Todolang implements vscode.CodeActionProvider {
	public static readonly tickTodoCommandId: string = "extension.tickTodo";
	public static readonly providedCodeActionKinds = [ vscode.CodeActionKind.Refactor ];

	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext): (vscode.CodeAction)[] {	
		let actions : (vscode.CodeAction)[] = [];

		let line = document.lineAt(range.start);
		if(Todolang.IsTodoLine(line.text)) {
			const todoFix = new vscode.CodeAction("Tick Todo", vscode.CodeActionKind.Refactor);
			todoFix.command = <vscode.Command> {
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
		if(Todolang.isTagsLine(line))
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

	public static IsTodoLine(line: string): boolean {
		return /\[x\]/gi.test(line) || /\[ \]/gi.test(line);
	}

	public static tickedLine(line: string): string {
		const tmpTicked = "{0}"
		const tmpUnticked = "{1}"
		let editedLine = line;
		editedLine = editedLine.replace(/\[ \]/gi, tmpTicked);
		editedLine = editedLine.replace(/\[x\]/gi, tmpUnticked);
		editedLine = editedLine.replace(tmpTicked, "[x]");
		editedLine = editedLine.replace(tmpUnticked, "[ ]");
		return editedLine;
	}

	private static isTagsLine(line: vscode.TextLine) {
		const re = /\(.*\)?/gi;
		return re.test(line.text);
	}

	private static hasTag(line: vscode.TextLine, tag: string) {
		return line.text.includes(tag);
	}

	private static toggleImportant(line: vscode.TextLine): string {
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
}
