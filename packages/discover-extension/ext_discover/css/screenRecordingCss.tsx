export const screenRecordingCss = `.ScreenRecording {
  display: flex;
  position: fixed;
  z-index: 999999;
  align-items: center;
  gap: 1rem;
  background-color: #827b7b;
  padding: 0.5rem;
  border-radius: 18px;
  color: white;
  font-size: 10px;
  font-weight: 400;
  transform: translate(-50%, -50%);
  box-shadow: 0px 3px 8px 0px #00000026;
}

.ScreenRecording .stop-recording {
  background-color: #d80000;
  box-shadow: 0px 3px 8px 0px #00000026;
  font-size: 10px;
  color: white;
  gap: 0.5rem;
  display: flex;
  align-items: center;
  border-radius: 18px;
  cursor: pointer;
  padding: 4px 8px;
}

.ScreenRecording .hide {
  font-family: "DM Sans", system-ui, sans-serif;
  font-weight: 400;
  font-style: Regular;
  font-size: 14px;
  line-height: 100%;
  cursor: pointer;
  letter-spacing: 0%;
  text-decoration: underline;
  text-decoration-style: solid;
  text-decoration-thickness: 0%;
  color: lightgray;
}

.ScreenRecording p {
  font-size: 12px;
  font-weight: 700;
}

.custom-button {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #ffffff;
  font-weight: 700;
  text-align: center;
  display: flex;
  flex-direction: row;
  align-items: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease-in-out;
  cursor: pointer;
  background-color: transparent;
  color: black;
  font-size: 16px;
}

.custom-button.secondaryAlt {
  color: #ffffff;
  border-radius: 4px !important;
  /* max-width: fit-content !important; */
  background-color: #312626;
  font-family: "Satoshi", system-ui, sans-serif;
  text-align: center;
  font-size: 14px !important;
  font-weight: 400 !important;
  padding: 10px 24px !important;
  line-height: 16.94px !important;
  min-width: 0 !important;
  display: flex;
  justify-content: center;
}`;
