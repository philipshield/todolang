"use strict";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext): void {
  vscode.languages.registerCodeActionsProvider("todolang", new Todolang(), {
    providedCodeActionKinds: Todolang.providedCodeActionKinds
  });

  context.subscriptions.push(vscode.commands.registerCommand(Todolang.tickTodoCommandId, Todolang.tickTodoCommand));
  context.subscriptions.push(vscode.commands.registerCommand(Todolang.toggleImportantCommandId, Todolang.toggleImportantCommand));
  context.subscriptions.push(vscode.commands.registerCommand(Todolang.sortByTickedCommandId, Todolang.sortByTickedCommand));
}

export class Todolang implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.Refactor];
  public static readonly tickTodoCommandId: string = "todolang.tickTodo";
  public static readonly toggleImportantCommandId: string = "todolang.toggleImportant"
  public static readonly sortByTickedCommandId: string = "todolang.sortByTickedCommandId"

  public provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext): (vscode.CodeAction)[] {
    const actions: (vscode.CodeAction)[] = [];

    const line = document.lineAt(range.start);
    if (Todolang.isTodoLine(line.text)) {
      const todoFix = new vscode.CodeAction("Tick", vscode.CodeActionKind.Refactor);
      todoFix.command = <vscode.Command>{ command: Todolang.tickTodoCommandId };
      actions.push(todoFix);

      const importantFix = new vscode.CodeAction("Mark/Unmark as important", vscode.CodeActionKind.Refactor);
      importantFix.command = <vscode.Command>{ command: Todolang.toggleImportantCommandId };
      actions.push(importantFix);

      const sortFix = new vscode.CodeAction("Sort by ticked", vscode.CodeActionKind.Refactor);
      sortFix.command = <vscode.Command>{ command: Todolang.sortByTickedCommandId };
      actions.push(sortFix);
    }

    const tagActions = Todolang.getTagActions(document, line);
    tagActions.forEach(action => {
      actions.push(action);
    });

    return actions;
  }

  public static tickTodoCommand(): void {
    Todolang.editActive((builder, document, line) => {
      if (Todolang.isTodoLine(line.text)) {
        builder.replace(line.range, Todolang.tickedLine(line.text));
      }
    });
  }

  public static toggleImportantCommand(): void {
    Todolang.editActive((builder, document, line) => {
      if (Todolang.isTodoLine(line.text)) {
        builder.replace(line.range, Todolang.toggleImportant(line));
      }
    });
  }

  public static sortByTickedCommand(): void {
    Todolang.editActive((builder, document, line) => {
      if (Todolang.isTodoLine(line.text)) {
        // Start of todo collection
        let currentLine = line.lineNumber;
        while (Todolang.isTodoLine(document.lineAt(currentLine).text)) {
          currentLine--;
        }
        const start = currentLine + 1;

        // End of todo collection
        currentLine = line.lineNumber;
        while (Todolang.isTodoLine(document.lineAt(currentLine).text)) {
          currentLine++;
        }
        const end = currentLine;

        // Sort.
        let todos = [];
        for (let lineNumber = start; lineNumber < end; lineNumber++) {
          todos.push(document.lineAt(lineNumber).text + "\n");
        }
        todos = todos.sort(text => {
          const ticked = text.includes("[x]");
          if (ticked) {
            return -1;
          }
          return 1;
        });
        const edited: string = todos.join("");

        // Edit.
        const range = new vscode.Range(new vscode.Position(start, 0), new vscode.Position(end, 0));
        builder.replace(range, edited);
      }
    });
  }

  private static getTagActions(document: vscode.TextDocument, line: vscode.TextLine): vscode.CodeAction[] {
    const tagConstants = ["nonfocus"];
    const tagsLineRegex = /\(.*\)/gi;

    const tagsMatches = tagsLineRegex.exec(line.text);
    const actions: (vscode.CodeAction)[] = [];
    if (tagsMatches != null) {
      const match = tagsMatches[0];
      const matchStart = line.text.indexOf(match);
      const matchEnd = matchStart + match.length;
      const matchRange = new vscode.Range(new vscode.Position(line.lineNumber, matchStart), new vscode.Position(line.lineNumber, matchEnd));
      const innerText = match.replace(/^\(+|\)+$/g, ""); // trim
      const tags = innerText.replace(/\s/, "").split(",").filter(x => x.length > 0); // TODO: remove empty elements

      tagConstants.forEach(tagConstant => {
        if (tags.indexOf(tagConstant) > -1) {
          const fix = new vscode.CodeAction(`remove "${tagConstant}"`, vscode.CodeActionKind.Refactor);
          fix.edit = new vscode.WorkspaceEdit();

          const i = tags.indexOf(tagConstant);
          tags.splice(i, 1);
          const newTags = `(${tags.join(", ")})`;
          fix.edit.replace(document.uri, matchRange, newTags);

          actions.push(fix);
        } else {
          const fix = new vscode.CodeAction(`add "${tagConstant}"`, vscode.CodeActionKind.Refactor);
          fix.edit = new vscode.WorkspaceEdit();

          tags.push(tagConstant);
          const editedLine = `(${tags.join(", ")})`;
          fix.edit.replace(document.uri, matchRange, editedLine);

          actions.push(fix);
        }
      });
    }

    return actions;
  }

  private static editActive(callback: (editBuilder: vscode.TextEditorEdit, document: vscode.TextDocument, line: vscode.TextLine) => void) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const document = editor.document;
      const selection = editor.selection;
      const line = document.lineAt(selection.anchor);
      editor.edit(builder => callback(builder, document, line));
    }
  }

  private static isTodoLine(line: string): boolean {
    return /\[x\]/gi.test(line) || /\[ \]/gi.test(line);
  }

  private static tickedLine(line: string): string {
    const tmpTicked = "{0}";
    const tmpUnticked = "{1}";
    let editedLine = line;
    editedLine = editedLine.replace(/\[ \]/gi, tmpTicked);
    editedLine = editedLine.replace(/\[x\]/gi, tmpUnticked);
    editedLine = editedLine.replace(tmpTicked, "[x]");
    editedLine = editedLine.replace(tmpUnticked, "[ ]");
    return editedLine;
  }
  private static hasTag(line: vscode.TextLine, tag: string) {
    return line.text.includes(tag);
  }

  private static toggleImportant(line: vscode.TextLine): string {
    const importantRe = /[a-zA-Z\\s]+!+/;
    const isImportant = importantRe.test(line.text);

    let editedLine = line.text;
    if (isImportant) {
      editedLine = editedLine.replace(/([a-zA-Z\\s]+)!+/, "$1");
    } else {
      editedLine = editedLine + "!";
    }

    return editedLine;
  }
}
