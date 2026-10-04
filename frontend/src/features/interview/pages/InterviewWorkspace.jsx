import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Code2, Palette } from 'lucide-react';

import {
  getWorkspaceStore,
  saveWorkspaceHistory,
} from '../../../data/workspaceStore';
import { isInterviewWorkspace } from '../../../types/workspace';
import {
  InterviewRole,
  InterviewStatus,
} from '../types/interview.types';
import { useInterview } from '../hooks/useInterview';

import { InterviewHeader } from '../components/InterviewHeader';
import { CandidateInfo } from '../components/CandidateInfo';
import { InterviewQuestion } from '../components/InterviewQuestion';
import { InterviewNotes } from '../components/InterviewNotes';
import { InterviewWhiteboard } from '../components/InterviewWhiteboard';
import { InterviewCodeEditor } from '../components/InterviewCodeEditor';

import { InterviewSetup } from './InterviewSetup';
import { useToast } from '../../../context/ToastContext';

import '../styles/InterviewWorkspace.css';

export function InterviewWorkspacePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const workspace = getWorkspaceStore().workspaces.find(
    (item) => String(item.id) === String(id)
  );

  const workspaceId = Number(id) || id;
  const workspaceName = workspace?.name || `Interview ${id}`;

  const interview = useInterview(workspaceId, workspace);

  const [activeTool, setActiveTool] = useState('split');

  const remainingSeconds = useMemo(() => {
    if (!interview.durationMinutes) {
      return 0;
    }

    return Math.max(
      interview.durationMinutes * 60 - interview.elapsedSeconds,
      0
    );
  }, [
    interview.durationMinutes,
    interview.elapsedSeconds,
  ]);

  const isInterviewer =
    interview.role === InterviewRole.INTERVIEWER;

  const isCandidate =
    interview.role === InterviewRole.CANDIDATE;

  const isScheduled =
    interview.status === InterviewStatus.SCHEDULED;

  const isPaused =
    interview.status === InterviewStatus.PAUSED;

  const isCompleted =
    interview.status === InterviewStatus.COMPLETED ||
    interview.status === InterviewStatus.ENDED;

  const showSetup =
    isInterviewer && isScheduled;

  const recordActivity = (action, source) => {
    saveWorkspaceHistory(workspaceId, {
      action,
      source,
    });
  };

  const handleSaveNotes = async () => {
    if (!isInterviewer) {
      return;
    }

    const saved = await interview.saveNotes();

    if (saved) {
      showToast('Interview notes saved', 'success');
    } else {
      showToast('Failed to save interview notes', 'error');
    }
  };

  const handleStartInterview = async (setup) => {
    if (!isInterviewer) {
      return;
    }

    const startedInterview =
      await interview.configureAndStart(setup);

    if (startedInterview) {
      showToast('Interview started', 'success');
    }
  };

  const handlePauseInterview = async () => {
    if (!isInterviewer) {
      return;
    }

    const pausedInterview =
      await interview.pauseInterview();

    if (pausedInterview) {
      showToast('Interview paused', 'info');
    }
  };

  const handleResumeInterview = async () => {
    if (!isInterviewer) {
      return;
    }

    const resumedInterview =
      await interview.resumeInterview();

    if (resumedInterview) {
      showToast('Interview resumed', 'success');
    }
  };

  const handleEndInterview = async () => {
    if (!isInterviewer) {
      return;
    }

    const endedInterview =
      await interview.endInterview();

    if (endedInterview) {
      showToast('Interview ended', 'info');
    }
  };

  if (
    workspace &&
    !isInterviewWorkspace(workspace)
  ) {
    return (
      <Navigate
        to={`/workspaces/${id}`}
        replace
      />
    );
  }

  if (interview.loading) {
    return (
      <div className="interview-workspace">
        <div className="interview-loading">
          <div className="interview-loading-spinner" />

          <h2>
            Loading interview...
          </h2>

          <p>
            Connecting to the interview session.
          </p>
        </div>
      </div>
    );
  }

  if (showSetup) {
    return (
      <div className="interview-workspace">
        {interview.error && (
          <div className="interview-error-banner">
            <strong>
              Interview error:
            </strong>

            <span>
              {interview.error}
            </span>

            <button
              type="button"
              onClick={interview.reloadInterview}
            >
              Retry
            </button>
          </div>
        )}

        <InterviewHeader
          title={workspaceName}
          status={interview.status}
          interviewerName={interview.interviewer.name}
          candidateName={interview.candidate.name}
          elapsedSeconds={0}
          remainingSeconds={remainingSeconds}
          timerMode="up"
          onBack={() => navigate('/dashboard')}
          canControl={false}
        />

        <InterviewSetup
          workspaceName={workspaceName}
          defaultCandidate={
            interview.candidate.name === 'Candidate'
              ? ''
              : interview.candidate.name
          }
          defaultDuration={interview.durationMinutes}
          defaultDifficulty={interview.difficulty}
          defaultRole={InterviewRole.INTERVIEWER}
          onStart={handleStartInterview}
        />
      </div>
    );
  }

  return (
    <div className="interview-workspace">
      {interview.error && (
        <div className="interview-error-banner">
          <strong>
            Interview error:
          </strong>

          <span>
            {interview.error}
          </span>

          <button
            type="button"
            onClick={interview.reloadInterview}
          >
            Retry
          </button>
        </div>
      )}

      <InterviewHeader
        title={workspaceName}
        status={interview.status}
        interviewerName={interview.interviewer.name}
        candidateName={interview.candidate.name}
        elapsedSeconds={interview.elapsedSeconds}
        remainingSeconds={remainingSeconds}
        timerMode="down"
        onBack={() => navigate('/dashboard')}
        onPause={
          isInterviewer
            ? handlePauseInterview
            : undefined
        }
        onResume={
          isInterviewer
            ? handleResumeInterview
            : undefined
        }
        onEnd={
          isInterviewer
            ? handleEndInterview
            : undefined
        }
        canControl={
          isInterviewer &&
          !isCompleted
        }
      />

      {isCandidate && isScheduled && (
        <div className="candidate-interview-banner">
          <div>
            <strong>
              Waiting for interviewer
            </strong>

            <span>
              You have joined the interview.
              The interviewer will start the
              session when ready.
            </span>
          </div>
        </div>
      )}

      {isCandidate &&
        (isPaused || isCompleted) && (
          <div
            className={`candidate-interview-banner ${
              isCompleted
                ? 'candidate-interview-banner-ended'
                : ''
            }`}
          >
            <div>
              <strong>
                {isCompleted
                  ? 'Interview ended'
                  : 'Interview paused'}
              </strong>

              <span>
                {isCompleted
                  ? 'The interviewer has ended this interview session.'
                  : 'The interviewer has paused the interview. Please wait.'}
              </span>
            </div>
          </div>
        )}

      <div className="interview-body">
        <aside className="interview-sidebar">
          <CandidateInfo
            interviewer={interview.interviewer}
            candidate={interview.candidate}
          />

          <InterviewQuestion
            question={interview.currentQuestion}
            questionIndex={interview.currentQuestionIndex}
            total={interview.questions.length}
            onPrev={
              isInterviewer
                ? interview.prevQuestion
                : undefined
            }
            onNext={
              isInterviewer
                ? interview.nextQuestion
                : undefined
            }
          />

          {isInterviewer && (
            <div className="interview-notes-wrap">
              <InterviewNotes
                notes={interview.notes}
                onNotesChange={interview.setNotes}
                onSave={handleSaveNotes}
              />
            </div>
          )}
        </aside>

        <main className="interview-main">
          <div className="interview-tool-tabs">
            <button
              type="button"
              className={
                activeTool === 'whiteboard' ||
                activeTool === 'split'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveTool('whiteboard')
              }
            >
              <Palette className="w-4 h-4" />
              Whiteboard
            </button>

            <button
              type="button"
              className={
                activeTool === 'code'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveTool('code')
              }
            >
              <Code2 className="w-4 h-4" />
              Code Editor
            </button>

            <button
              type="button"
              className={`interview-split-tab ${
                activeTool === 'split'
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                setActiveTool('split')
              }
            >
              Split
            </button>
          </div>

          <div
            className={`interview-stage interview-stage-${activeTool}`}
          >
            <section
              className="interview-panel whiteboard-panel"
              data-panel="whiteboard"
            >
              <div className="panel-title">
                Whiteboard

                <span>
                  Shared canvas
                </span>
              </div>

              <InterviewWhiteboard
                workspaceId={workspaceId}
                onActivity={recordActivity}
              />
            </section>

            <section
              className="interview-panel code-panel"
              data-panel="code"
            >
              <div className="panel-title">
                Code Editor

                <span>
                  JavaScript, TypeScript,
                  Python, Java, C++,
                  HTML, CSS, JSON
                </span>
              </div>

              <InterviewCodeEditor
                workspaceId={workspaceId}
                onActivity={recordActivity}
              />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default InterviewWorkspacePage;