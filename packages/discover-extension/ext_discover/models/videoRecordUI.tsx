export const VIDEO_RECORD_GIF =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/a06426963e6f35751bdc3e76b49527f24cf646ff1ca48aaec66db6ee483f3f1c.gif";

export const SCREEN_RECORD_GIF =
  "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/4762072e89002b10128fc5fd2378aab528e60776159734a56ab048f3f337ed1d.gif";

export const VIDEO_RECORD_ICONS: Record<string, string> = {
  "screen&cam":
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/5ccb9e853b00fb860c2f5891d26f0960752606951a7aa65f834c9d456cd37b74.svg",
  "screen&cam_active":
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/082372063bb71655ac595d8ec562e1db62dce19a36bb9c84e4ae0a650701fcaf.svg",
  screen:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/cac667f563e65712a435b025ba07f17654754c19e088ff63a52cee5a604a17d0.svg",
  screen_active:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/3083c0ab7b70b79e1af836c500a3c797af134d60bd7cf951b2af3a34460bcb40.svg",
  cam: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/0eb6e9acab9162a66e56c02cfdd2276900dfc6ae806a34c728dbfa51438aec18.svg",
  cam_active:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/3c8826d5457ec79a1d3cf195e47d476a0e04fbee3886f6603a7da03cd6f7a267.svg",
  mic: "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/982a9c30965db6345fc760cf381af0e976c3677e395d59acee8efe70691a5f8b.svg",
  mic_off:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/0da679456ed172e5d3573982e6140ca4549d215e3db610e0264d43a1ae1f72af.svg",
  start_recording:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/733bde47bbd9ed4abc94ddf6bdbe597db886a13b106d150ec7ab2a587856b2bd.svg",
  stop_recording:
    "https://auth-aux-aobot-prod-filesbucket-141297942820.s3.amazonaws.com/aoBot/1975ce33ad8bee6f1c178167477fc356446715eda8f5bece9958755209297526.svg",
};

export interface VideoRecordingProps {
  audio: boolean;
  video: boolean;
  screen: boolean;
}

export const DEFAULT_VIDEO_RECORDING_PROPS = (
  G: Record<string, any>
): VideoRecordingProps => ({
  audio: true,
  video: G?.VideoRecordTab ? G.VideoRecordTab !== "screen" : true,
  screen: G?.VideoRecordTab ? G.VideoRecordTab !== "cam" : true,
});
