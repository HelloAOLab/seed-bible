export const SelectionStates = {
  Idle: "Idle",
  Selecting: "Selecting",
  Selected: "Selected",
  Deselecting: "Deselecting",
} as const;

export type SelectionState =
  (typeof SelectionStates)[keyof typeof SelectionStates];

export const SelectionEvents = {
  RequestSelect: "RequestSelect",
  RequestDeselect: "RequestDeselect",
  SequenceComplete: "SequenceComplete",
} as const;

export type SelectionEvent =
  (typeof SelectionEvents)[keyof typeof SelectionEvents];

export type SelectionFSM = Record<
  SelectionState,
  Partial<Record<SelectionEvent, SelectionState>>
>;

// Full FSM: Idle → Selecting → Selected → Deselecting → Idle
// Supports cancel transitions: Selecting → Deselecting, Deselecting → Selecting
export const standardSelectionFSM: SelectionFSM = {
  Idle: { RequestSelect: SelectionStates.Selecting },
  Selecting: {
    SequenceComplete: SelectionStates.Selected,
    RequestDeselect: SelectionStates.Deselecting,
  },
  Deselecting: {
    SequenceComplete: SelectionStates.Idle,
    RequestSelect: SelectionStates.Selecting,
  },
  Selected: { RequestDeselect: SelectionStates.Deselecting },
};

// Simple FSM: Idle ↔ Selected — no animation states
export const simpleSelectionFSM: SelectionFSM = {
  Idle: { RequestSelect: SelectionStates.Selected },
  Selecting: {},
  Deselecting: {},
  Selected: { RequestDeselect: SelectionStates.Idle },
};
