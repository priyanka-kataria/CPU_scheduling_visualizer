
import { Algorithm, Process, ProcessMetrics, GanttSlice, AlgorithmResult } from './types';

const CONTEXT_SWITCH_TIME = 0.1;

export const solveScheduling = (
  algorithm: Algorithm,
  processes: Process[],
  timeQuantum: number = 2
): AlgorithmResult => {
  if (processes.length === 0) {
    return {
      algorithm, ganttChart: [], processes: [], avgWaitingTime: 0, avgTurnaroundTime: 0,
      cpuUtilization: 0, throughput: 0, contextSwitches: 0
    };
  }

  const sortedProcesses = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime);
  const ganttChart: GanttSlice[] = [];
  const metrics: ProcessMetrics[] = [];
  
  let currentTime = 0;
  let completed = 0;
  const n = sortedProcesses.length;
  
  const remainingBurstTime = new Map<string, number>();
  const firstStartTime = new Map<string, number>();
  const completionTimeMap = new Map<string, number>();
  
  processes.forEach(p => remainingBurstTime.set(p.id, p.burstTime));

  /**
   * Adds a slice to the Gantt chart, automatically merging with the previous 
   * slice if it belongs to the same process.
   */
  const addToGantt = (pid: string, start: number, end: number, color: string) => {
    if (start >= end) return;
    const last = ganttChart[ganttChart.length - 1];
    if (last && last.processId === pid) {
      last.endTime = end;
    } else {
      ganttChart.push({ processId: pid, startTime: start, endTime: end, color });
    }
  };

  let contextSwitches = 0;
  let lastPid = "";

  const handleIdle = (targetTime: number) => {
    if (currentTime < targetTime) {
      addToGantt("IDLE", currentTime, targetTime, "#f1f5f9");
      currentTime = targetTime;
      lastPid = ""; 
    }
  };

  const applyContextSwitch = (newPid: string) => {
    if (lastPid !== "" && lastPid !== newPid && newPid !== "IDLE") {
      contextSwitches++;
      currentTime += CONTEXT_SWITCH_TIME;
    }
    lastPid = newPid;
  };

  if (algorithm === Algorithm.FCFS) {
    sortedProcesses.forEach(p => {
      handleIdle(p.arrivalTime);
      applyContextSwitch(p.id);
      if (!firstStartTime.has(p.id)) firstStartTime.set(p.id, currentTime);
      const start = currentTime;
      currentTime += p.burstTime;
      completionTimeMap.set(p.id, currentTime);
      addToGantt(p.id, start, currentTime, p.color);
    });
  } else if (algorithm === Algorithm.SJF || algorithm === Algorithm.PRIORITY) {
    const isCompleted = new Set<string>();
    while (completed < n) {
      const available = sortedProcesses.filter(p => p.arrivalTime <= currentTime && !isCompleted.has(p.id));
      if (available.length === 0) {
        const nextArrival = Math.min(...sortedProcesses.filter(p => !isCompleted.has(p.id)).map(p => p.arrivalTime));
        handleIdle(nextArrival);
        continue;
      }
      
      const next = available.reduce((prev, curr) => {
        if (algorithm === Algorithm.SJF) {
          if (curr.burstTime === prev.burstTime) return curr.arrivalTime < prev.arrivalTime ? curr : prev;
          return curr.burstTime < prev.burstTime ? curr : prev;
        } else {
          if (curr.priority === prev.priority) return curr.arrivalTime < prev.arrivalTime ? curr : prev;
          return curr.priority < prev.priority ? curr : prev;
        }
      });

      applyContextSwitch(next.id);
      if (!firstStartTime.has(next.id)) firstStartTime.set(next.id, currentTime);
      const start = currentTime;
      currentTime += next.burstTime;
      completionTimeMap.set(next.id, currentTime);
      isCompleted.add(next.id);
      completed++;
      addToGantt(next.id, start, currentTime, next.color);
    }
  } else if (algorithm === Algorithm.SRTF || algorithm === Algorithm.PRIORITY_PREEMPTIVE) {
    while (completed < n) {
      const available = sortedProcesses.filter(p => p.arrivalTime <= currentTime && remainingBurstTime.get(p.id)! > 0);
      if (available.length === 0) {
        const nextArrival = Math.min(...sortedProcesses.filter(p => remainingBurstTime.get(p.id)! > 0).map(p => p.arrivalTime));
        handleIdle(nextArrival);
        continue;
      }
      
      const next = available.reduce((prev, curr) => {
        if (algorithm === Algorithm.SRTF) {
          const r1 = remainingBurstTime.get(curr.id)!;
          const r2 = remainingBurstTime.get(prev.id)!;
          if (r1 === r2) return curr.arrivalTime < prev.arrivalTime ? curr : prev;
          return r1 < r2 ? curr : prev;
        } else {
          if (curr.priority === prev.priority) return curr.arrivalTime < prev.arrivalTime ? curr : prev;
          return curr.priority < prev.priority ? curr : prev;
        }
      });

      applyContextSwitch(next.id);
      if (!firstStartTime.has(next.id)) firstStartTime.set(next.id, currentTime);
      const start = currentTime;
      remainingBurstTime.set(next.id, Number((remainingBurstTime.get(next.id)! - 0.1).toFixed(1)));
      currentTime = Number((currentTime + 0.1).toFixed(1));
      addToGantt(next.id, start, currentTime, next.color);
      
      if (remainingBurstTime.get(next.id) === 0) {
        completionTimeMap.set(next.id, currentTime);
        completed++;
      }
    }
  } else if (algorithm === Algorithm.RR) {
    const queue: string[] = [];
    const inQueue = new Set<string>();
    let idx = 0;
    
    const checkArrivals = () => {
      while (idx < n && sortedProcesses[idx].arrivalTime <= currentTime) {
        if (!inQueue.has(sortedProcesses[idx].id) && remainingBurstTime.get(sortedProcesses[idx].id)! > 0) {
          queue.push(sortedProcesses[idx].id);
          inQueue.add(sortedProcesses[idx].id);
        }
        idx++;
      }
    };

    if (currentTime < sortedProcesses[0].arrivalTime) handleIdle(sortedProcesses[0].arrivalTime);
    checkArrivals();

    while (completed < n) {
      if (queue.length === 0) {
        const nextProcess = sortedProcesses.find(p => remainingBurstTime.get(p.id)! > 0);
        if (nextProcess) {
          handleIdle(nextProcess.arrivalTime);
          checkArrivals();
        } else break;
      }

      const pid = queue.shift()!;
      inQueue.delete(pid);
      const process = processes.find(p => p.id === pid)!;
      applyContextSwitch(pid);

      if (!firstStartTime.has(pid)) firstStartTime.set(pid, currentTime);
      const start = currentTime;
      const rem = remainingBurstTime.get(pid)!;
      const take = Math.min(rem, timeQuantum);
      
      remainingBurstTime.set(pid, Number((rem - take).toFixed(1)));
      currentTime = Number((currentTime + take).toFixed(1));
      addToGantt(pid, start, currentTime, process.color);

      checkArrivals();
      if (remainingBurstTime.get(pid)! > 0) {
        queue.push(pid);
        inQueue.add(pid);
      } else {
        completionTimeMap.set(pid, currentTime);
        completed++;
      }
    }
  }

  processes.forEach(p => {
    const ct = completionTimeMap.get(p.id) || 0;
    const tat = ct - p.arrivalTime;
    const wt = tat - p.burstTime;
    const rt = (firstStartTime.get(p.id) ?? p.arrivalTime) - p.arrivalTime;
    metrics.push({ 
      ...p, 
      completionTime: Number(ct.toFixed(1)), 
      turnaroundTime: Number(Math.max(0, tat).toFixed(1)), 
      waitingTime: Number(Math.max(0, wt).toFixed(1)), 
      responseTime: Number(Math.max(0, rt).toFixed(1)) 
    });
  });

  const totalTime = currentTime;
  const totalBurst = processes.reduce((sum, p) => sum + p.burstTime, 0);
  const avgWT = metrics.reduce((sum, p) => sum + p.waitingTime, 0) / n;
  const avgTAT = metrics.reduce((sum, p) => sum + p.turnaroundTime, 0) / n;
  const cpuUtilization = totalTime > 0 ? (totalBurst / totalTime) * 100 : 0;

  return {
    algorithm, ganttChart, processes: metrics, 
    avgWaitingTime: Number(avgWT.toFixed(2)), avgTurnaroundTime: Number(avgTAT.toFixed(2)),
    cpuUtilization: Number(cpuUtilization.toFixed(2)), throughput: Number((n / totalTime).toFixed(3)),
    contextSwitches
  };
};
