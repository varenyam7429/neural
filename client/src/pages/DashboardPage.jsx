import { useMemo } from 'react';
import { Target, TrendingUp, History, Copy } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip } from 'recharts';
import MetricCard from '../components/MetricCard.jsx';

export default function DashboardPage({ session, summary, history, onRestart, onSelectHistory }) {
  if (!session && !summary && history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-cyan-500/10 rounded-full flex items-center justify-center mb-6 border border-cyan-500/20">
          <Target size={32} className="text-cyan-400" />
        </div>
        <h2 className="text-2xl mb-2 text-white">No interviews yet</h2>
        <p className="muted mb-8">Start your first simulation to generate your AI hiring package and analytics.</p>
        <button className="glow-btn px-8" onClick={onRestart}>Start Interview Setup</button>
      </div>
    );
  }

  const radarData = useMemo(() => {
    if (!summary?.averageMetrics) return [];
    return [
      { subject: 'Overall', A: summary.averageMetrics.overall * 10, fullMark: 100 },
      { subject: 'Relevance', A: summary.averageMetrics.relevance * 10, fullMark: 100 },
      { subject: 'Structure', A: summary.averageMetrics.structure * 10, fullMark: 100 },
      { subject: 'Specificity', A: summary.averageMetrics.specificity * 10, fullMark: 100 },
      { subject: 'Confidence', A: summary.averageMetrics.confidence * 10, fullMark: 100 }
    ];
  }, [summary]);

  const lineData = useMemo(() => {
    if (!session?.transcript) return [];
    return session.transcript.map((t, i) => ({
      name: `Q${i+1}`,
      score: (t.analysis?.metrics?.overall || 0) * 10,
      pressure: t.pressureScoreBefore || 50
    }));
  }, [session]);

  const copyToClipboard = () => {
    if (!summary) return;
    const txt = `Hire Recommendation: ${summary.recommendation}\nScore: ${summary.averageMetrics?.overall}/10\nStrengths: ${summary.strengths?.join(', ')}`;
    navigator.clipboard.writeText(txt);
    alert('Copied to clipboard!');
  };

  return (
    <div className="max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white">Interview Dashboard</h1>
          <p className="muted">Analytics and hiring recommendations based on AI evaluation.</p>
        </div>
        <button className="glow-btn" onClick={onRestart}>New Simulation</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2 flex flex-col gap-6">
          <section className="panel min-h-[300px]">
            <div className="panel-header">
              <h3 className="flex items-center gap-2"><TrendingUp size={18} className="text-purple-400" /> Performance Timeline</h3>
            </div>
            {lineData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
                    <XAxis dataKey="name" stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#cbd5e1" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="score" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', stroke: '#22d3ee', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="pressure" stroke="#f43f5e" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500">Not enough data points yet.</div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3 className="text-emerald-400">Hiring Packet</h3>
              <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition" onClick={copyToClipboard}>
                <Copy size={16} className="text-slate-300" />
              </button>
            </div>
            {summary ? (
              <div className="space-y-6">
                <div>
                  <div className="eyebrow text-slate-400">Final Verdict</div>
                  <p className="text-lg font-medium text-white">{summary.recommendation}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-emerald-400 text-sm mb-2 uppercase tracking-wide">Strengths</h4>
                    <ul className="stack-list text-sm">{(summary.strengths||[]).map(s => <li key={s}>{s}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="text-rose-400 text-sm mb-2 uppercase tracking-wide">Red Flags</h4>
                    <ul className="stack-list text-sm">{(summary.weaknesses||[]).map(w => <li key={w}>{w}</li>)}</ul>
                  </div>
                  <div>
                     <h4 className="text-amber-400 text-sm mb-2 uppercase tracking-wide">Missing Traits</h4>
                     <ul className="stack-list text-sm">{(summary.missingThemes||[]).map(m => <li key={m}>{m}</li>)}</ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500">A session summary will appear here when an interview concludes.</div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section className="panel">
            <div className="panel-header">
              <h3 className="flex items-center gap-2"><Target size={18} className="text-cyan-400" /> Trait Radar</h3>
            </div>
            {radarData.length > 0 ? (
              <div className="h-56 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Radar name="Candidate" dataKey="A" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-56 flex items-center justify-center text-slate-500">Not enough data points yet.</div>
            )}
            {summary && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                 <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                    <div className="text-2xl font-black text-cyan-300 mb-1">{summary.averageMetrics?.overall}/10</div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">Total Score</div>
                 </div>
                 <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center">
                    <div className="text-2xl font-black text-white mb-1">{summary.averageMetrics?.structure}/10</div>
                    <div className="text-[10px] uppercase tracking-wide text-slate-400">Structure</div>
                 </div>
              </div>
            )}
          </section>

          <section className="panel flex-1">
            <div className="panel-header border-none pb-0">
               <h3 className="flex items-center gap-2"><History size={18} className="text-slate-400" /> Past Submissions</h3>
            </div>
            <div className="mt-4 space-y-3">
               {history.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No history yet.</p>
               ) : history.slice(0, 3).map((item, i) => (
                  <div key={i} onClick={() => onSelectHistory?.(item)} className="p-3 bg-black/40 border border-white/5 rounded-xl cursor-pointer hover:bg-white/5 transition flex items-center justify-between">
                     <div>
                        <div className="font-medium text-sm text-white capitalize">{item.role.replace('-', ' ')}</div>
                        <div className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</div>
                     </div>
                     <div className="font-black text-cyan-300">
                        {item.summary?.averageMetrics?.overall}/10
                     </div>
                  </div>
               ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
