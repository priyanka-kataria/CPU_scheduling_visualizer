
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Algorithm, Process, AlgorithmResult, GanttSlice, ProcessMetrics } from './types';
import { solveScheduling } from './algorithms';

// Robust random vibrant color generator
const generateRandomColor = () => {
  const h = Math.floor(Math.random() * 360);
  const s = 70 + Math.floor(Math.random() * 25); // 70-95% saturation
  const l = 45 + Math.floor(Math.random() * 15); // 45-60% lightness
  return `hsl(${h}, ${s}%, ${l}%)`;
};

interface SelectedSliceInfo {
  slice: GanttSlice;
  algorithm: Algorithm;
  metrics: ProcessMetrics;
}

const App: React.FC = () => {
  // Processes with random colors
  const [processes, setProcesses] = useState<Process[]>([
    { id: 'P1', arrivalTime: 0, burstTime: 4, priority: 2, color: generateRandomColor() },
    { id: 'P2', arrivalTime: 1, burstTime: 2, priority: 1, color: generateRandomColor() },
    { id: 'P3', arrivalTime: 2, burstTime: 6, priority: 3, color: generateRandomColor() },
    { id: 'P4', arrivalTime: 4, burstTime: 3, priority: 4, color: generateRandomColor() },
  ]);
  
  const [timeQuantum, setTimeQuantum] = useState<number>(2);
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<Algorithm[]>(Object.values(Algorithm));
  const [monitorAlgo, setMonitorAlgo] = useState<Algorithm>(Algorithm.FCFS);
  const [selectedSlice, setSelectedSlice] = useState<SelectedSliceInfo | null>(null);
  
  // Simulation State
  const [simTime, setSimTime] = useState<number>(0);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    return selectedAlgorithms.map(algo => solveScheduling(algo, processes, timeQuantum));
  }, [processes, selectedAlgorithms, timeQuantum]);

  const maxTimeline = useMemo(() => {
    const endTimes = results.map(r => r.ganttChart.length > 0 ? r.ganttChart[r.ganttChart.length - 1].endTime : 0);
    return Math.max(...endTimes, 5);
  }, [results]);

  useEffect(() => {
    let interval: any;
    if (isSimulating) {
      interval = setInterval(() => {
        setSimTime(prev => {
          if (prev >= maxTimeline) {
            setIsSimulating(false);
            return maxTimeline;
          }
          return Math.round((prev + 0.1 * simSpeed) * 10) / 10;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isSimulating, maxTimeline, simSpeed]);

  const addProcess = () => {
    const nextIdNumber = processes.length > 0 ? Math.max(...processes.map(p => parseInt(p.id.replace('P', '')) || 0)) + 1 : 1;
    setProcesses(prev => [
      ...prev,
      { id: `P${nextIdNumber}`, arrivalTime: 0, burstTime: 1, priority: 1, color: generateRandomColor() }
    ]);
  };

  const updateProcess = (id: string, field: keyof Process, value: string) => {
    const num = value === "" ? 0 : parseFloat(value);
    setProcesses(prev => prev.map(p => p.id === id ? { ...p, [field]: num } : p));
  };

  const removeProcess = (id: string) => setProcesses(prev => prev.filter(p => p.id !== id));
  const clearAllProcesses = () => setProcesses([]);

  const toggleAlgorithm = (algo: Algorithm) => {
    setSelectedAlgorithms(prev => {
      const next = prev.includes(algo) ? prev.filter(a => a !== algo) : [...prev, algo];
      if (next.length > 0 && !next.includes(monitorAlgo)) setMonitorAlgo(next[0]);
      return next;
    });
  };

  const handleSliceClick = (result: AlgorithmResult, slice: GanttSlice) => {
    if (slice.processId === "IDLE") return;
    const metrics = result.processes.find(p => p.id === slice.processId);
    if (metrics) {
      setSelectedSlice({ slice, algorithm: result.algorithm, metrics });
    }
  };

  const startSimulation = () => {
    setSimTime(0);
    setIsSimulating(true);
  };

  const getReadyQueueAtTime = (result: AlgorithmResult, time: number) => {
    const currentSlice = result.ganttChart.find(s => time >= s.startTime && time < s.endTime);
    
    // Waiting processes logic
    const waiting = result.processes.filter(p => {
      const arrived = p.arrivalTime <= time;
      const notFinished = p.completionTime > time;
      const notRunning = currentSlice?.processId !== p.id;
      return arrived && notFinished && notRunning;
    });

    // Sort queue based on specific algorithm logic for visualization
    if (result.algorithm === Algorithm.SJF || result.algorithm === Algorithm.SRTF) {
        waiting.sort((a, b) => a.burstTime - b.burstTime);
    } else if (result.algorithm === Algorithm.PRIORITY || result.algorithm === Algorithm.PRIORITY_PREEMPTIVE) {
        waiting.sort((a, b) => a.priority - b.priority);
    }

    return { running: currentSlice?.processId || "IDLE", waiting };
  };

  // Helper to format algorithm names for UI buttons
  const getAlgoDisplayName = (algo: Algorithm) => {
    if (algo === Algorithm.PRIORITY) return 'Priority (Non-P)';
    if (algo === Algorithm.PRIORITY_PREEMPTIVE) return 'Priority (Pre)';
    if (algo === Algorithm.SRTF) return 'SRTF / SRJF';
    return algo.split('(')[0].trim();
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-20 font-sans selection:bg-indigo-100">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 px-6 h-16 flex items-center justify-between shadow-sm backdrop-blur-md bg-white/90">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-xl font-black tracking-tight text-slate-800">
            CPU<span className="text-indigo-600">Scheduler</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 items-center">
             <button 
                onClick={() => { setSimTime(0); setIsSimulating(false); }} 
                className="p-2 hover:bg-white rounded-lg transition text-slate-500 hover:text-indigo-600"
                title="Reset Simulation"
             >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
             </button>
             <button 
                onClick={startSimulation} 
                className="ml-1 px-5 py-2 bg-indigo-600 text-white rounded-lg font-black text-[10px] flex items-center gap-2 hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 uppercase tracking-widest"
             >
               {isSimulating ? "Restarting..." : "Simulate All"}
             </button>
           </div>
           <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200">
             <span className="text-[10px] font-black text-slate-400 uppercase">Speed</span>
             <select value={simSpeed} onChange={(e) => setSimSpeed(Number(e.target.value))} className="text-xs font-bold outline-none bg-transparent cursor-pointer">
                <option value={0.5}>0.5x</option>
                <option value={1}>1.0x</option>
                <option value={2}>2.0x</option>
                <option value={5}>5.0x</option>
             </select>
           </div>
        </div>
      </nav>

      {/* Global Timeline Progress */}
      <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center gap-8 shadow-sm">
        <div className="flex flex-col min-w-[100px]">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Clock</span>
            <span className="text-2xl font-black text-indigo-600 tabular-nums">{simTime.toFixed(1)}s</span>
        </div>
        <div className="flex-grow relative h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner group">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-indigo-500 transition-all duration-100 ease-linear shadow-[0_0_20px_rgba(99,102,241,0.6)]" 
              style={{ width: `${(simTime / maxTimeline) * 100}%` }} 
            />
            <input 
              type="range" min="0" max={maxTimeline} step="0.1" 
              value={simTime} onChange={(e) => setSimTime(parseFloat(e.target.value))} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
        </div>
        <div className="text-right min-w-[100px]">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Time</span>
            <p className="text-lg font-black text-slate-800 tabular-nums">{maxTimeline.toFixed(1)}s</p>
        </div>
      </div>

      <main className="max-w-screen-2xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input & Config */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Comparison Suite Selector */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <h2 className="font-black text-[11px] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Algorithms to Compare
            </h2>
            <div className="grid grid-cols-2 gap-2">
                {Object.values(Algorithm).map(algo => (
                    <button
                        key={algo}
                        onClick={() => toggleAlgorithm(algo)}
                        className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border text-left flex items-center justify-between ${
                            selectedAlgorithms.includes(algo)
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        <span className="truncate mr-1">{getAlgoDisplayName(algo)}</span>
                        {selectedAlgorithms.includes(algo) && <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </button>
                ))}
            </div>
            {selectedAlgorithms.includes(Algorithm.RR) && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Time Quantum (RR)</label>
                    <input type="number" step="1" min="1" className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500" value={timeQuantum} onChange={(e) => setTimeQuantum(parseFloat(e.target.value) || 1)} />
                </div>
            )}
          </div>

          {/* Process Entry List */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-black text-[11px] text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                 Process Queue
              </h2>
              <div className="flex gap-2">
                <button onClick={clearAllProcesses} className="text-[9px] font-black px-3 py-1.5 text-slate-400 hover:text-red-500 transition uppercase tracking-widest">
                  Clear
                </button>
                <button onClick={addProcess} className="text-[9px] font-black px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition uppercase tracking-widest shadow-md shadow-indigo-100">
                  + Add Job
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {processes.map((p) => {
                const isRunning = results.some(r => getReadyQueueAtTime(r, simTime).running === p.id);
                return (
                  <div key={p.id} className={`p-4 bg-slate-50 border rounded-2xl transition-all relative group ${isRunning ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/30' : 'border-slate-200 hover:bg-white'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                         <div className="w-4 h-4 rounded-lg shadow-inner flex-shrink-0" style={{ backgroundColor: p.color }}></div>
                         <span className="text-sm font-black text-slate-800">{p.id}</span>
                         {isRunning && <span className="text-[8px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full animate-pulse uppercase tracking-tighter">Running</span>}
                      </div>
                      <button onClick={() => removeProcess(p.id)} className="text-slate-300 hover:text-red-500 p-1 transition opacity-0 group-hover:opacity-100">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Arrival</label>
                        <input type="number" step="1" className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none" value={p.arrivalTime} onChange={(e) => updateProcess(p.id, 'arrivalTime', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Burst</label>
                        <input type="number" step="1" min="1" className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none" value={p.burstTime} onChange={(e) => updateProcess(p.id, 'burstTime', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Priority</label>
                        <input type="number" step="1" className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none" value={p.priority} onChange={(e) => updateProcess(p.id, 'priority', e.target.value)} />
                      </div>
                    </div>
                  </div>
                );
              })}
              {processes.length === 0 && (
                <div className="text-center py-10 text-slate-300 italic text-sm">
                  Queue is empty. Add processes to start.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dashboards & Charts */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Gantt Charts View */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping"></div>
                  Execution Timelines
              </h2>
              <div className="text-[10px] font-black text-slate-400 uppercase">
                {selectedAlgorithms.length} Algos Active
              </div>
            </div>
            
            <div className="space-y-6">
                {results.map((result) => (
                    <div key={result.algorithm} className="space-y-3 group/chart">
                      <div className="flex justify-between items-center px-1">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">{getAlgoDisplayName(result.algorithm)}</span>
                            {result.algorithm.includes('Preemptive') && <span className="bg-indigo-50 text-indigo-600 text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase">P</span>}
                        </div>
                        <div className="flex gap-4 text-[9px] font-bold text-slate-400 group-hover/chart:text-indigo-400 transition-colors">
                          <span>UTIL: {result.cpuUtilization}%</span>
                          <span>SWITCHES: {result.contextSwitches}</span>
                        </div>
                      </div>

                      <div className="relative h-14 w-full bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 flex shadow-inner transition-all duration-300">
                        {result.ganttChart.map((slice, i) => {
                          const totalWidth = ((slice.endTime - slice.startTime) / maxTimeline) * 100;
                          const isIdle = slice.processId === "IDLE";
                          const hasStarted = slice.startTime <= simTime;
                          const hasFinished = slice.endTime <= simTime;
                          let progressInBlock = 0;
                          if (hasStarted) {
                              const elapsedInBlock = Math.min(slice.endTime - slice.startTime, simTime - slice.startTime);
                              progressInBlock = (elapsedInBlock / (slice.endTime - slice.startTime)) * 100;
                          }

                          return (
                            <div 
                              key={i} 
                              onClick={() => handleSliceClick(result, slice)} 
                              className={`h-full relative flex items-center justify-center text-white text-[11px] font-black transition-all duration-300 ${!isIdle ? 'cursor-pointer hover:brightness-110 active:scale-95' : 'bg-stripes bg-slate-100 text-slate-300'}`}
                              style={{ 
                                width: `${totalWidth}%`, 
                                backgroundColor: isIdle ? undefined : slice.color, 
                                opacity: hasStarted ? 1 : 0.1,
                                borderRight: totalWidth > 0.5 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                              }}
                            >
                              {/* Labels always show if slice width is reasonable. Increased visibility for preemptive slices. */}
                              {hasStarted && !isIdle && totalWidth > 0.8 && (
                                <span className="z-10 drop-shadow-md select-none truncate px-1 font-bold text-shadow-sm">
                                  {slice.processId}
                                </span>
                              )}
                              
                              {/* Progress bar within the slice during simulation */}
                              {hasStarted && !hasFinished && !isIdle && (
                                <div className="absolute inset-0 bg-white/30 z-0 animate-pulse" style={{ width: `${progressInBlock}%` }}></div>
                              )}

                              {/* Tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white px-2 py-1 rounded text-[9px] opacity-0 pointer-events-none transition-opacity group-hover:opacity-100 whitespace-nowrap z-50 shadow-xl font-bold">
                                {slice.processId}: {slice.startTime.toFixed(1)}s - {slice.endTime.toFixed(1)}s
                              </div>
                            </div>
                          );
                        })}
                        {/* Playhead */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.8)]" style={{ left: `${(simTime / maxTimeline) * 100}%` }} />
                      </div>
                    </div>
                ))}
            </div>
            
            <div className="flex justify-between items-center text-[9px] font-black text-slate-300 uppercase tracking-tighter pt-4 border-t border-slate-50">
               <span>Start (0s)</span>
               <div className="h-px bg-slate-100 flex-grow mx-8"></div>
               <span>{maxTimeline.toFixed(1)}s</span>
            </div>
          </div>

          {/* Performance Summary Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {results.map((res) => (
              <div key={res.algorithm} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-500 hover:shadow-md hover:-translate-y-0.5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                    <span className="text-[11px] font-black uppercase text-slate-800 tracking-widest truncate max-w-[150px]">{getAlgoDisplayName(res.algorithm)}</span>
                  </div>
                </div>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center items-center text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Avg Waiting</p>
                        <p className="text-xl font-black text-slate-800">{res.avgWaitingTime}s</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center items-center text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Avg TAT</p>
                        <p className="text-xl font-black text-slate-800">{res.avgTurnaroundTime}s</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase">CPU Utilization</span>
                      <span className="text-[11px] font-black text-emerald-600">{res.cpuUtilization}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className="h-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${res.cpuUtilization}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Detail Analysis Modal */}
      {selectedSlice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-lg w-full p-10 relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-3" style={{ backgroundColor: selectedSlice.slice.color }}></div>
            <button onClick={() => setSelectedSlice(null)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-600 p-2 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="mb-8">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">{selectedSlice.algorithm}</span>
              <h3 className="text-4xl font-black text-slate-900 mt-2">Analysis of {selectedSlice.slice.processId}</h3>
              <p className="text-sm font-bold text-slate-500 mt-2">Time Segment: {selectedSlice.slice.startTime.toFixed(1)}s — {selectedSlice.slice.endTime.toFixed(1)}s</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { label: 'Waiting Time', val: selectedSlice.metrics.waitingTime, color: 'text-emerald-600' },
                { label: 'Turnaround', val: selectedSlice.metrics.turnaroundTime, color: 'text-indigo-600' },
                { label: 'Response', val: selectedSlice.metrics.responseTime, color: 'text-orange-600' },
                { label: 'Completion', val: selectedSlice.metrics.completionTime, color: 'text-slate-800' }
              ].map((item, idx) => (
                <div key={idx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center justify-center shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{item.label}</p>
                  <p className={`text-2xl font-black ${item.color}`}>{item.val}s</p>
                </div>
              ))}
            </div>

            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 mb-8">
               <p className="text-[11px] font-black text-indigo-400 uppercase mb-2">Algorithm Logic</p>
               <p className="text-xs text-indigo-900 font-medium leading-relaxed">
                 Under {getAlgoDisplayName(selectedSlice.algorithm)}, this process was selected because it was the 
                 {selectedSlice.algorithm.includes('Shortest') ? ' shortest available job ' : ' next in the arrival sequence '} 
                 at time T={selectedSlice.slice.startTime.toFixed(1)}.
               </p>
            </div>

            <button onClick={() => setSelectedSlice(null)} className="w-full py-5 bg-slate-900 text-white rounded-[20px] font-black text-sm uppercase tracking-widest hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-slate-200">Dismiss Analysis</button>
          </div>
        </div>
      )}

      {/* Global CSS for idle pattern and custom scrollbars */}
      <style>{`
        .bg-stripes {
          background-image: linear-gradient(45deg, #f1f5f9 25%, transparent 25%, transparent 50%, #f1f5f9 50%, #f1f5f9 75%, transparent 75%, transparent);
          background-size: 16px 16px;
        }
        .text-shadow-sm {
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `}</style>
    </div>
  );
};

export default App;
