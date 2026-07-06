export interface SessionPort {
  tryEmitUserLoggedInEvent(): void;
  handleOnlineUsersChanged(): void;
}
