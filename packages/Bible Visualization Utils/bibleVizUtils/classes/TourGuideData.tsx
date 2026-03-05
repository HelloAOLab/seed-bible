export class TourGuideData {
  promiseReject: any;
  intervalId: any;

  constructor({ intervalId, promiseReject }) {
    this.intervalId = intervalId;
    this.promiseReject = promiseReject;
  }
}
