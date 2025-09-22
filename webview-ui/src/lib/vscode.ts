// Define the structure of the VS Code API object
interface VsCodeApi {
  postMessage(message: { command: string; payload: unknown }): void;
  getState(): any;
  setState(state: any): void;
}

// Declare the global vscode object for TypeScript
declare global {
  const vscode: VsCodeApi;
}

// Export the already-acquired vscode object from global scope
// Note: The vscode object is already acquired by the extension and injected globally
export const vscode = (globalThis as any).vscode;