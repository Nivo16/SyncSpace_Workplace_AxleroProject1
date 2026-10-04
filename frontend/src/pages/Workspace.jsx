import { useEffect, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import WorkspaceHeader from '../components/WorkspaceHeader';
import WorkspaceSidebar from '../components/WorkspaceSidebar';
import Whiteboard from '../components/Whiteboard';
import CodeEditor from '../components/CodeEditor';
import UsersPanel from '../components/UsersPanel';
import HistoryPanel from '../components/HistoryTemp';
import SettingsPanel from '../components/SettingsPanel';
import { apiClient } from '../api/client';
import {
  clearWorkspaceHistory,
  getWorkspaceHistory,
  getWorkspacePreferences,
  getWorkspaceStore,
  saveWorkspace,
  saveWorkspaceHistory,
  saveWorkspacePreferences
} from '../data/workspaceStore';
import { isInterviewWorkspace } from '../types/workspace';
import './Workspace.css';

export const WorkspacePage = () => {
  const { id = 'workspace' } = useParams();
  const navigate = useNavigate();
  const workspaceId = Number(id) || 0;

  const [currentWorkspace, setCurrentWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('whiteboard');

  const [splitRatio, setSplitRatio] = useState(
    () => getWorkspacePreferences(workspaceId).splitRatio
  );

  const [historyEntries, setHistoryEntries] = useState(
    () => getWorkspaceHistory(workspaceId)
  );

  useEffect(() => {
    let cancelled = false;

    const loadWorkspace = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await apiClient.getWorkspace(workspaceId);

        if (cancelled) return;

        const workspace = response.workspace;

        if (!workspace) {
          throw new Error('Workspace not found');
        }

        setCurrentWorkspace(workspace);
        saveWorkspace(workspace);

        const hasWhiteboard =
          workspace.type === 'Whiteboard' ||
          workspace.type === 'Code + Whiteboard';

        setActiveTab(hasWhiteboard ? 'whiteboard' : 'code');
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load workspace');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const recordActivity = (action, source) => {
    saveWorkspaceHistory(workspaceId, {
      action,
      source
    });

    setHistoryEntries(getWorkspaceHistory(workspaceId));
  };

  const handleAddUser = (user) => {
    const existingUsers =
      currentWorkspace.collaboratorList ||
      currentWorkspace.members ||
      [];

    const nextCollaboratorList = [
      ...existingUsers,
      user
    ];

    const nextWorkspace = {
      ...currentWorkspace,
      collaboratorList: nextCollaboratorList,
      collaborators: nextCollaboratorList.length,
      lastUpdated: 'Just now'
    };

    setCurrentWorkspace(nextWorkspace);
    saveWorkspace(nextWorkspace);

    recordActivity(
      `${user.name} joined the workspace`,
      'workspace'
    );
  };

  const handleDownload = () => {
    const exportData = {
      workspace: currentWorkspace,
      document:
        getWorkspaceStore().documents[String(workspaceId)] || {},
      history: getWorkspaceHistory(workspaceId)
    };

    const blob = new Blob(
      [JSON.stringify(exportData, null, 2)],
      {
        type: 'application/json'
      }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download =
      `${
        currentWorkspace.name
          .replace(/[^a-z0-9]+/gi, '-')
          .toLowerCase() || 'syncspace-workspace'
      }.json`;

    link.click();

    URL.revokeObjectURL(url);

    recordActivity(
      'Downloaded the workspace project',
      'workspace'
    );
  };

  const handleSplitRatioChange = (value) => {
    setSplitRatio(value);

    saveWorkspacePreferences(workspaceId, {
      splitRatio: value
    });
  };

  if (loading) {
    return (
      <div className="workspace">
        <div className="workspace-loading">
          Loading workspace...
        </div>
      </div>
    );
  }

  if (error || !currentWorkspace) {
    return (
      <div className="workspace">
        <div className="workspace-loading">
          <h2>Unable to load workspace</h2>

          <p>
            {error || 'Workspace not found'}
          </p>

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (isInterviewWorkspace(currentWorkspace)) {
    return (
      <Navigate
        to={`/interview/${id}`}
        replace
      />
    );
  }

  const workspaceType = currentWorkspace.type;

  const hasWhiteboard =
    workspaceType === 'Whiteboard' ||
    workspaceType === 'Code + Whiteboard';

  const hasCodeEditor =
    workspaceType === 'Code Editor' ||
    workspaceType === 'Code + Whiteboard';

  const hasBothTools =
    hasWhiteboard && hasCodeEditor;

  const defaultTab =
    hasWhiteboard ? 'whiteboard' : 'code';

  const visibleTabs = [
    'workspace',
    ...(hasWhiteboard ? ['whiteboard'] : []),
    ...(hasCodeEditor ? ['code'] : []),
    'users',
    'history',
    'settings'
  ];

  const safeActiveTab = visibleTabs.includes(activeTab)
    ? activeTab
    : defaultTab;

  const showingManagementPanel = [
    'users',
    'history',
    'settings'
  ].includes(safeActiveTab);

  return (
    <div
      className="workspace"
      data-active-tab={safeActiveTab}
    >
      <WorkspaceHeader
        roomId={id}
        workspaceName={currentWorkspace.name}
        workspaceType={workspaceType}
        onLeave={() => navigate('/dashboard')}
      />

      <div className="workspace-body">
        <WorkspaceSidebar
          activeTab={safeActiveTab}
          setActiveTab={setActiveTab}
          visibleTabs={visibleTabs}
        />

        <main
          className={`workspace-main ${
            showingManagementPanel
              ? 'workspace-main-single'
              : ''
          }`}
          style={{
            gridTemplateColumns:
              showingManagementPanel || !hasBothTools
                ? '1fr'
                : `${splitRatio}fr ${100 - splitRatio}fr`
          }}
        >
          {safeActiveTab === 'users' && (
            <UsersPanel
              workspace={currentWorkspace}
              onAddUser={handleAddUser}
            />
          )}

          {safeActiveTab === 'history' && (
            <HistoryPanel
              entries={historyEntries}
              onClear={() => {
                clearWorkspaceHistory(workspaceId);
                setHistoryEntries([]);
              }}
            />
          )}

          {safeActiveTab === 'settings' && (
            <SettingsPanel
              splitRatio={splitRatio}
              hasBothTools={hasBothTools}
              onSplitRatioChange={handleSplitRatioChange}
              onDownload={handleDownload}
            />
          )}

          {!showingManagementPanel &&
            hasWhiteboard && (
              <section
                className="whiteboard-panel"
                data-panel="whiteboard"
              >
                <div className="panel-title">
                  Whiteboard
                  <span>Visual workspace</span>
                </div>

                <Whiteboard
                  workspaceId={workspaceId}
                  onActivity={recordActivity}
                />
              </section>
            )}

          {!showingManagementPanel &&
            hasCodeEditor && (
              <section
                className="code-panel"
                data-panel="code"
              >
                <div className="panel-title">
                  Code Editor
                  <span>Project files</span>
                </div>

                <CodeEditor
                  workspaceId={workspaceId}
                  onActivity={recordActivity}
                />
              </section>
            )}
        </main>
      </div>
    </div>
  );
};

export default WorkspacePage;