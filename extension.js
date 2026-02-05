const vscode = require('vscode');
const { execSync } = require('child_process');
const {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} = require('vscode-languageclient/node');

let client;

/**
 * Activate the Duso language extension with LSP support
 */
async function activate(context) {
  console.log('Duso extension activated');

  // Server options: launch duso LSP server
  const serverOptions = {
    command: 'duso',
    args: ['-lsp'],
  };

  // Client options
  const clientOptions = {
    documentSelector: [{ scheme: 'file', language: 'duso' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.du'),
    },
  };

  // Create and start the language client
  client = new LanguageClient(
    'duso',
    'Duso Language Server',
    serverOptions,
    clientOptions
  );

  try {
    await client.start();
    console.log('Duso language server started');
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to start Duso language server: ${err.message}`
    );
    console.error('Failed to start Duso LSP:', err);
  }

  // Register command to view full documentation
  const viewDocCommand = vscode.commands.registerCommand(
    'duso.viewReference',
    async (name) => {
      try {
        // Run duso -no-color -doc <name>
        const output = execSync(`duso -no-color -doc ${name}`, {
          encoding: 'utf-8',
        });

        // Create and show a webview panel
        const panel = vscode.window.createWebviewPanel(
          'dusoDoc',
          `Duso: ${name}`,
          vscode.ViewColumn.Beside,
          {}
        );

        // Convert markdown to HTML (simple conversion)
        const html = markdownToHtml(output);
        panel.webview.html = html;
      } catch (err) {
        vscode.window.showErrorMessage(
          `Failed to get documentation for ${name}: ${err.message}`
        );
      }
    }
  );

  context.subscriptions.push(client);
  context.subscriptions.push(viewDocCommand);
}

/**
 * Simple markdown to HTML converter for documentation display
 */
function markdownToHtml(markdown) {
  let html = markdown
    // Headers
    .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
    // Code blocks
    .replace(/```[\s\S]*?```/gm, (match) => {
      const code = match.replace(/```/g, '').trim();
      return `<pre><code>${escapeHtml(code)}</code></pre>`;
    })
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^- (.*?)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; padding: 20px; }
        h1, h2, h3 { color: #333; }
        code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
        pre { background: #f5f5f5; padding: 12px; border-radius: 5px; overflow-x: auto; }
        li { margin: 5px 0; }
      </style>
    </head>
    <body>
      <p>${html}</p>
    </body>
    </html>
  `;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Deactivate the extension
 */
function deactivate() {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

module.exports = {
  activate,
  deactivate,
};
