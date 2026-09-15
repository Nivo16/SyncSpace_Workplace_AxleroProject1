import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Code2, Palette } from 'lucide-react';
import { getWorkspaceStore, saveWorkspaceHistory } from '../../../data/workspaceStore';
import { isInterviewWorkspace } from '../../../types/workspace';
import { InterviewRole, InterviewStatus } from '../types/interview.types';
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
  const workspace = getWorkspaceStore().workspaces.find((item) => String(item.id) === String(id));
  const workspaceId = Number(id) || id;
  const workspaceName = workspace?.name || `Interview ${id}`;
  const interview = useInterview(workspaceId, workspace);
  const [activeTool, setActiveTool] = useState('split');

  const remainingSeconds = useMemo(() => {
    if (!interview.durationMinutes) return 0;
    return Math.max(interview.durationMinutes * 60 - interview.elapsedSeconds, 0);
  }, [interview.durationMinutes, interview.elapsedSeconds]);

  const isInterviewer = interview.role === InterviewRole.INTERVIEWER;
  const showSetup = interview.status === InterviewStatus.SCHEDULED;

  const recordActivity = (action, source) => {
    saveWorkspaceHistory(workspaceId, { action, source });
  };

  const handleSaveNotes = () => {
    interview.saveNotes();
    showToast('Interview notes saved on this device', 'success');
  };

  if (workspace && !isInterviewWorkspace(workspace)) {
    return <Navigate to={`/workspaces/${id}`} replace />;
  }

  if (showSetup) {
    return (
      <div className="interview-workspace">
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
          defaultCandidate={interview.candidate.name === 'Candidate' ? '' : interview.candidate.name}
          defaultDuration={interview.durationMinutes}
          defaultDifficulty={interview.difficulty}
          defaultRole={interview.role}
          onStart={(setup) => {
            interview.configureAndStart(setup);
            showToast('Interview started', 'success');
          }}
        />
      </div>
    );
  }

  return (
    <div className="interview-workspace">
      <InterviewHeader
        title={workspaceName}
        status={interview.status}
        interviewerName={interview.interviewer.name}
        candidateName={interview.candidate.name}
        elapsedSeconds={interview.elapsedSeconds}
        remainingSeconds={remainingSeconds}
        timerMode="down"
        onBack={() => navigate('/dashboard')}
        onPause={interview.pauseInterview}
        onResume={interview.resumeInterview}
        onEnd={() => {
          interview.endInterview();
          showToast('Interview ended', 'info');
        }}
        canControl={isInterviewer}
      />

      <div className="interview-body">
        <aside className="interview-sidebar">
          <CandidateInfo interviewer={interview.interviewer} candidate={interview.candidate} />
          <InterviewQuestion
            question={interview.currentQuestion}
            questionIndex={interview.currentQuestionIndex}
            total={interview.questions.length}
            onPrev={interview.prevQuestion}
            onNext={interview.nextQuestion}
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
              className={activeTool === 'whiteboard' || activeTool === 'split' ? 'active' : ''}
              onClick={() => setActiveTool('whiteboard')}
            >
              <Palette className="w-4 h-4" />
              Whiteboard
            </button>
            <button
              type="button"
              className={activeTool === 'code' ? 'active' : ''}
              onClick={() => setActiveTool('code')}
            >
              <Code2 className="w-4 h-4" />
              Code Editor
            </button>
            <button
              type="button"
              className={`interview-split-tab ${activeTool === 'split' ? 'active' : ''}`}
              onClick={() => setActiveTool('split')}
            >
              Split
            </button>
          </div>

          <div className={`interview-stage interview-stage-${activeTool}`}>
            <section className="interview-panel whiteboard-panel" data-panel="whiteboard">
              <div className="panel-title">
                Whiteboard <span>Shared canvas</span>
              </div>
              <InterviewWhiteboard workspaceId={workspaceId} onActivity={recordActivity} />
            </section>
            <section className="interview-panel code-panel" data-panel="code">
              <div className="panel-title">
                Code Editor <span>JavaScript, TypeScript, Python, Java, C++, HTML, CSS, JSON</span>
              </div>
              <InterviewCodeEditor workspaceId={workspaceId} onActivity={recordActivity} />
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default InterviewWorkspacePage;
