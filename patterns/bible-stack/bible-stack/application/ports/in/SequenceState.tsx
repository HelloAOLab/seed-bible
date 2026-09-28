export interface SequenceStateServicePort {
  isThereAnOngoingSequence: () => boolean;
  executeAsSequence(task: () => Promise<void>): Promise<void>;
}
