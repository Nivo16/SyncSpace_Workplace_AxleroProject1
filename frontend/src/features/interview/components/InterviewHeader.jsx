import { ArrowLeft } from 'lucide-react';
import { InterviewTimer } from './InterviewTimer';
import { InterviewControls } from './InterviewControls';
import { InterviewStatus } from '../types/interview.types';

const statusLabel = {
  [InterviewStatus.SCHEDULED]: 'Scheduled',
  [InterviewStatus.ACTIVE]: 'LIVE',
  [InterviewStatus.PAUSED]: 'Paused',
  [InterviewStatus.COMPLETED]: 'Ended',
};

export function InterviewHeader({
  title,
  status,
  interviewerName,
  candidateName,
  elapsedSeconds,
  remainingSeconds,
  timerMode = 'up',
  onBack,
  onPause,
  onResume,
  onEnd,
  canControl = true,
}) {
  const isLive = status === InterviewStatus.ACTIVE;
  const displaySeconds = timerMode === 'down' ? remainingSeconds : elapsedSeconds;

  return (
    <header className="interview-header">
      <div className="interview-header-left">
        <button type="button" className="interview-back-btn" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
        <div className="interview-header-title-block">
          <p className="interview-kicker">Technical Interview</p>
          <h1>{title}</h1>
        </div>
      </div>

      <div className="interview-header-center">
        <div className="interview-people">
          <span>
            Interviewer <strong>{interviewerName}</strong>
          </span>
          <span>
            Candidate <strong>{candidateName}</strong>
          </span>
        </div>
      </div>

      <div className="interview-header-right">
        <span className={`interview-status-badge interview-status-${status}`}>
          <span className={isLive ? 'interview-live-dot' : ''} />
          {statusLabel[status] || status}
        </span>
        <InterviewTimer
          elapsedSeconds={displaySeconds}
          isRunning={isLive}
          mode={timerMode}
        />
        {canControl && (
          <InterviewControls
            status={status}
            onPause={onPause}
            onResume={onResume}
            onEnd={onEnd}
          />
        )}
      </div>
    </header>
  );
}

export default InterviewHeader;
