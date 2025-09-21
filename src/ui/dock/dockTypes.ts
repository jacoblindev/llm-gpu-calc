export type ControlDockTab = 'gpus' | 'models' | 'workload'

export interface ControlDockTabConfig {
  id: ControlDockTab
  label: string
  shortLabel: string
  description: string
}

export const CONTROL_DOCK_TABS: ReadonlyArray<ControlDockTabConfig> = [
  {
    id: 'gpus',
    label: 'GPUs',
    shortLabel: 'GPUs',
    description: 'Select GPU types and counts',
  },
  {
    id: 'models',
    label: 'Deployments / Models',
    shortLabel: 'Models',
    description: 'Manage deployments and utilization',
  },
  {
    id: 'workload',
    label: 'Workload',
    shortLabel: 'Workload',
    description: 'Assign GPUs, set dtypes, adjust limits',
  },
]
