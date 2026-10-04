import {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  InterviewStatus,
  InterviewRole,
  DifficultyLevel
} from "../types/interview.types";

import * as interviewService from "../services/interviewService";

const initials = (name = "") => {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U"
  );
};

const normalizeQuestion = (question = {}) => {
  const questionId =
    question.questionId ||
    question.id ||
    "";

  return {
    ...question,

    id:
      question.id ||
      questionId,

    questionId,

    title:
      question.title ||
      "Untitled Question",

    description:
      question.description ||
      "",

    difficulty:
      question.difficulty ||
      DifficultyLevel.MEDIUM,

    category:
      question.category ||
      "Algorithms",

    starterCode:
      question.starterCode ||
      "",

    isCustom:
      Boolean(question.isCustom),

    updatedAt:
      question.updatedAt ||
      new Date().toISOString(),

    updatedBy:
      question.updatedBy ||
      null
  };
};

const toBackendQuestion = (question) => {
  if (!question) {
    return null;
  }

  return {
    questionId:
      question.questionId ||
      question.id ||
      "",

    title:
      question.title ||
      "Untitled Question",

    description:
      question.description ||
      "",

    difficulty:
      question.difficulty ||
      DifficultyLevel.MEDIUM,

    category:
      question.category ||
      "Algorithms",

    starterCode:
      question.starterCode ||
      "",

    isCustom:
      Boolean(question.isCustom),

    updatedAt:
      question.updatedAt ||
      new Date().toISOString(),

    updatedBy:
      question.updatedBy ||
      null
  };
};

