export interface AwaiterPort {
  sleep(ms: number): Promise<void>;
}
