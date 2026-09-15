import { useState } from 'react';
import { Mic } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { InterviewRole, DifficultyLevel } from '../types/interview.types';

export function InterviewSetup({
  workspaceName,
  defaultCandidate = '',
  defaultDuration = 45,
  defaultDifficulty = DifficultyLevel.MEDIUM,
  defaultRole = InterviewRole.INTERVIEWER,
  onStart,
}) {
  const [candidateName, setCandidateName] = useState(defaultCandidate);
  const [durationMinutes, setDurationMinutes] = useState(defaultDuration);
  const [difficulty, setDifficulty] = useState(defaultDifficulty);
  const [role, setRole] = useState(defaultRole);

  const handleSubmit = (event) => {
    event.preventDefault();
    onStart({
      candidateName: candidateName.trim() || 'Candidate',
      durationMinutes: Number(durationMinutes) || 45,
      difficulty,
      role,
    });
  };

  return (
    <div className="interview-setup">
      <div className="interview-setup-card">
        <div className="interview-setup-icon">
          <Mic className="w-6 h-6 text-cyan-300" />
        </div>
        <p className="interview-kicker">Interview Setup</p>
        <h2>{workspaceName}</h2>
        <p className="interview-setup-copy">
          Confirm the candidate and session details, then start the live interview.
        </p>

        <form onSubmit={handleSubmit} className="interview-setup-form">
          <label>
            Candidate name
            <input
              type="text"
              value={candidateName}
              onChange={(event) => setCandidateName(event.target.value)}
              placeholder="e.g. Jordan Lee"
            />
          </label>

          <label>
            Duration
            <select
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(Number(event.target.value))}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
            </select>
          </label>

          <label>
            Difficulty
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              <option value={DifficultyLevel.EASY}>Easy</option>
              <option value={DifficultyLevel.MEDIUM}>Medium</option>
              <option value={DifficultyLevel.HARD}>Hard</option>
            </select>
          </label>

          <fieldset className="interview-role-fieldset">
            <legend>Your role</legend>
            <label className={role === InterviewRole.INTERVIEWER ? 'selected' : ''}>
              <input
                type="radio"
                name="interview-role"
                checked={role === InterviewRole.INTERVIEWER}
                onChange={() => setRole(InterviewRole.INTERVIEWER)}
              />
              Interviewer
            </label>
            <label className={role === InterviewRole.CANDIDATE ? 'selected' : ''}>
              <input
                type="radio"
                name="interview-role"
                checked={role === InterviewRole.CANDIDATE}
                onChange={() => setRole(InterviewRole.CANDIDATE)}
              />
              Candidate
            </label>
          </fieldset>

          <Button type="submit" variant="thunder">
            Start Interview
          </Button>
        </form>
      </div>
    </div>
  );
}

export default InterviewSetup;
