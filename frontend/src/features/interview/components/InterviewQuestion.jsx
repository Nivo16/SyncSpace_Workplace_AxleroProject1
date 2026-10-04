import { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Plus,
  Pencil,
  Send,
  X,
} from 'lucide-react';

const difficultyClass = {
  Easy: 'interview-diff-easy',
  Medium: 'interview-diff-medium',
  Hard: 'interview-diff-hard',
};

const emptyDraft = {
  title: '',
  description: '',
  difficulty: 'Medium',
  category: 'Algorithms',
  starterCode: '',
};

export function InterviewQuestion({
  question,
  questionIndex = 0,
  total = 0,
  onPrev,
  onNext,
  isInterviewer = false,
  onPublishQuestion,
}) {
  const [editing, setEditing] = useState(false);

  const [draft, setDraft] = useState(emptyDraft);

  useEffect(() => {
    if (!question) return;

    setDraft({
      title: question.title || '',
      description: question.description || '',
      difficulty: question.difficulty || 'Medium',
      category: question.category || 'Algorithms',
      starterCode: question.starterCode || '',
    });
  }, [question]);

  const updateDraft = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleEdit = () => {
    if (!question) {
      setDraft(emptyDraft);
    }

    setEditing(true);
  };

  const handleCancel = () => {
    if (question) {
      setDraft({
        title: question.title || '',
        description: question.description || '',
        difficulty: question.difficulty || 'Medium',
        category: question.category || 'Algorithms',
        starterCode: question.starterCode || '',
      });
    } else {
      setDraft(emptyDraft);
    }

    setEditing(false);
  };

  const handlePublish = () => {
    if (!draft.title.trim() || !draft.description.trim()) {
      return;
    }

    onPublishQuestion?.({
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      starterCode: draft.starterCode || '',
      isCustom: true,
      updatedAt: new Date().toISOString(),
    });

    setEditing(false);
  };

  if (editing) {
    return (
      <div className="interview-panel-card interview-question-card">
        <div className="interview-panel-heading">
          <Pencil className="w-4 h-4 text-cyan-400" />

          <h3>
            {question ? 'Edit Interview Question' : 'Create Interview Question'}
          </h3>

          <button
            type="button"
            onClick={handleCancel}
            className="ml-auto"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 mt-4">
          <div>
            <label className="block text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-1.5">
              Question
            </label>

            <input
              type="text"
              value={draft.title}
              onChange={(e) => updateDraft('title', e.target.value)}
              placeholder="e.g. Design a real-time chat system"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-1.5">
              Description
            </label>

            <textarea
              value={draft.description}
              onChange={(e) =>
                updateDraft('description', e.target.value)
              }
              placeholder="Write the problem statement or interview prompt..."
              rows={6}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-1.5">
                Difficulty
              </label>

              <select
                value={draft.difficulty}
                onChange={(e) =>
                  updateDraft('difficulty', e.target.value)
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-1.5">
                Category
              </label>

              <select
                value={draft.category}
                onChange={(e) =>
                  updateDraft('category', e.target.value)
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                <option value="Algorithms">Algorithms</option>
                <option value="Data Structures">Data Structures</option>
                <option value="JavaScript">JavaScript</option>
                <option value="React">React</option>
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Database">Database</option>
                <option value="System Design">System Design</option>
                <option value="Programming Fundamentals">
                  Programming Fundamentals
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-1.5">
              Starter Code
            </label>

            <textarea
              value={draft.starterCode}
              onChange={(e) =>
                updateDraft('starterCode', e.target.value)
              }
              placeholder="// Optional starter code..."
              rows={5}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={
                !draft.title.trim() ||
                !draft.description.trim()
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
              Publish Question
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="interview-panel-card interview-question-card">
        <div className="interview-panel-heading">
          <ListChecks className="w-4 h-4 text-cyan-400" />
          <h3>Interview Question</h3>
        </div>

        <div className="py-6 text-center">
          <p className="text-sm text-slate-400 mb-4">
            No question has been published yet.
          </p>

          {isInterviewer && (
            <button
              type="button"
              onClick={handleEdit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Create Question
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="interview-panel-card interview-question-card">
      <div className="interview-panel-heading">
        <ListChecks className="w-4 h-4 text-cyan-400" />

        <h3>Interview Question</h3>

        <span className="interview-question-count">
          {questionIndex + 1} / {total}
        </span>
      </div>

      <div className="interview-question-meta">
        <span
          className={`interview-diff ${
            difficultyClass[question.difficulty] || ''
          }`}
        >
          {question.difficulty}
        </span>

        <span className="interview-category">
          {question.category}
        </span>

        {question.isCustom && (
          <span className="text-xs text-cyan-400">
            Live
          </span>
        )}
      </div>

      <h4 className="interview-question-title">
        {question.title}
      </h4>

      <p className="interview-question-body whitespace-pre-wrap">
        {question.description}
      </p>

      {isInterviewer && (
        <div className="flex items-center gap-2 mt-4">
          <button
            type="button"
            onClick={handleEdit}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit / Rewrite
          </button>

          <button
            type="button"
            onClick={() => {
              setDraft(emptyDraft);
              setEditing(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-500/40 text-xs text-cyan-300 hover:bg-cyan-950/40"
          >
            <Plus className="w-3.5 h-3.5" />
            New Question
          </button>
        </div>
      )}

      <div className="interview-question-nav">
        <button
          type="button"
          onClick={onPrev}
          disabled={questionIndex === 0}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={questionIndex >= total - 1}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default InterviewQuestion;