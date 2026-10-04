const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api";

const getToken = () => {
  return (
    localStorage.getItem("syncspace-token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth-token") ||
    ""
  );
};

const request = async (path, options = {}) => {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
    ...(options.headers || {}),
  };

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("Interview API network error:", error);

    throw new Error(
      "Unable to connect to the interview server. Please check that the backend is running."
    );
  }

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
};

export const getInterview = async (workspaceId) => {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }

  return request(`/interviews/${workspaceId}`);
};

export const syncInterview = async (workspaceId) => {
  return getInterview(workspaceId);
};

export const createInterview = async (
  workspaceId,
  payload = {}
) => {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }

  return request(`/interviews/${workspaceId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const updateInterview = async (
  workspaceId,
  updates = {}
) => {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }

  return request(`/interviews/${workspaceId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
};

export const startInterview = async (workspaceId) => {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }

  return request(`/interviews/${workspaceId}/start`, {
    method: "POST",
    body: JSON.stringify({}),
  });
};

export const pauseInterview = async (
  workspaceId,
  elapsedSeconds
) => {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }

  const payload =
    elapsedSeconds !== undefined
      ? { elapsedSeconds }
      : {};

  return request(`/interviews/${workspaceId}/pause`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const resumeInterview = async (workspaceId) => {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }

  return request(`/interviews/${workspaceId}/resume`, {
    method: "POST",
    body: JSON.stringify({}),
  });
};

export const endInterview = async (
  workspaceId,
  elapsedSeconds
) => {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }

  const payload =
    elapsedSeconds !== undefined
      ? { elapsedSeconds }
      : {};

  return request(`/interviews/${workspaceId}/end`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

export const saveNotes = async (
  workspaceId,
  notes
) => {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }

  return request(`/interviews/${workspaceId}/notes`, {
    method: "PUT",
    body: JSON.stringify({
      notes: notes || "",
    }),
  });
};

export const getInterviewQuestions = async (
  workspaceId
) => {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }

  const data = await request(
    `/interviews/${workspaceId}/questions`
  );

  return {
    questions: Array.isArray(data?.questions)
      ? data.questions
      : [],
    currentQuestionIndex:
      Number(data?.currentQuestionIndex) || 0,
  };
};

export const createInterviewQuestion = async (
  workspaceId,
  question = {}
) => {
  if (!workspaceId) {
    throw new Error("Workspace ID is required");
  }

  return request(
    `/interviews/${workspaceId}/questions`,
    {
      method: "POST",
      body: JSON.stringify(question),
    }
  );
};