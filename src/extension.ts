import { CancellationToken, ExtensionContext, Hover, MarkdownString, Position, StatusBarAlignment, StatusBarItem, TextDocument, languages, window, workspace } from 'vscode';

import { getWordArray, query } from './translate';

const CONFIG_KEY = 'pure-translate';
let statusBarItem: StatusBarItem;
let enableHover = false;
let enableStatusBar = true;
let showStatusBarOnHover = true;
let statusBarAlignment: 'left' | 'right' = 'right';

async function getMarkdownDetails(text: string): Promise<Array<MarkdownString> | undefined> {
  const words = getWordArray(text);
  const contents = [];
  for (const word of words) {
    const result = await query(word);
    if (result) {
      contents.push(new MarkdownString(
        `- [${word}](https://translate.google.com?text=${word})`
        + (result.p ? ' */' + result.p + '/*' : '')
        + '\n\n'
        + result.t.replace(/\\n/g, '\n\n')
      ));
    }
  }
  return contents;
}

async function getInlineDetails(text: string): Promise<string> {
  const words = getWordArray(text);
  const contents = [];
  for (const word of words) {
    const result = await query(word);
    if (result) {
      contents.push(
        `【${word}】${result.t.replace(/\\n/g, ' ').substring(0, 25)}`
      );
    }
  }
  return contents.join(' ');
}


export function activate(context: ExtensionContext) {

  // #region configuration
  function initConfiguration() {
    const config = workspace.getConfiguration('pure-translate');
    enableHover = config.get('hover.enable')!;
    enableStatusBar = config.get('statusBar.enable')!;
    showStatusBarOnHover = config.get('statusBar.showOnHover')!;
    statusBarAlignment = config.get('statusBar.alignment')!;
    statusBarItem?.dispose();
    statusBarItem = window.createStatusBarItem(
      statusBarAlignment == 'left' ? StatusBarAlignment.Left : StatusBarAlignment.Right,
      statusBarAlignment == 'left' ? 0 : 10000
    );
    context.subscriptions.push(statusBarItem);
    if (enableStatusBar) {
      statusBarItem.show();
    } else {
      statusBarItem.text = '';
      statusBarItem.hide();
    }
  }

  initConfiguration();
  context.subscriptions.push(
    workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration(CONFIG_KEY)) {
        initConfiguration();
      }
    })
  );
  // #endregion

  // statusbar
  let timer: any;
  context.subscriptions.push(
    {
      dispose() {
        clearTimeout(timer);
      },
    },
    window.onDidChangeTextEditorSelection(async ({ textEditor: { document, selection } }) => {
      if (!enableStatusBar || showStatusBarOnHover) {
        statusBarItem.text = '';
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(async () => {
        let text = '';
        const selectText = document.getText(selection);
        if (selectText && text.indexOf(selectText) > -1) { text = selectText; } else {
          const range = document.getWordRangeAtPosition(selection.start);
          if (range) { text = document.getText(range); }
        }
        statusBarItem.text = await getInlineDetails(text);
        const markdowns = await getMarkdownDetails(text);
        statusBarItem.tooltip = !markdowns ? '' : new MarkdownString(markdowns.map(v => v.value).join('\n'));
      }, 200);
    })
  );

  // hover
  context.subscriptions.push(
    languages.registerHoverProvider("*", {
      async provideHover(
        document: TextDocument,
        position: Position,
        _token: CancellationToken
      ): Promise<Hover | undefined> {
        if (!enableHover && !(enableStatusBar && showStatusBarOnHover)) { return; };

        let text = '';

        const range = document.getWordRangeAtPosition(position);
        if (range) { text = document.getText(range); }
        if (window.activeTextEditor) {
          const selectText = document.getText(window.activeTextEditor.selection);
          if (selectText && text.indexOf(selectText) > -1) { text = selectText; }
        }

        const markdowns = await getMarkdownDetails(text);

        if (enableStatusBar && showStatusBarOnHover) {
          statusBarItem.text = await getInlineDetails(text);
          statusBarItem.tooltip = !markdowns ? '' : new MarkdownString(markdowns.map(v => v.value).join('\n'));
        }

        if (enableHover) {
          return markdowns ? { contents: markdowns } : undefined;
        }
      }
    })
  );
}

export function deactivate() { }