export function useInterview(
  workspaceId,
  workspace
) {
  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [status, setStatus] =
    useState(
      InterviewStatus.SCHEDULED
    );

  const [role, setRole] =
    useState(
      InterviewRole.INTERVIEWER
    );

  const [candidateName, setCandidateName] =
    useState("Candidate");

  const [durationMinutes, setDurationMinutes] =
    useState(60);

  const [difficulty, setDifficulty] =
    useState(
      DifficultyLevel.MEDIUM
    );

  const [elapsedSeconds, setElapsedSeconds] =
    useState(0);

  const [notes, setNotesState] =
    useState("");

  const [questions, setQuestions] =
    useState([]);

  const [
    currentQuestionIndex,
    setCurrentQuestionIndex
  ] = useState(0);

  const [liveQuestion, setLiveQuestion] =
    useState(null);

  const timerRef =
    useRef(null);

  const elapsedRef =
    useRef(0);

  
  const notesDirtyRef =
    useRef(false);

  const notesRef =
    useRef("");

  elapsedRef.current =
    elapsedSeconds;

  
  const setNotes =
    useCallback((value) => {
      const nextValue =
        typeof value === "function"
          ? value(notesRef.current)
          : value;

      notesRef.current =
        nextValue;

      notesDirtyRef.current =
        true;

      setNotesState(
        nextValue
      );
    }, []);

  const applyServerNotes =
    useCallback((serverNotes = "") => {
            if (
        notesDirtyRef.current
      ) {
        return;
      }

      const nextNotes =
        serverNotes || "";

      notesRef.current =
        nextNotes;

      setNotesState(
        nextNotes
      );
    }, []);

  const loadInterview =
    useCallback(async () => {
      if (!workspaceId) {
        return;
      }

      try {
        setLoading(true);
        setError("");

        const interview =
          await interviewService.getInterview(
            workspaceId
          );

        if (!interview) {
          throw new Error(
            "Interview data was not returned"
          );
        }

        setStatus(
          interview.status ||
            InterviewStatus.SCHEDULED
        );

        const viewerRole =
          interview.viewerRole ===
          InterviewRole.CANDIDATE
            ? InterviewRole.CANDIDATE
            : InterviewRole.INTERVIEWER;

        setRole(viewerRole);

        setCandidateName(
          interview.candidate?.name ||
            "Candidate"
        );

        setDurationMinutes(
          Number(
            interview.durationMinutes
          ) || 60
        );

        setDifficulty(
          interview.difficulty ||
            DifficultyLevel.MEDIUM
        );

        setElapsedSeconds(
          Number(
            interview.elapsedSeconds
          ) || 0
        );

        if (
          viewerRole ===
          InterviewRole.INTERVIEWER
        ) {
          applyServerNotes(
            interview.notes || ""
          );
        }

        const normalizedQuestions =
          Array.isArray(
            interview.questions
          )
            ? interview.questions.map(
                normalizeQuestion
              )
            : [];

        setQuestions(
          normalizedQuestions
        );

        const questionIndex = Math.min(
          Math.max(
            Number(
              interview.currentQuestionIndex
            ) || 0,
            0
          ),
          Math.max(
            normalizedQuestions.length - 1,
            0
          )
        );

        setCurrentQuestionIndex(
          questionIndex
        );

        const backendLiveQuestion =
          interview.liveQuestion
            ? normalizeQuestion(
                interview.liveQuestion
              )
            : normalizedQuestions[
                questionIndex
              ] || null;

        setLiveQuestion(
          backendLiveQuestion
        );
      } catch (err) {
        console.error(
          "Failed to load interview:",
          err
        );

        setError(
          err.message ||
            "Failed to load interview"
        );
      } finally {
        setLoading(false);
      }
    }, [
      workspaceId,
      applyServerNotes
    ]);

  useEffect(() => {
    loadInterview();
  }, [loadInterview]);

  
  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    const syncInterview = async () => {
      try {
        const interview =
          await interviewService.getInterview(
            workspaceId
          );

        if (!interview) {
          return;
        }

        setStatus(
          interview.status ||
            InterviewStatus.SCHEDULED
        );

        setElapsedSeconds(
          Number(
            interview.elapsedSeconds
          ) || 0
        );

        setDurationMinutes(
          Number(
            interview.durationMinutes
          ) || 60
        );

        setDifficulty(
          interview.difficulty ||
            DifficultyLevel.MEDIUM
        );

        if (
          interview.candidate?.name
        ) {
          setCandidateName(
            interview.candidate.name
          );
        }

        const viewerRole =
          interview.viewerRole ===
          InterviewRole.CANDIDATE
            ? InterviewRole.CANDIDATE
            : InterviewRole.INTERVIEWER;

        setRole(viewerRole);

        if (
          Array.isArray(
            interview.questions
          )
        ) {
          const normalizedQuestions =
            interview.questions.map(
              normalizeQuestion
            );

          setQuestions(
            normalizedQuestions
          );

          const questionIndex = Math.min(
            Math.max(
              Number(
                interview.currentQuestionIndex
              ) || 0,
              0
            ),
            Math.max(
              normalizedQuestions.length - 1,
              0
            )
          );

          setCurrentQuestionIndex(
            questionIndex
          );

          const synchronizedLiveQuestion =
            interview.liveQuestion
              ? normalizeQuestion(
                  interview.liveQuestion
                )
              : normalizedQuestions[
                  questionIndex
                ] || null;

          setLiveQuestion(
            synchronizedLiveQuestion
          );
        }

        /*
         * Only update notes from the backend
         * when the interviewer has no unsaved
         * local changes.
         */
        if (
          viewerRole ===
          InterviewRole.INTERVIEWER
        ) {
          applyServerNotes(
            interview.notes || ""
          );
        }
      } catch (err) {
        console.error(
          "Interview synchronization error:",
          err
        );
      }
    };

    const syncInterval =
      setInterval(
        syncInterview,
        2000
      );

    return () => {
      clearInterval(
        syncInterval
      );
    };
  }, [
    workspaceId,
    applyServerNotes
  ]);

  const startTimer =
    useCallback(() => {
      if (timerRef.current) {
        return;
      }

      timerRef.current =
        setInterval(() => {
          setElapsedSeconds(
            (previous) => {
              const next =
                previous + 1;

              elapsedRef.current =
                next;

              return next;
            }
          );
        }, 1000);
    }, []);

  const stopTimer =
    useCallback(() => {
      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );

        timerRef.current =
          null;
      }
    }, []);

  useEffect(() => {
    if (
      status ===
      InterviewStatus.ACTIVE
    ) {
      startTimer();
    } else {
      stopTimer();
    }

    return () => {
      stopTimer();
    };
  }, [
    status,
    startTimer,
    stopTimer
  ]);

  const updateInterview =
    useCallback(
      async (updates = {}) => {
        try {
          const interview =
            await interviewService.updateInterview(
              workspaceId,
              updates
            );

          return interview || null;
        } catch (err) {
          console.error(
            "Failed to update interview:",
            err
          );

          setError(
            err.message ||
              "Failed to update interview"
          );

          return null;
        }
      },
      [workspaceId]
    );

  const createInterviewQuestion =
    useCallback(
      async (draft = {}) => {
        try {
          const questionResponse =
            await interviewService.createInterviewQuestion(
              workspaceId,
              {
                title:
                  draft.title ||
                  "Untitled Question",

                description:
                  draft.description ||
                  "",

                difficulty:
                  draft.difficulty ||
                  difficulty ||
                  DifficultyLevel.MEDIUM,

                category:
                  draft.category ||
                  "Algorithms",

                starterCode:
                  draft.starterCode ||
                  ""
              }
            );

          const question =
            normalizeQuestion(
              questionResponse?.question ||
                questionResponse
            );

          if (!question.questionId) {
            throw new Error(
              "Backend did not return question ID"
            );
          }

          const newIndex =
            questions.length;

          setQuestions(
            (previous) => [
              ...previous,
              question
            ]
          );

          setCurrentQuestionIndex(
            newIndex
          );

          setLiveQuestion(
            question
          );

          await updateInterview({
            currentQuestionIndex:
              newIndex,

            liveQuestion:
              toBackendQuestion(
                question
              )
          });

          return question;
        } catch (err) {
          console.error(
            "Failed to create interview question:",
            err
          );

          setError(
            err.message ||
              "Failed to create interview question"
          );

          return null;
        }
      },
      [
        workspaceId,
        difficulty,
        questions.length,
        updateInterview
      ]
    );

  const updateInterviewQuestion =
    useCallback(
      async (updates = {}) => {
        if (
          !questions[
            currentQuestionIndex
          ]
        ) {
          return null;
        }

        const currentQuestion =
          questions[
            currentQuestionIndex
          ];

        const updatedQuestion = {
          ...currentQuestion,
          ...updates,

          questionId:
            currentQuestion.questionId ||
            currentQuestion.id,

          id:
            currentQuestion.id ||
            currentQuestion.questionId,

          updatedAt:
            new Date().toISOString()
        };

        const nextQuestions =
          questions.map(
            (question, index) =>
              index ===
              currentQuestionIndex
                ? updatedQuestion
                : question
          );

        setQuestions(
          nextQuestions
        );

        setLiveQuestion(
          updatedQuestion
        );

        await updateInterview({
          currentQuestionIndex,

          liveQuestion:
            toBackendQuestion(
              updatedQuestion
            ),

          questions:
            nextQuestions.map(
              toBackendQuestion
            )
        });

        return updatedQuestion;
      },
      [
        questions,
        currentQuestionIndex,
        updateInterview
      ]
    );

  const rewriteInterviewQuestion =
    useCallback(
      async (draft = {}) => {
        if (
          !questions[
            currentQuestionIndex
          ]
        ) {
          return createInterviewQuestion(
            draft
          );
        }

        const currentQuestion =
          questions[
            currentQuestionIndex
          ];

        return updateInterviewQuestion({
          title:
            draft.title ??
            currentQuestion.title ??
            "",

          description:
            draft.description ??
            currentQuestion.description ??
            "",

          difficulty:
            draft.difficulty ??
            currentQuestion.difficulty ??
            difficulty,

          category:
            draft.category ??
            currentQuestion.category ??
            "Algorithms",

          starterCode:
            draft.starterCode ??
            currentQuestion.starterCode ??
            ""
        });
      },
      [
        questions,
        currentQuestionIndex,
        createInterviewQuestion,
        updateInterviewQuestion,
        difficulty
      ]
    );

  const publishQuestion =
    useCallback(
      async () => {
        const question =
          questions[
            currentQuestionIndex
          ];

        if (!question) {
          return null;
        }

        setLiveQuestion(
          question
        );

        const updated =
          await updateInterview({
            currentQuestionIndex,

            liveQuestion:
              toBackendQuestion(
                question
              )
          });

        if (!updated) {
          return null;
        }

        return question;
      },
      [
        questions,
        currentQuestionIndex,
        updateInterview
      ]
    );

  const nextQuestion =
    useCallback(
      async () => {
        if (!questions.length) {
          return null;
        }

        const nextIndex =
          Math.min(
            currentQuestionIndex + 1,
            questions.length - 1
          );

        const nextQuestionData =
          questions[nextIndex] ||
          null;

        setCurrentQuestionIndex(
          nextIndex
        );

        setLiveQuestion(
          nextQuestionData
        );

        const updated =
          await updateInterview({
            currentQuestionIndex:
              nextIndex,

            liveQuestion:
              toBackendQuestion(
                nextQuestionData
              )
          });

        if (!updated) {
          return null;
        }

        return nextQuestionData;
      },
      [
        currentQuestionIndex,
        questions,
        updateInterview
      ]
    );

  const prevQuestion =
    useCallback(
      async () => {
        if (!questions.length) {
          return null;
        }

        const previousIndex =
          Math.max(
            currentQuestionIndex - 1,
            0
          );

        const previousQuestion =
          questions[
            previousIndex
          ] || null;

        setCurrentQuestionIndex(
          previousIndex
        );

        setLiveQuestion(
          previousQuestion
        );

        const updated =
          await updateInterview({
            currentQuestionIndex:
              previousIndex,

            liveQuestion:
              toBackendQuestion(
                previousQuestion
              )
          });

        if (!updated) {
          return null;
        }

        return previousQuestion;
      },
      [
        currentQuestionIndex,
        questions,
        updateInterview
      ]
    );

  const selectQuestion =
    useCallback(
      async (index) => {
        if (
          index < 0 ||
          index >= questions.length
        ) {
          return null;
        }

        const selectedQuestion =
          questions[index];

        setCurrentQuestionIndex(
          index
        );

        setLiveQuestion(
          selectedQuestion
        );

        const updated =
          await updateInterview({
            currentQuestionIndex:
              index,

            liveQuestion:
              toBackendQuestion(
                selectedQuestion
              )
          });

        if (!updated) {
          return null;
        }

        return selectedQuestion;
      },
      [
        questions,
        updateInterview
      ]
    );

  /*
   * Save interview notes.
   *
   * The dirty flag is cleared ONLY after
   * the backend save succeeds.
   */
  const saveNotes =
    useCallback(
      async () => {
        try {
          const notesToSave =
            notesRef.current;

          const saved =
            await interviewService.saveNotes(
              workspaceId,
              notesToSave
            );

          const savedNotes =
            saved?.notes !== undefined
              ? saved.notes
              : notesToSave;

          notesRef.current =
            savedNotes;

          setNotesState(
            savedNotes
          );

          /*
           * Now it is safe for the 2-second
           * synchronization to update notes.
           */
          notesDirtyRef.current =
            false;

          return true;
        } catch (err) {
          console.error(
            "Failed to save interview notes:",
            err
          );

          setError(
            err.message ||
              "Failed to save interview notes"
          );

          
          notesDirtyRef.current =
            true;

          return false;
        }
      },
      [workspaceId]
    );

  const configureAndStart =
    useCallback(
      async (setup = {}) => {
        const nextCandidate =
          setup.candidateName ||
          "Candidate";

        const nextDuration =
          Number(
            setup.durationMinutes
          ) || 60;

        const nextDifficulty =
          setup.difficulty ||
          DifficultyLevel.MEDIUM;

        const nextRole =
          setup.role ||
          InterviewRole.INTERVIEWER;

        try {
          setRole(
            nextRole
          );

          setCandidateName(
            nextCandidate
          );

          setDurationMinutes(
            nextDuration
          );

          setDifficulty(
            nextDifficulty
          );

          setElapsedSeconds(0);

          const response =
            await interviewService.updateInterview(
              workspaceId,
              {
                durationMinutes:
                  nextDuration,

                difficulty:
                  nextDifficulty,

                candidate: {
                  name:
                    nextCandidate,

                  role:
                    InterviewRole.CANDIDATE,

                  status:
                    "online"
                },

                interviewer: {
                  role:
                    InterviewRole.INTERVIEWER
                }
              }
            );

          const startResponse =
            await interviewService.startInterview(
              workspaceId
            );

          const interview =
            startResponse ||
            response;

          setStatus(
            interview?.status ||
              InterviewStatus.ACTIVE
          );

          if (interview) {
            setElapsedSeconds(
              Number(
                interview.elapsedSeconds
              ) || 0
            );

            setDurationMinutes(
              Number(
                interview.durationMinutes
              ) || nextDuration
            );

            setDifficulty(
              interview.difficulty ||
                nextDifficulty
            );

            setCandidateName(
              interview
                .candidate?.name ||
                nextCandidate
            );

            if (
              interview.viewerRole ===
              InterviewRole.CANDIDATE
            ) {
              setRole(
                InterviewRole.CANDIDATE
              );
            } else {
              setRole(
                InterviewRole.INTERVIEWER
              );
            }

            if (
              Array.isArray(
                interview.questions
              )
            ) {
              const normalized =
                interview.questions.map(
                  normalizeQuestion
                );

              setQuestions(
                normalized
              );

              const index =
                Math.min(
                  Number(
                    interview.currentQuestionIndex
                  ) || 0,

                  Math.max(
                    normalized.length - 1,
                    0
                  )
                );

              setCurrentQuestionIndex(
                index
              );

              setLiveQuestion(
                interview.liveQuestion
                  ? normalizeQuestion(
                      interview.liveQuestion
                    )
                  : normalized[
                      index
                    ] || null
              );
            }

                        if (
              !notesDirtyRef.current
            ) {
              applyServerNotes(
                interview.notes || ""
              );
            }
          }

          startTimer();

          return interview;
        } catch (err) {
          console.error(
            "Failed to start interview:",
            err
          );

          setError(
            err.message ||
              "Failed to start interview"
          );

          return null;
        }
      },
      [
        workspaceId,
        startTimer,
        applyServerNotes
      ]
    );

  const pauseInterview =
    useCallback(
      async () => {
        stopTimer();

        const currentElapsed =
          elapsedRef.current;

        try {
          const interview =
            await interviewService.pauseInterview(
              workspaceId,
              currentElapsed
            );

          setStatus(
            interview?.status ||
              InterviewStatus.PAUSED
          );

          if (
            interview?.elapsedSeconds !==
            undefined
          ) {
            setElapsedSeconds(
              Number(
                interview.elapsedSeconds
              ) || currentElapsed
            );
          }

          return interview || null;
        } catch (err) {
          console.error(
            "Failed to pause interview:",
            err
          );

          setError(
            err.message ||
              "Failed to pause interview"
          );

          startTimer();

          return null;
        }
      },
      [
        workspaceId,
        stopTimer,
        startTimer
      ]
    );

  const resumeInterview =
    useCallback(
      async () => {
        try {
          const interview =
            await interviewService.resumeInterview(
              workspaceId
            );

          setStatus(
            interview?.status ||
              InterviewStatus.ACTIVE
          );

          if (
            interview?.elapsedSeconds !==
            undefined
          ) {
            setElapsedSeconds(
              Number(
                interview.elapsedSeconds
              ) ||
                elapsedRef.current
            );
          }

          startTimer();

          return interview || null;
        } catch (err) {
          console.error(
            "Failed to resume interview:",
            err
          );

          setError(
            err.message ||
              "Failed to resume interview"
          );

          return null;
        }
      },
      [
        workspaceId,
        startTimer
      ]
    );

  const endInterview =
    useCallback(
      async () => {
        stopTimer();

        const currentElapsed =
          elapsedRef.current;

        try {
          const interview =
            await interviewService.endInterview(
              workspaceId,
              currentElapsed
            );

          setStatus(
            interview?.status ||
              InterviewStatus.COMPLETED
          );

          if (
            interview?.elapsedSeconds !==
            undefined
          ) {
            setElapsedSeconds(
              Number(
                interview.elapsedSeconds
              ) || currentElapsed
            );
          }

          return interview || null;
        } catch (err) {
          console.error(
            "Failed to end interview:",
            err
          );

          setError(
            err.message ||
              "Failed to end interview"
          );

          startTimer();

          return null;
        }
      },
      [
        workspaceId,
        stopTimer,
        startTimer
      ]
    );

  const interviewerName =
    workspace?.owner?.name ||
    "Interviewer";

  const interviewer = {
    id: "interviewer",

    name:
      interviewerName,

    role:
      InterviewRole.INTERVIEWER,

    status: "online",

    avatar:
      initials(
        interviewerName
      )
  };

  const candidate = {
    id: "candidate",

    name:
      candidateName,

    role:
      InterviewRole.CANDIDATE,

    status: "online",

    avatar:
      initials(
        candidateName
      )
  };

  const currentQuestion =
    questions[
      currentQuestionIndex
    ] || null;

  const isInterviewer =
    role ===
    InterviewRole.INTERVIEWER;

  const isCandidate =
    role ===
    InterviewRole.CANDIDATE;

  return {
    loading,
    error,

    status,

    role,

    isInterviewer,
    isCandidate,

    interviewer,
    candidate,

    elapsedSeconds,

    durationMinutes,

    difficulty,

    questions,

    currentQuestion,

    currentQuestionIndex,

    liveQuestion,

    createInterviewQuestion,

    updateInterviewQuestion,

    rewriteInterviewQuestion,

    publishQuestion,

    nextQuestion,

    prevQuestion,

    selectQuestion,

    notes,

    setNotes,

    saveNotes,

    configureAndStart,

    pauseInterview,

    resumeInterview,

    endInterview,

    reloadInterview:
      loadInterview
  };
}

export default useInterview;