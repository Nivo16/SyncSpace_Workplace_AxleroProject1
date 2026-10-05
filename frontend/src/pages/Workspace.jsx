import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import WorkspaceHeader from '../components/WorkspaceHeader';
import WorkspaceSidebar from '../components/WorkspaceSidebar';
import Whiteboard from '../components/Whiteboard';
import CodeEditor from '../components/CodeEditor';
import UsersPanel from '../components/UsersPanel';
import HistoryPanel from '../components/HistoryTemp';
import SettingsPanel from '../components/SettingsPanel';
import { clearWorkspaceHistory, getWorkspaceHistory, getWorkspacePreferences, getWorkspaceStore, saveWorkspace, saveWorkspaceHistory, saveWorkspacePreferences } from '../data/workspaceStore';
import { isInterviewWorkspace } from '../types/workspace';
import { workspaceApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import './Workspace.css';

const MONGO_ID_RE = /^[a-f0-9]{24}$/i;

export const WorkspacePage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const localWorkspace = getWorkspaceStore().workspaces.find((item) => String(item.id) === String(id));
  const [currentWorkspace, setCurrentWorkspace] = useState(localWorkspace || { id, name: 'Loading workspace…', description: '', collaborators: 0, status: 'Active', type: 'Code + Whiteboard' });
  const [loading, setLoading] = useState(MONGO_ID_RE.test(String(id)));
  const workspaceId = id;
  const [activeTab, setActiveTab] = useState('workspace');
  const [splitRatio, setSplitRatio] = useState(() => getWorkspacePreferences(workspaceId).splitRatio);
  const [historyEntries, setHistoryEntries] = useState(() => getWorkspaceHistory(workspaceId));

  useEffect(() => {
    let cancelled = false;
    if (!MONGO_ID_RE.test(String(id))) { setLoading(false); return undefined; }
    workspaceApi.get(id).then(({ workspace }) => { if (!cancelled) setCurrentWorkspace(workspace); }).catch((err) => showToast(err.message || 'Could not load workspace', 'error')).finally(() => { if (!cancelled) setLoading(false); });
    const socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', { auth: { token: localStorage.getItem('syncspace-token') || '' } });
    socket.on('connect', () => socket.emit('join-workspace', id));
    socket.on('workspace:updated', (workspace) => { if (!cancelled) setCurrentWorkspace(workspace); });
    socket.on('workspace:file-updated', (file) => {
      if (!cancelled) window.dispatchEvent(new CustomEvent('syncspace:file-updated', { detail: file }));
    });
    socket.on('workspace:file-deleted', (payload) => {
      if (!cancelled) window.dispatchEvent(new CustomEvent('syncspace:file-deleted', { detail: payload }));
    });
    return () => { cancelled = true; socket.disconnect(); };
  }, [id]);

  const workspaceType = currentWorkspace.type || 'Code + Whiteboard';
  const hasWhiteboard = workspaceType !== 'Code Editor';
  const hasCodeEditor = workspaceType !== 'Whiteboard';
  const hasBothTools = hasWhiteboard && hasCodeEditor;
  const defaultTab = hasWhiteboard ? 'whiteboard' : 'code';
  const visibleTabs = useMemo(() => ['workspace', ...(hasWhiteboard ? ['whiteboard'] : []), ...(hasCodeEditor ? ['code'] : []), 'users', 'history', 'settings'], [hasWhiteboard, hasCodeEditor]);
  const safeActiveTab = visibleTabs.includes(activeTab) ? activeTab : defaultTab;

  const recordActivity = (action, source) => { saveWorkspaceHistory(workspaceId, { action, source }); setHistoryEntries(getWorkspaceHistory(workspaceId)); };
  const handleAddUser = (user) => { const existing = currentWorkspace.collaboratorList || []; const next = { ...currentWorkspace, collaboratorList: [...existing, user], collaborators: existing.length + 1 }; setCurrentWorkspace(next); saveWorkspace(next); recordActivity(`${user.name} joined the workspace`, 'workspace'); };
  const handleDownload = () => { const exportData = { workspace: currentWorkspace, document: getWorkspaceStore().documents[String(workspaceId)] || {}, history: getWorkspaceHistory(workspaceId) }; const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${currentWorkspace.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'workspace'}.json`; a.click(); URL.revokeObjectURL(url); recordActivity('Downloaded workspace project', 'workspace'); };
  const showingManagement = ['users', 'history', 'settings'].includes(safeActiveTab);

  if (localWorkspace && isInterviewWorkspace(localWorkspace)) return <Navigate to={`/interview/${id}`} replace />;
  if (loading) return <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center">Loading workspace…</div>;

  return <div className="workspace" data-active-tab={safeActiveTab}>
    <WorkspaceHeader roomId={currentWorkspace.roomId || id} inviteCode={currentWorkspace.inviteCode || currentWorkspace.code} collaborators={currentWorkspace.collaboratorList || []} workspaceName={currentWorkspace.name} workspaceType={workspaceType} onLeave={() => navigate('/dashboard')} />
    <div className="workspace-body">
      <WorkspaceSidebar activeTab={safeActiveTab} setActiveTab={setActiveTab} visibleTabs={visibleTabs} />
      <main className={`workspace-main ${showingManagement ? 'workspace-main-single' : ''}`} style={{ gridTemplateColumns: showingManagement || !hasBothTools ? '1fr' : `${splitRatio}fr ${100 - splitRatio}fr` }}>
        {safeActiveTab === 'users' && <UsersPanel workspace={currentWorkspace} onAddUser={handleAddUser} />}
        {safeActiveTab === 'history' && <HistoryPanel entries={historyEntries} onClear={() => { clearWorkspaceHistory(workspaceId); setHistoryEntries([]); }} />}
        {safeActiveTab === 'settings' && <SettingsPanel splitRatio={splitRatio} hasBothTools={hasBothTools} onSplitRatioChange={(v) => { setSplitRatio(v); saveWorkspacePreferences(workspaceId, { splitRatio: v }); }} onDownload={handleDownload} />}
        {!showingManagement && safeActiveTab === 'workspace' && hasWhiteboard && <section className="whiteboard-panel"><div className="panel-title">Whiteboard <span>Visual workspace</span></div><Whiteboard workspaceId={workspaceId} roomId={currentWorkspace.roomId || workspaceId} onActivity={recordActivity} /></section>}
        {!showingManagement && safeActiveTab === 'workspace' && hasCodeEditor && <section className="code-panel"><div className="panel-title">Code Editor <span>Persistent project files</span></div><CodeEditor workspaceId={workspaceId} roomId={currentWorkspace.roomId || workspaceId} onActivity={recordActivity} /></section>}
        {!showingManagement && safeActiveTab === 'whiteboard' && hasWhiteboard && <section className="whiteboard-panel"><div className="panel-title">Whiteboard <span>Visual workspace</span></div><Whiteboard workspaceId={workspaceId} roomId={currentWorkspace.roomId || workspaceId} onActivity={recordActivity} /></section>}
        {!showingManagement && safeActiveTab === 'code' && hasCodeEditor && <section className="code-panel"><div className="panel-title">Code Editor <span>Persistent project files</span></div><CodeEditor workspaceId={workspaceId} roomId={currentWorkspace.roomId || workspaceId} onActivity={recordActivity} /></section>}
      </main>
    </div>
  </div>;
};
