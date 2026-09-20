import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";
import { MonacoBinding } from "y-monaco";
import { getWorkspaceDocument, saveWorkspaceDocument } from "../data/workspaceStore";
import "./CodeEditor.css";

function CodeEditor({ workspaceId, onActivity }) {
  const [files, setFiles] = useState(() => (getWorkspaceDocument(workspaceId).files || [
    { name: "index.js", language: "javascript", code: `function hello() {\n  console.log("Hello SyncSpace!");\n}` },
    { name: "script.py", language: "python", code: `def hello():\n    print("Hello SyncSpace!")\n\nhello()` },
  ]).filter((file) => file.name !== "Main.java"));
  const filesRef = useRef(files);
  const [folders, setFolders] = useState(() => getWorkspaceDocument(workspaceId).folders || []);
  const foldersRef = useRef(folders);
  const [activeFile, setActiveFile] = useState("index.js");
  const [output, setOutput] = useState("Click Run to execute your code.");
  const currentFile = files.find((file) => file.name === activeFile) || files[0];

  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new SocketIOProvider("http://localhost:5000", `codeeditor-${workspaceId || "default"}`, ydoc, { autoConnect: true });
    ydocRef.current = ydoc;
    providerRef.current = provider;

    return () => {
      bindingRef.current?.destroy();
      provider.disconnect();
      ydoc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const bindActiveFile = () => {
    const ydoc = ydocRef.current;
    const editor = editorRef.current;
    if (!ydoc || !editor) return;

    bindingRef.current?.destroy();
    const yText = ydoc.getText(`file:${activeFile}`);
    if (yText.length === 0 && currentFile?.code) yText.insert(0, currentFile.code);

    bindingRef.current = new MonacoBinding(yText, editor.getModel(), new Set([editor]), providerRef.current?.awareness);
  };

  useEffect(() => {
    bindActiveFile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    bindActiveFile();
  };

  const handleCodeChange = (value) => {
    filesRef.current = filesRef.current.map((file) => file.name === activeFile ? { ...file, code: value || "" } : file);
  };

  const handleAddFolder = () => {
    const trimmedName = window.prompt("Folder name:")?.trim();
    if (!trimmedName || foldersRef.current.includes(trimmedName)) return;
    const nextFolders = [...foldersRef.current, trimmedName];
    foldersRef.current = nextFolders;
    setFolders(nextFolders);
  };

  const handleAddFile = () => {
    const trimmedName = window.prompt("File name, for example app.ts:")?.trim();
    if (!trimmedName || filesRef.current.some((file) => file.name === trimmedName)) return;
    const language = window.prompt("Language: javascript, typescript, python, java, cpp, html, css, or json", "javascript")?.trim().toLowerCase() || "javascript";
    const folder = foldersRef.current.length > 0 ? window.prompt(`Folder name (optional):\n${foldersRef.current.join(", ")}`, "")?.trim() || "" : "";
    const newFile = { name: trimmedName, language, folder, code: "" };
    const nextFiles = [...filesRef.current, newFile];
    filesRef.current = nextFiles;
    setFiles(nextFiles);
    setActiveFile(trimmedName);
  };

  const handleSave = () => {
    saveWorkspaceDocument(workspaceId, { files: filesRef.current, folders: foldersRef.current });
    onActivity?.(`Saved ${activeFile}`, "code");
  };

  const handleRun = () => {
    onActivity?.(`Ran ${currentFile.name}`, "code");
    setOutput(`Running ${currentFile.name}...\n\nOutput will appear here once the backend code execution is connected.`);
  };

  return (
    <div className="editor-container">
      <div className="editor-explorer-bar">
        <span className="explorer-title">Files</span>
        <div className="explorer-actions">
          <button type="button" className="explorer-button" onClick={handleAddFolder}>+ Folder</button>
          <button type="button" className="explorer-button" onClick={handleAddFile}>+ File</button>
        </div>
      </div>

      <div className="editor-tabs">
        {files.map((file) => (
          <button key={file.name} className={`editor-tab ${activeFile === file.name ? "active" : ""}`} onClick={() => setActiveFile(file.name)}>
            {file.folder ? `${file.folder} / ${file.name}` : file.name}
          </button>
        ))}
      </div>

      <div className="editor-main">
        <Editor
          key={activeFile}
          height="100%"
          language={currentFile.language}
          defaultValue={currentFile.code}
          theme="vs-dark"
          onChange={handleCodeChange}
          onMount={handleEditorMount}
          options={{ fontSize: 14, minimap: { enabled: false }, automaticLayout: true, wordWrap: "on", scrollBeyondLastLine: false, padding: { top: 10 } }}
        />
      </div>

      <div className="editor-run-bar">
        <span className="language-name">{currentFile.language}</span>
        <div className="editor-actions">
          <button className="save-button" onClick={handleSave}>Save</button>
          <button className="run-button" onClick={handleRun}>▶ Run</button>
        </div>
      </div>

      <div className="editor-output">
        <div className="output-header">OUTPUT</div>
        <pre className="output-content">{output}</pre>
      </div>
    </div>
  );
}

export default CodeEditor;