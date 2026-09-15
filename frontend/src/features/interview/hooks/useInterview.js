import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { InterviewRole, InterviewStatus, DifficultyLevel } from '../types/interview.types';
import { interviewQuestions } from '../data/interviewQuestions';
import * as interviewService from '../services/interviewService';
import { getCurrentUserName } from '../../../data/currentUser';
import { getInterviewRecord, saveInterviewRecord } from '../../../data/workspaceStore';

const initials = (name) =>
  String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

/**
 * Interview state for a workspace. Local persistence is real (workspace store).
 * Service calls are stubs until a dedicated interview backend exists.
 */
export function useInterview(workspaceId, workspace) {
  const saved = getInterviewRecord(workspaceId) || {};
  const interviewerName = getCurrentUserName() || workspace?.owner || 'Interviewer';

  const [status, setStatus] = useState(saved.status || InterviewStatus.SCHEDULED);
  const [role, setRole] = useState(saved.role || InterviewRole.INTERVIEWER);
  const [candidateName, setCandidateName] = useState(saved.candidateName || 'Candidate');
  const [durationMinutes, setDurationMinutes] = useState(saved.durationMinutes || 45);
  const [difficulty, setDifficulty] = useState(saved.difficulty || DifficultyLevel.MEDIUM);
  const [elapsedSeconds, setElapsedSeconds] = useState(saved.elapsedSeconds || 0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(saved.currentQuestionIndex || 0);
  const [notes, setNotes] = useState(saved.notes || '');
  const timerRef = useRef(null);
  const elapsedRef = useRef(elapsedSeconds);

  elapsedRef.current = elapsedSeconds;

  const persist = useCallback((patch) => {
    saveInterviewRecord(workspaceId, {
      status,
      role,
      candidateName,
      durationMinutes,
      difficulty,
      elapsedSeconds: elapsedRef.current,
      currentQuestionIndex,
      notes,
      ...patch,
    });
  }, [workspaceId, status, role, candidateName, durationMinutes, difficulty, currentQuestionIndex, notes]);

  const startTimer = useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  useEffect(() => {
    if (status === InterviewStatus.ACTIVE) startTimer();
  }, [status, startTimer]);

  useEffect(() => {
    if (status !== InterviewStatus.ACTIVE) return undefined;
    const id = setInterval(() => {
      persist({ elapsedSeconds: elapsedRef.current });
    }, 5000);
    return () => clearInterval(id);
  }, [status, persist]);

  const questions = useMemo(() => {
    const matching = interviewQuestions.filter((question) => question.difficulty === difficulty);
    return matching.length > 0 ? matching : interviewQuestions;
  }, [difficulty]);

  const currentQuestion = questions[currentQuestionIndex] || questions[0] || null;

  const nextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => {
      const next = prev < questions.length - 1 ? prev + 1 : prev;
      persist({ currentQuestionIndex: next });
      return next;
    });
  }, [questions.length, persist]);

  const prevQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => {
      const next = prev > 0 ? prev - 1 : prev;
      persist({ currentQuestionIndex: next });
      return next;
    });
  }, [persist]);

  const saveNotes = useCallback(() => {
    persist({ notes });
    interviewService.saveNotes(workspaceId, notes);
  }, [workspaceId, notes, persist]);

  const configureAndStart = useCallback((setup) => {
    const next = {
      status: InterviewStatus.ACTIVE,
      role: setup.role || InterviewRole.INTERVIEWER,
      candidateName: setup.candidateName || 'Candidate',
      durationMinutes: setup.durationMinutes || 45,
      difficulty: setup.difficulty || DifficultyLevel.MEDIUM,
      elapsedSeconds: 0,
      startedAt: new Date().toISOString(),
    };
    setStatus(next.status);
    setRole(next.role);
    setCandidateName(next.candidateName);
    setDurationMinutes(next.durationMinutes);
    setDifficulty(next.difficulty);
    setElapsedSeconds(0);
    setCurrentQuestionIndex(0);
    persist(next);
    startTimer();
    interviewService.startInterview(workspaceId, next);
  }, [persist, startTimer, workspaceId]);

  const pauseInterview = useCallback(() => {
    setStatus(InterviewStatus.PAUSED);
    stopTimer();
    persist({ status: InterviewStatus.PAUSED, elapsedSeconds: elapsedRef.current });
    interviewService.pauseInterview(workspaceId);
  }, [persist, stopTimer, workspaceId]);

  const resumeInterview = useCallback(() => {
    setStatus(InterviewStatus.ACTIVE);
    persist({ status: InterviewStatus.ACTIVE });
    startTimer();
    interviewService.resumeInterview(workspaceId);
  }, [persist, startTimer, workspaceId]);

  const endInterview = useCallback(() => {
    setStatus(InterviewStatus.COMPLETED);
    stopTimer();
    persist({
      status: InterviewStatus.COMPLETED,
      elapsedSeconds: elapsedRef.current,
      endedAt: new Date().toISOString(),
    });
    interviewService.endInterview(workspaceId);
  }, [persist, stopTimer, workspaceId]);

  const interviewer = {
    id: 'interviewer',
    name: interviewerName,
    role: InterviewRole.INTERVIEWER,
    status: 'online',
    avatar: initials(interviewerName),
  };

  const candidate = {
    id: 'candidate',
    name: candidateName,
    role: InterviewRole.CANDIDATE,
    status: 'online',
    avatar: initials(candidateName),
  };

  return {
    status,
    role,
    interviewer,
    candidate,
    elapsedSeconds,
    durationMinutes,
    difficulty,
    questions,
    currentQuestion,
    currentQuestionIndex,
    nextQuestion,
    prevQuestion,
    notes,
    setNotes,
    saveNotes,
    configureAndStart,
    pauseInterview,
    resumeInterview,
    endInterview,
  };
}
