const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const request = async (path, options = {}) => {
  const token = window.localStorage.getItem("syncspace-token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || `API request failed: ${response.status}`
    );
  }

  return data;
};

export const apiClient = {
  getState: () => request("/state"),

  saveState: (state) =>
    request("/state", {
      method: "PUT",
      body: JSON.stringify(state)
    }),

  saveDocument: (workspaceId, document) =>
    request(`/workspaces/${workspaceId}/document`, {
      method: "PUT",
      body: JSON.stringify(document)
    }),

  addHistory: (workspaceId, entry) =>
    request(`/workspaces/${workspaceId}/history`, {
      method: "POST",
      body: JSON.stringify(entry)
    }),

  savePreferences: (workspaceId, preferences) =>
    request(`/workspaces/${workspaceId}/preferences`, {
      method: "PUT",
      body: JSON.stringify(preferences)
    }),

  getWorkspaces: () => request("/workspaces"),

  getWorkspace: (workspaceId) =>
    request(`/workspaces/${workspaceId}`),

  createWorkspace: (workspace) =>
    request("/workspaces", {
      method: "POST",
      body: JSON.stringify(workspace)
    }),

  updateWorkspace: (workspaceId, workspace) =>
    request(`/workspaces/${workspaceId}`, {
      method: "PUT",
      body: JSON.stringify(workspace)
    }),

  joinWorkspace: (workspaceId) =>
    request(`/workspaces/${workspaceId}/join`, {
      method: "POST"
    }),

  health: () => request("/health"),

  
  getInterview: (workspaceId) =>
    request(`/interviews/${workspaceId}`),

  createInterview: (workspaceId, data = {}) =>
    request(`/interviews/${workspaceId}`, {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateInterview: (workspaceId, updates = {}) =>
    request(`/interviews/${workspaceId}`, {
      method: "PUT",
      body: JSON.stringify(updates)
    }),

  startInterview: (workspaceId) =>
    request(`/interviews/${workspaceId}/start`, {
      method: "POST"
    }),

  pauseInterview: (workspaceId, elapsedSeconds) =>
    request(`/interviews/${workspaceId}/pause`, {
      method: "POST",
      body: JSON.stringify({
        elapsedSeconds
      })
    }),

  resumeInterview: (workspaceId) =>
    request(`/interviews/${workspaceId}/resume`, {
      method: "POST"
    }),

  endInterview: (workspaceId, elapsedSeconds) =>
    request(`/interviews/${workspaceId}/end`, {
      method: "POST",
      body: JSON.stringify({
        elapsedSeconds
      })
    }),

  saveInterviewNotes: (workspaceId, notes) =>
    request(`/interviews/${workspaceId}/notes`, {
      method: "PUT",
      body: JSON.stringify({
        notes
      })
    }),

  getInterviewQuestions: (workspaceId) =>
    request(`/interviews/${workspaceId}/questions`),

  createInterviewQuestion: (workspaceId, question) =>
    request(`/interviews/${workspaceId}/questions`, {
      method: "POST",
      body: JSON.stringify(question)
    })
};