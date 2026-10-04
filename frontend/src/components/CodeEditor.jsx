import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";
import { MonacoBinding } from "y-monaco";
import {
  getWorkspaceDocument,
  saveWorkspaceDocument
} from "../data/workspaceStore";
import "./CodeEditor.css";

function CodeEditor({ workspaceId, onActivity }) {
  const [files, setFiles] = useState(() =>
    (
      getWorkspaceDocument(workspaceId).files || [
        {
          name: "index.js",
          language: "javascript",
          code: `function hello() {\n  console.log("Hello SyncSpace!");\n}`
        },
        {
          name: "script.py",
          language: "python",
          code: `def hello():\n    print("Hello SyncSpace!")\n\nhello()`
        }
      ]
    ).filter((file) => file.name !== "Main.java")
  );

  const filesRef = useRef(files);

  const [folders, setFolders] = useState(
    () => getWorkspaceDocument(workspaceId).folders || []
  );

  const foldersRef = useRef(folders);

  const [activeFile, setActiveFile] = useState("index.js");
  const [output, setOutput] = useState("Click Run to execute your code.");

  const currentFile =
    files.find((file) => file.name === activeFile) || files[0];

  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const editorRef = useRef(null);
  const syncedRef = useRef(false);

  /*
   * Create one Yjs document + Socket.IO provider
   * for the current workspace.
   */
  useEffect(() => {
    const ydoc = new Y.Doc();

    const provider = new SocketIOProvider(
      "http://localhost:5000",
      `codeeditor-${workspaceId || "default"}`,
      ydoc,
      {
        autoConnect: false, auth: { token: window.localStorage.getItem("syncspace-token") }
      }
    );

    ydocRef.current = ydoc;
    providerRef.current = provider;
    syncedRef.current = false;

    const handleSync = (isSynced) => {
      console.log(
        `[Yjs] codeeditor-${workspaceId} sync:`,
        isSynced
      );

      syncedRef.current = isSynced;

      if (isSynced) {
        bindActiveFile();
      }
    };

    const handleStatus = ({ status }) => {
      console.log(
        `[Yjs] codeeditor-${workspaceId} status:`,
        status
      );
    };

    provider.on("sync", handleSync);
    provider.on("status", handleStatus);

    provider.connect();

    return () => {
      provider.off("sync", handleSync);
      provider.off("status", handleStatus);

      bindingRef.current?.destroy();
      bindingRef.current = null;

      provider.disconnect();
      ydoc.destroy();

      ydocRef.current = null;
      providerRef.current = null;
      syncedRef.current = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  /*
   * Bind Monaco to the Y.Text for the active file.
   * IMPORTANT:
   * We only do this after the Yjs provider has synced.
   */
  const bindActiveFile = () => {
    const ydoc = ydocRef.current;
    const editor = editorRef.current;
    const provider = providerRef.current;

    if (!ydoc || !editor || !provider || !syncedRef.current) {
      return;
    }

    const model = editor.getModel();

    if (!model) {
      return;
    }

    bindingRef.current?.destroy();
    bindingRef.current = null;

    const yText = ydoc.getText(`file:${activeFile}`);

    /*
     * Seed the document ONLY after synchronization.
     * If MongoDB/Yjs already has content, we don't overwrite it.
     */
    if (yText.length === 0 && currentFile?.code) {
      yText.insert(0, currentFile.code);
    }

    console.log(
      `[Yjs] Binding file:${activeFile}, length:`,
      yText.length
    );

    bindingRef.current = new MonacoBinding(
      yText,
      model,
      new Set([editor]),
      provider.awareness
    );
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;

    if (syncedRef.current) {
      bindActiveFile();
    }
  };

  const handleCodeChange = (value) => {
    filesRef.current = filesRef.current.map((file) =>
      file.name === activeFile
        ? { ...file, code: value || "" }
        : file
    );
  };

  const handleAddFolder = () => {
    const trimmedName = window.prompt("Folder name:")?.trim();

    if (!trimmedName || foldersRef.current.includes(trimmedName)) {
      return;
    }

    const nextFolders = [...foldersRef.current, trimmedName];

    foldersRef.current = nextFolders;
    setFolders(nextFolders);
  };

  const handleAddFile = () => {
    const trimmedName = window
      .prompt("File name, for example app.ts:")
      ?.trim();

    if (
      !trimmedName ||
      filesRef.current.some((file) => file.name === trimmedName)
    ) {
      return;
    }

    const language =
      window
        .prompt(
          "Language: javascript, typescript, python, java, cpp, html, css, or json",
          "javascript"
        )
        ?.trim()
        .toLowerCase() || "javascript";

    const folder =
      foldersRef.current.length > 0
        ? window
            .prompt(
              `Folder name (optional):\n${foldersRef.current.join(", ")}`,
              ""
            )
            ?.trim() || ""
        : "";

    const newFile = {
      name: trimmedName,
      language,
      folder,
      code: ""
    };

    const nextFiles = [...filesRef.current, newFile];

    filesRef.current = nextFiles;
    setFiles(nextFiles);
    setActiveFile(trimmedName);
  };

  const handleSave = () => {
    saveWorkspaceDocument(workspaceId, {
      files: filesRef.current,
      folders: foldersRef.current
    });

    onActivity?.(`Saved ${activeFile}`, "code");
  };

  const handleRun = async () => {
    const code =
      editorRef.current?.getValue() ?? currentFile.code;

    const language = currentFile.language;

    setOutput(`Running ${currentFile.name}...`);

    try {
      const response = await fetch(
        "http://localhost:5000/api/execute/run",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            language,
            code
          })
        }
      );

      const result = await response.json();

      if (result.error) {
        setOutput(`Error: ${result.error}`);
      } else {
        const combined = [
          result.stdout,
          result.stderr,
          result.compileOutput
        ]
          .filter(Boolean)
          .join("\n");

        setOutput(combined || "(no output)");
      }
    } catch (err) {
      setOutput(
        `Failed to reach execution service: ${err.message}`
      );
    }

    onActivity?.(`Ran ${currentFile.name}`, "code");
  };

  return (
    <div className="editor-container">
      <div className="editor-explorer-bar">
        <span className="explorer-title">Files</span>

        <div className="explorer-actions">
          <button
            type="button"
            className="explorer-button"
            onClick={handleAddFolder}
          >
            + Folder
          </button>

          <button
            type="button"
            className="explorer-button"
            onClick={handleAddFile}
          >
            + File
          </button>
        </div>
      </div>

      <div className="editor-tabs">
        {files.map((file) => (
          <button
            key={file.name}
            className={`editor-tab ${
              activeFile === file.name ? "active" : ""
            }`}
            onClick={() => setActiveFile(file.name)}
          >
            {file.folder
              ? `${file.folder} / ${file.name}`
              : file.name}
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
          options={{
            fontSize: 14,
            minimap: {
              enabled: false
            },
            automaticLayout: true,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            padding: {
              top: 10
            }
          }}
        />
      </div>

      <div className="editor-run-bar">
        <span className="language-name">
          {currentFile.language}
        </span>

        <div className="editor-actions">
          <button
            className="save-button"
            onClick={handleSave}
          >
            Save
          </button>

          <button
            className="run-button"
            onClick={handleRun}
          >
            ▶ Run
          </button>
        </div>
      </div>

      <div className="editor-output">
        <div className="output-header">OUTPUT</div>

        <pre className="output-content">
          {output}
        </pre>
      </div>
    </div>
  );
}

export default CodeEditor;