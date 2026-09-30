import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { workspaceApi } from '../api/client';
import { useToast } from '../context/ToastContext';

export default function JoinWorkspacePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      setError('This workspace link does not contain a valid invite code.');
      return;
    }
    workspaceApi.join(code)
      .then(({ workspace }) => {
        showToast(`Joined ${workspace.name}`, 'success');
        navigate(`/workspaces/${workspace.id}`, { replace: true });
      })
      .catch((err) => setError(err.message || 'Could not join workspace.'));
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900/70 border border-slate-800 rounded-2xl p-8 text-center">
        {error ? (
          <>
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto mb-3" />
            <h1 className="font-semibold mb-2">Unable to join workspace</h1>
            <p className="text-sm text-slate-400">{error}</p>
          </>
        ) : (
          <>
            <Loader2 className="w-8 h-8 text-cyan-400 mx-auto mb-3 animate-spin" />
            <h1 className="font-semibold">Joining workspace…</h1>
            <p className="text-sm text-slate-500 mt-2">Checking the invite and opening the room.</p>
          </>
        )}
      </div>
    </div>
  );
}
