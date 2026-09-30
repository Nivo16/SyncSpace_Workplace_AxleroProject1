import { useEffect, useState } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { auditApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function AuditLogsPage() {
  const { role } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auditApi.list(500).then((data) => setLogs(data.logs || [])).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout title="Audit Logs">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-slate-500">{role === 'admin' ? 'System-wide activity and security trail.' : 'Your workspace and interview activity trail.'}</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b border-slate-800">
                <th className="px-5 py-3">Time</th><th className="px-5 py-3">Actor</th><th className="px-5 py-3">Role</th><th className="px-5 py-3">Action</th><th className="px-5 py-3">Entity</th>
              </tr></thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id} className="border-b border-slate-900">
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-200">{log.actor?.name || log.actorName || 'System'}</td>
                    <td className="px-5 py-3 text-slate-400">{log.actor?.role || log.actorRole || '—'}</td>
                    <td className="px-5 py-3 text-cyan-300 font-mono text-xs">{log.action}</td>
                    <td className="px-5 py-3 text-slate-500">{log.entityType || '—'} {log.entityId ? `#${String(log.entityId).slice(-8)}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!logs.length && <div className="p-10 text-center text-sm text-slate-600">No audit events yet.</div>}
        </div>
      )}
    </DashboardLayout>
  );
}
