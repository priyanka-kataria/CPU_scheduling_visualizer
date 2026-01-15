
export enum Algorithm {
  FCFS = 'First Come First Serve (FCFS)',
  SJF = 'Shortest Job First (SJF)',
  SRTF = 'Shortest Remaining Time First (SRTF/SRJF)',
  PRIORITY = 'Priority (Non-Preemptive)',
  PRIORITY_PREEMPTIVE = 'Priority (Preemptive)',
  RR = 'Round Robin (RR)',
}

export interface Process {
  id: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  color: string;
}

export interface GanttSlice {
  processId: string;
  startTime: number;
  endTime: number;
  color: string;
}

export interface ProcessMetrics extends Process {
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
  responseTime: number;
}

export interface AlgorithmResult {
  algorithm: Algorithm;
  ganttChart: GanttSlice[];
  processes: ProcessMetrics[];
  avgWaitingTime: number;
  avgTurnaroundTime: number;
  cpuUtilization: number;
  throughput: number;
  contextSwitches: number;
}
