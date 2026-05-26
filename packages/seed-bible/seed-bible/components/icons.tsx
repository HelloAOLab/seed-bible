/* eslint-disable @typescript-eslint/no-explicit-any */
export const SplitScreenIcon = ({ size = 24 }) => {
  const scale = size / 24;

  const styles = {
    iconWrapper: {
      display: "inline-flex",
      position: "relative",
      width: size,
      height: size,
    },
    screenLeft: {
      position: "absolute",
      left: 2 * scale,
      top: 2 * scale,
      width: 9 * scale,
      height: 20 * scale,
      border: `${1 * scale}px solid #666`,
      borderRadius: 1 * scale,
      backgroundColor: "#e0e0e0",
    },
    screenRight: {
      position: "absolute",
      right: 2 * scale,
      top: 2 * scale,
      width: 9 * scale,
      height: 20 * scale,
      borderRadius: 1 * scale,
      backgroundColor: "#666",
    },
  };

  return (
    <div style={styles.iconWrapper}>
      <div style={styles.screenLeft}></div>
      <div style={styles.screenRight}></div>
    </div>
  );
};
export const SpaceDefaultIcon = () => {
  return (
    <div class="activeBg">
      <span></span>
    </div>
  );
};
export function SeedBibleIcon({
  size = 32,
  ...props
}: { size?: number; [key: string]: any } = {}) {
  return (
    <img
      src="https://favicon.ao.bot/assets/seed-bible-isolated-minified.png"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: "contain",
      }}
      alt="Seed Bible Icon"
      {...props}
    />
  );
}

export const BurgerMenuIcon = () => (
  <span class="material-symbols-outlined">menu</span>
);

export const GoPrivateIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M5.53199 2.59375C7.7952 2.59375 9.20971 5.04375 8.07811 7.00375C7.55293 7.91339 6.58235 8.47375 5.53199 8.47375C3.26878 8.47375 1.85427 6.02375 2.98588 4.06375C3.51106 3.15411 4.48163 2.59375 5.53199 2.59375ZM19.056 2.59375C21.3192 2.59375 22.7337 5.04375 21.6021 7.00375C21.0769 7.91339 20.1064 8.47375 19.056 8.47375C16.7928 8.47375 15.3783 6.02375 16.5099 4.06375C17.0351 3.15411 18.0056 2.59375 19.056 2.59375ZM0.23999 13.571C0.23999 11.4064 1.99664 9.64975 4.16121 9.64975H5.73044C6.31477 9.64975 6.86969 9.77838 7.36949 10.0062C7.32172 10.2708 7.29967 10.5465 7.29967 10.8258C7.29967 12.2296 7.91707 13.4901 8.89094 14.3538H1.02277C0.59279 14.3538 0.23999 14.001 0.23999 13.571ZM15.1348 14.3538H15.109C16.0866 13.4901 16.7003 12.2296 16.7003 10.8258C16.7003 10.5465 16.6746 10.2745 16.6305 10.0062C17.1303 9.7747 17.6852 9.64975 18.2695 9.64975H19.8388C22.0033 9.64975 23.76 11.4064 23.76 13.571C23.76 14.0046 23.4072 14.3538 22.9772 14.3538H15.1348ZM8.47199 10.8258C8.47199 8.1099 11.412 6.41248 13.764 7.77041C14.8556 8.40063 15.528 9.56532 15.528 10.8258C15.528 13.5416 12.588 15.239 10.236 13.8811C9.14442 13.2509 8.47199 12.0862 8.47199 10.8258ZM4.94399 20.4285C4.94399 17.7237 7.13797 15.5298 9.84277 15.5298H14.1572C16.862 15.5298 19.056 17.7237 19.056 20.4285C19.056 20.9688 18.6187 21.4098 18.0748 21.4098H5.92522C5.38499 21.4098 4.94399 20.9724 4.94399 20.4285Z"
      fill="currentColor"
    />
  </svg>
);
export const TabsIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M3.5 21C3.1 21 2.75 20.85 2.45 20.55C2.15 20.25 2 19.9 2 19.5V9.825C2 9.425 2.15 9.075 2.45 8.775C2.75 8.475 3.1 8.325 3.5 8.325H6.375V4.5C6.375 4.1 6.525 3.75 6.825 3.45C7.125 3.15 7.475 3 7.875 3H20.5C20.9 3 21.25 3.15 21.55 3.45C21.85 3.75 22 4.1 22 4.5V14.175C22 14.575 21.85 14.925 21.55 15.225C21.25 15.525 20.9 15.675 20.5 15.675H17.65V19.5C17.65 19.9 17.5 20.25 17.2 20.55C16.9 20.85 16.55 21 16.15 21H3.5ZM3.5 19.5H16.15V11.325H3.5V19.5ZM17.65 14.175H20.5V6H7.875V8.325H15.8C16.3334 8.325 16.775 8.5 17.125 8.85C17.475 9.2 17.65 9.64165 17.65 10.175V14.175Z"
      fill="currentColor"
    />
  </svg>
);

export const SettingsIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g opacity={0.6}>
      <path
        d="M9.62731 5.42308L10.2037 3.88615C10.3009 3.62593 10.472 3.40211 10.6944 3.24399C10.9169 3.08587 11.1804 3.00082 11.4504 3H12.5496C12.8196 3.00082 13.0831 3.08587 13.3056 3.24399C13.528 3.40211 13.699 3.62593 13.7962 3.88615L14.3727 5.42308L16.3297 6.58615L17.9115 6.33692C18.1749 6.3 18.443 6.34477 18.6818 6.46558C18.9204 6.58639 19.1189 6.77776 19.252 7.01538L19.7882 7.98462C19.9256 8.22602 19.989 8.50479 19.9698 8.78412C19.9507 9.06345 19.85 9.33023 19.681 9.54923L18.7024 10.8369V13.1631L19.7078 14.4508C19.8768 14.6698 19.9775 14.9365 19.9966 15.2159C20.0158 15.4952 19.9524 15.774 19.815 16.0154L19.2788 16.9846C19.1457 17.2222 18.9472 17.4136 18.7086 17.5344C18.4698 17.6552 18.2017 17.7 17.9383 17.6631L16.3565 17.4138L14.3995 18.5769L13.8231 20.1138C13.7258 20.374 13.5548 20.5979 13.3324 20.756C13.1099 20.9142 12.8464 20.9992 12.5764 21H11.4504C11.1804 20.9992 10.9169 20.9142 10.6944 20.756C10.472 20.5979 10.3009 20.374 10.2037 20.1138L9.62731 18.5769L7.67019 17.4138L6.08841 17.6631C5.82502 17.7 5.55695 17.6552 5.31826 17.5344C5.07959 17.4136 4.88106 17.2222 4.74791 16.9846L4.21171 16.0154C4.07431 15.774 4.01101 15.4952 4.03016 15.2159C4.0493 14.9365 4.15 14.6698 4.31895 14.4508L5.29751 13.1631V10.8369L4.29214 9.54923C4.12319 9.33023 4.02249 9.06345 4.00335 8.78412C3.9842 8.50479 4.0475 8.22602 4.1849 7.98462L4.7211 7.01538C4.85425 6.77776 5.05278 6.58639 5.29145 6.46558C5.53014 6.34477 5.79821 6.3 6.0616 6.33692L7.64338 6.58615L9.62731 5.42308ZM9.319 12C9.319 12.5477 9.47624 13.0831 9.77082 13.5385C10.0654 13.9939 10.4841 14.3488 10.974 14.5584C11.4639 14.768 12.003 14.8229 12.523 14.716C13.0431 14.6092 13.5208 14.3454 13.8957 13.9581C14.2707 13.5709 14.526 13.0774 14.6295 12.5402C14.7329 12.0031 14.6798 11.4463 14.4769 10.9403C14.274 10.4342 13.9304 10.0018 13.4895 9.69747C13.0486 9.39318 12.5302 9.23077 12 9.23077C11.2889 9.23077 10.607 9.52252 10.1042 10.0419C9.60147 10.5612 9.319 11.2656 9.319 12Z"
        stroke="black"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  </svg>
);
export const ClientLogo = ({ handleOpenClientSite, url, alt }: any) => {
  return (
    <img
      onClick={handleOpenClientSite}
      alt={alt}
      src={url}
      style={{
        width: "36px",
        height: "36px",
        backgroundColor: "white",
        borderRadius: "50%",
        overflow: "hidden",
        cursor: "pointer",
      }}
    />
  );
};
export const HighlightIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M9 11L3 17V20H12L15 17"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22 12L17.4 16.6C17.0261 16.9665 16.5235 17.1717 16 17.1717C15.4765 17.1717 14.9738 16.9665 14.6 16.6L9.39996 11.4C9.03351 11.0261 8.82825 10.5235 8.82825 10C8.82825 9.47649 9.03351 8.97386 9.39996 8.6L14 4"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const InfoSettingsIcon = (props: any) => (
  <svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M11.8337 13.6666C11.1337 13.6666 10.542 13.4249 10.0587 12.9416C9.57533 12.4583 9.33366 11.8666 9.33366 11.1666C9.33366 10.4666 9.57533 9.87492 10.0587 9.39158C10.542 8.90825 11.1337 8.66658 11.8337 8.66658C12.5337 8.66658 13.1253 8.90825 13.6087 9.39158C14.092 9.87492 14.3337 10.4666 14.3337 11.1666C14.3337 11.8666 14.092 12.4583 13.6087 12.9416C13.1253 13.4249 12.5337 13.6666 11.8337 13.6666ZM11.8337 12.6666C12.2559 12.6666 12.6114 12.5222 12.9003 12.2333C13.1892 11.9444 13.3337 11.5888 13.3337 11.1666C13.3337 10.7444 13.1892 10.3888 12.9003 10.0999C12.6114 9.81102 12.2559 9.66658 11.8337 9.66658C11.4114 9.66658 11.0559 9.81102 10.767 10.0999C10.4781 10.3888 10.3337 10.7444 10.3337 11.1666C10.3337 11.5888 10.4781 11.9444 10.767 12.2333C11.0559 12.5222 11.4114 12.6666 11.8337 12.6666ZM7.50033 11.6666H2.50033C2.35866 11.6666 2.23994 11.6184 2.14416 11.5219C2.04827 11.4256 2.00033 11.3062 2.00033 11.1636C2.00033 11.0212 2.04827 10.9027 2.14416 10.8083C2.23994 10.7138 2.35866 10.6666 2.50033 10.6666H7.50033C7.64199 10.6666 7.76076 10.7148 7.85666 10.8113C7.95243 10.9076 8.00033 11.027 8.00033 11.1696C8.00033 11.312 7.95243 11.4305 7.85666 11.5249C7.76076 11.6194 7.64199 11.6666 7.50033 11.6666ZM4.16699 7.33325C3.46699 7.33325 2.87533 7.09159 2.39199 6.60825C1.90866 6.12492 1.66699 5.53325 1.66699 4.83325C1.66699 4.13325 1.90866 3.54159 2.39199 3.05825C2.87533 2.57492 3.46699 2.33325 4.16699 2.33325C4.86699 2.33325 5.45866 2.57492 5.94199 3.05825C6.42533 3.54159 6.66699 4.13325 6.66699 4.83325C6.66699 5.53325 6.42533 6.12492 5.94199 6.60825C5.45866 7.09159 4.86699 7.33325 4.16699 7.33325ZM4.16699 6.33325C4.58923 6.33325 4.94476 6.18882 5.23366 5.89992C5.52256 5.61102 5.66699 5.25549 5.66699 4.83325C5.66699 4.41102 5.52256 4.05549 5.23366 3.76659C4.94476 3.47769 4.58923 3.33325 4.16699 3.33325C3.74476 3.33325 3.38923 3.47769 3.10033 3.76659C2.81144 4.05549 2.66699 4.41102 2.66699 4.83325C2.66699 5.25549 2.81144 5.61102 3.10033 5.89992C3.38923 6.18882 3.74476 6.33325 4.16699 6.33325ZM13.5003 5.33325H8.50033C8.35866 5.33325 8.23993 5.28502 8.14416 5.18859C8.04826 5.09225 8.00033 4.97282 8.00033 4.83025C8.00033 4.68782 8.04826 4.56935 8.14416 4.47492C8.23993 4.38049 8.35866 4.33325 8.50033 4.33325H13.5003C13.642 4.33325 13.7608 4.38149 13.8567 4.47792C13.9524 4.57425 14.0003 4.69369 14.0003 4.83625C14.0003 4.97869 13.9524 5.09715 13.8567 5.19159C13.7608 5.28602 13.642 5.33325 13.5003 5.33325Z"
      fill="currentColor"
    />
  </svg>
);
export const AskIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M20.7134 8.12811L20.4668 8.69379C20.2864 9.10792 19.7136 9.10792 19.5331 8.69379L19.2866 8.12811C18.8471 7.11947 18.0555 6.31641 17.0677 5.87708L16.308 5.53922C15.8973 5.35653 15.8973 4.75881 16.308 4.57612L17.0252 4.25714C18.0384 3.80651 18.8442 2.97373 19.2761 1.93083L19.5293 1.31953C19.7058 0.89349 20.2942 0.89349 20.4706 1.31953L20.7238 1.93083C21.1558 2.97373 21.9616 3.80651 22.9748 4.25714L23.6919 4.57612C24.1027 4.75881 24.1027 5.35653 23.6919 5.53922L22.9323 5.87708C21.9445 6.31641 21.1529 7.11947 20.7134 8.12811ZM10 3H14V5H10C6.68629 5 4 7.68629 4 11C4 14.61 6.46208 16.9656 12 19.4798V17H14C17.3137 17 20 14.3137 20 11H22C22 15.4183 18.4183 19 14 19V22.5C9 20.5 2 17.5 2 11C2 6.58172 5.58172 3 10 3Z"
      fill="currentColor"
    />
  </svg>
);
export const MarginIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M6 3C7.10457 3 8 3.89543 8 5V19C8 20.1046 7.10457 21 6 21H4C3.44772 21 3 20.5523 3 20C3 19.4477 3.44772 19 4 19H6V5H4C3.44772 5 3 4.55228 3 4C3 3.44772 3.44772 3 4 3H6ZM20 3C20.5523 3 21 3.44772 21 4C21 4.55228 20.5523 5 20 5H18V19H20C20.5523 19 21 19.4477 21 20C21 20.5523 20.5523 21 20 21H18C16.8954 21 16 20.1046 16 19V5C16 3.89543 16.8954 3 18 3H20ZM12 6C12.5523 6 13 6.44772 13 7V17C13 17.5523 12.5523 18 12 18C11.4477 18 11 17.5523 11 17V7C11 6.44772 11.4477 6 12 6Z"
      fill="currentColor"
    />
  </svg>
);
export const BookMarkIcon = (props: any) => (
  <svg
    width={14}
    height={20}
    viewBox="0 0 14 20"
    fill="none"
    stroke="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M13 5V19L7 15L1 19V5C1 3.93913 1.42143 2.92172 2.17157 2.17157C2.92172 1.42143 3.93913 1 5 1H9C10.0609 1 11.0783 1.42143 11.8284 2.17157C12.5786 2.92172 13 3.93913 13 5Z"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const Eraser = (props: any) => (
  <svg
    width={14}
    height={20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M3 16L10 9L15 14L8 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V16Z"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 9L13.586 5.414C13.9609 5.03906 14.4696 4.82843 15 4.82843C15.5304 4.82843 16.0391 5.03906 16.414 5.414L19 8C19.375 8.37493 19.5856 8.88364 19.5856 9.414C19.5856 9.94436 19.375 10.4531 19 10.828L15 14"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const TodayIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M11.5 21H6C5.46957 21 4.96086 20.7893 4.58579 20.4142C4.21071 20.0391 4 19.5304 4 19V5C4 4.46957 4.21071 3.96086 4.58579 3.58579C4.96086 3.21071 5.46957 3 6 3H18C18.5304 3 19.0391 3.21071 19.4142 3.58579C19.7893 3.96086 20 4.46957 20 5V13"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 18H11"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M15 19L17 21L21 17"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ApologistIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      class="size-6"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
      />
    </svg>
  );
};

const AiIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Rounded rectangle background */}
    <rect x="2" y="4" width="20" height="16" rx="4" fill="currentColor" />

    {/* AI text */}
    <text
      x="12"
      y="14"
      textAnchor="middle"
      fontSize="8"
      fontWeight="bold"
      fill="currentColor"
      fontFamily="Arial, sans-serif"
      // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
    >
      AI
    </text>
  </svg>
);
const AiChatIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Chat bubble */}
    <path
      d="M4 5C4 3.9 4.9 3 6 3H18C19.1 3 20 3.9 20 5V13C20 14.1 19.1 15 18 15H10L6 19V15H6C4.9 15 4 14.1 4 13V5Z"
      fill="currentColor"
    />

    {/* AI text */}
    <text
      x="12"
      y="11.5"
      textAnchor="middle"
      fontSize="6.5"
      fontWeight="bold"
      fill="currentColor"
      fontFamily="Arial, sans-serif"
      // eslint-disable-next-line seed-bible-i18n/i18n-untranslated-content
    >
      AI
    </text>
  </svg>
);
const UserAvatar = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      d="M5.85 17.1C6.7 16.45 7.65 15.9375 8.7 15.5625C9.75 15.1875 10.85 15 12 15C13.15 15 14.25 15.1875 15.3 15.5625C16.35 15.9375 17.3 16.45 18.15 17.1C18.7333 16.4167 19.1875 15.6417 19.5125 14.775C19.8375 13.9083 20 12.9833 20 12C20 9.78333 19.2208 7.89583 17.6625 6.3375C16.1042 4.77917 14.2167 4 12 4C9.78333 4 7.89583 4.77917 6.3375 6.3375C4.77917 7.89583 4 9.78333 4 12C4 12.9833 4.1625 13.9083 4.4875 14.775C4.8125 15.6417 5.26667 16.4167 5.85 17.1ZM12 13C11.0167 13 10.1875 12.6625 9.5125 11.9875C8.8375 11.3125 8.5 10.4833 8.5 9.5C8.5 8.51667 8.8375 7.6875 9.5125 7.0125C10.1875 6.3375 11.0167 6 12 6C12.9833 6 13.8125 6.3375 14.4875 7.0125C15.1625 7.6875 15.5 8.51667 15.5 9.5C15.5 10.4833 15.1625 11.3125 14.4875 11.9875C13.8125 12.6625 12.9833 13 12 13ZM12 22C10.6167 22 9.31667 21.7375 8.1 21.2125C6.88333 20.6875 5.825 19.975 4.925 19.075C4.025 18.175 3.3125 17.1167 2.7875 15.9C2.2625 14.6833 2 13.3833 2 12C2 10.6167 2.2625 9.31667 2.7875 8.1C3.3125 6.88333 4.025 5.825 4.925 4.925C5.825 4.025 6.88333 3.3125 8.1 2.7875C9.31667 2.2625 10.6167 2 12 2C13.3833 2 14.6833 2.2625 15.9 2.7875C17.1167 3.3125 18.175 4.025 19.075 4.925C19.975 5.825 20.6875 6.88333 21.2125 8.1C21.7375 9.31667 22 10.6167 22 12C22 13.3833 21.7375 14.6833 21.2125 15.9C20.6875 17.1167 19.975 18.175 19.075 19.075C18.175 19.975 17.1167 20.6875 15.9 21.2125C14.6833 21.7375 13.3833 22 12 22Z"
      fill="currentColor"
    />
  </svg>
);
// Dual Screen Icon Component
const DualScreenIcon = (props: any) => (
  <svg
    width={19}
    height={19}
    viewBox="0 0 19 19"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M12.509 19C11.9444 19 11.4665 18.8044 11.0753 18.4132C10.6841 18.0221 10.4886 17.5442 10.4886 16.9796V2.02043C10.4886 1.45583 10.6841 0.977941 11.0753 0.586765C11.4665 0.195588 11.9444 0 12.509 0H16.2917C16.8563 0 17.3342 0.195588 17.7253 0.586765C18.1165 0.977941 18.3121 1.45583 18.3121 2.02043V16.9796C18.3121 17.5442 18.1165 18.0221 17.7253 18.4132C17.3342 18.8044 16.8563 19 16.2917 19H12.509ZM2.02043 19C1.45583 19 0.977941 18.8044 0.586765 18.4132C0.195588 18.0221 0 17.5442 0 16.9796V2.02043C0 1.45583 0.195588 0.977941 0.586765 0.586765C0.977941 0.195588 1.45583 0 2.02043 0H5.8031C6.3677 0 6.84559 0.195588 7.23677 0.586765C7.62794 0.977941 7.82353 1.45583 7.82353 2.02043V16.9796C7.82353 17.5442 7.62794 18.0221 7.23677 18.4132C6.84559 18.8044 6.3677 19 5.8031 19H2.02043ZM1.67647 2.02043V16.9796C1.67647 17.0656 1.71233 17.1444 1.78404 17.216C1.85557 17.2877 1.93437 17.3235 2.02043 17.3235H5.8031C5.88916 17.3235 5.96796 17.2877 6.03949 17.216C6.1112 17.1444 6.14706 17.0656 6.14706 16.9796V2.02043C6.14706 1.93437 6.1112 1.85557 6.03949 1.78404C5.96796 1.71233 5.88916 1.67647 5.8031 1.67647H2.02043C1.93437 1.67647 1.85557 1.71233 1.78404 1.78404C1.71233 1.85557 1.67647 1.93437 1.67647 2.02043Z"
      fill="currentColor"
    />
  </svg>
);
const ToolbarIcon = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path
      d="M18.85 21.975C18.7167 21.975 18.5917 21.9542 18.475 21.9125C18.3583 21.8708 18.25 21.8 18.15 21.7L13.05 16.6C12.95 16.5 12.8792 16.3917 12.8375 16.275C12.7958 16.1583 12.775 16.0333 12.775 15.9C12.775 15.7667 12.7958 15.6417 12.8375 15.525C12.8792 15.4083 12.95 15.3 13.05 15.2L15.175 13.075C15.275 12.975 15.3833 12.9042 15.5 12.8625C15.6167 12.8208 15.7417 12.8 15.875 12.8C16.0083 12.8 16.1333 12.8208 16.25 12.8625C16.3667 12.9042 16.475 12.975 16.575 13.075L21.675 18.175C21.775 18.275 21.8458 18.3833 21.8875 18.5C21.9292 18.6167 21.95 18.7417 21.95 18.875C21.95 19.0083 21.9292 19.1333 21.8875 19.25C21.8458 19.3667 21.775 19.475 21.675 19.575L19.55 21.7C19.45 21.8 19.3417 21.8708 19.225 21.9125C19.1083 21.9542 18.9833 21.975 18.85 21.975ZM5.125 22C4.99167 22 4.8625 21.975 4.7375 21.925C4.6125 21.875 4.5 21.8 4.4 21.7L2.3 19.6C2.2 19.5 2.125 19.3875 2.075 19.2625C2.025 19.1375 2 19.0083 2 18.875C2 18.7417 2.025 18.6167 2.075 18.5C2.125 18.3833 2.2 18.275 2.3 18.175L7.6 12.875H9.725L10.575 12.025L6.45 7.9H5.025L2 4.875L4.825 2.05L7.85 5.075V6.5L11.975 10.625L14.875 7.725L13.8 6.65L15.2 5.25H12.375L11.675 4.55L15.225 1L15.925 1.7V4.525L17.325 3.125L20.875 6.675C21.1583 6.95833 21.375 7.27917 21.525 7.6375C21.675 7.99583 21.75 8.375 21.75 8.775C21.75 9.175 21.675 9.55833 21.525 9.925C21.375 10.2917 21.1583 10.6167 20.875 10.9L18.75 8.775L17.35 10.175L16.3 9.125L11.125 14.3V16.4L5.825 21.7C5.725 21.8 5.61667 21.875 5.5 21.925C5.38333 21.975 5.25833 22 5.125 22Z"
      fill="currentColor"
    />
  </svg>
);
// Three Screen Icon Component
const ThreeScreenIcon = (props: any) => (
  <svg
    width={19}
    height={19}
    viewBox="0 0 19 19"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M2.02043 19C1.45583 19 0.977941 18.8044 0.586765 18.4132C0.195588 18.0221 0 17.5442 0 16.9796V2.02043C0 1.45583 0.195588 0.977941 0.586765 0.586765C0.977941 0.195588 1.45583 0 2.02043 0H6.3031C6.8677 0 7.34559 0.195588 7.73677 0.586765C8.12794 0.977941 8.32353 1.45583 8.32353 2.02043V16.9796C8.32353 17.5442 8.12794 18.0221 7.73677 18.4132C7.34559 18.8044 6.8677 19 6.3031 19H2.02043Z"
      fill="currentColor"
    />
    <path
      d="M12.009 9C11.4444 9 10.9665 8.80441 10.5753 8.41324C10.1841 8.02206 9.98859 7.54417 9.98859 6.97957V2.02043C9.98859 1.45583 10.1841 0.977941 10.5753 0.586765C10.9665 0.195588 11.4444 0 12.009 0H16.2917C16.8563 0 17.3342 0.195588 17.7253 0.586765C18.1165 0.977941 18.3121 1.45583 18.3121 2.02043V6.97957C18.3121 7.54417 18.1165 8.02206 17.7253 8.41324C17.3342 8.80441 16.8563 9 16.2917 9H12.009Z"
      fill="currentColor"
    />
    <path
      d="M12.009 19C11.4444 19 10.9665 18.8044 10.5753 18.4132C10.1841 18.0221 9.98859 17.5442 9.98859 16.9796V12.0204C9.98859 11.4558 10.1841 10.9779 10.5753 10.5868C10.9665 10.1956 11.4444 10 12.009 10H16.2917C16.8563 10 17.3342 10.1956 17.7253 10.5868C18.1165 10.9779 18.3121 11.4558 18.3121 12.0204V16.9796C18.3121 17.5442 18.1165 18.0221 17.7253 18.4132C17.3342 18.8044 16.8563 19 16.2917 19H12.009Z"
      fill="currentColor"
    />
  </svg>
);

// Quad Screen Icon Component
const QuadScreenIcon = (props: any) => (
  <svg
    width={19}
    height={19}
    viewBox="0 0 19 19"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M2.02043 9C1.45583 9 0.977941 8.80441 0.586765 8.41324C0.195588 8.02206 0 7.54417 0 6.97957V2.02043C0 1.45583 0.195588 0.977941 0.586765 0.586765C0.977941 0.195588 1.45583 0 2.02043 0H5.8031C6.3677 0 6.84559 0.195588 7.23677 0.586765C7.62794 0.977941 7.82353 1.45583 7.82353 2.02043V6.97957C7.82353 7.54417 7.62794 8.02206 7.23677 8.41324C6.84559 8.80441 6.3677 9 5.8031 9H2.02043Z"
      fill="currentColor"
    />
    <path
      d="M2.02043 19C1.45583 19 0.977941 18.8044 0.586765 18.4132C0.195588 18.0221 0 17.5442 0 16.9796V12.0204C0 11.4558 0.195588 10.9779 0.586765 10.5868C0.977941 10.1956 1.45583 10 2.02043 10H5.8031C6.3677 10 6.84559 10.1956 7.23677 10.5868C7.62794 10.9779 7.82353 11.4558 7.82353 12.0204V16.9796C7.82353 17.5442 7.62794 18.0221 7.23677 18.4132C6.84559 18.8044 6.3677 19 5.8031 19H2.02043Z"
      fill="currentColor"
    />
    <path
      d="M12.509 9C11.9444 9 11.4665 8.80441 11.0753 8.41324C10.6841 8.02206 10.4886 7.54417 10.4886 6.97957V2.02043C10.4886 1.45583 10.6841 0.977941 11.0753 0.586765C11.4665 0.195588 11.9444 0 12.509 0H16.2917C16.8563 0 17.3342 0.195588 17.7253 0.586765C18.1165 0.977941 18.3121 1.45583 18.3121 2.02043V6.97957C18.3121 7.54417 18.1165 8.02206 17.7253 8.41324C17.3342 8.80441 16.8563 9 16.2917 9H12.509Z"
      fill="currentColor"
    />
    <path
      d="M12.509 19C11.9444 19 11.4665 18.8044 11.0753 18.4132C10.6841 18.0221 10.4886 17.5442 10.4886 16.9796V12.0204C10.4886 11.4558 10.6841 10.9779 11.0753 10.5868C11.4665 10.1956 11.9444 10 12.509 10H16.2917C16.8563 10 17.3342 10.1956 17.7253 10.5868C18.1165 10.9779 18.3121 11.4558 18.3121 12.0204V16.9796C18.3121 17.5442 18.1165 18.0221 17.7253 18.4132C17.3342 18.8044 16.8563 19 16.2917 19H12.509Z"
      fill="currentColor"
    />
  </svg>
);
const Playlist = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M2 14.6667V12.5333H10.5333V14.6667H2ZM2 10.4V8.26667H14.8V10.4H2ZM2 6.13333V4H14.8V6.13333H2ZM15.8667 20V11.4667L22.2667 15.7333L15.8667 20Z"
      fill="currentColor"
    />
  </svg>
);
const MenuDown = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="none"
    {...props}
  >
    <path
      d="M7.99935 9.99935L4.66602 6.66602H11.3327L7.99935 9.99935Z"
      fill="currentColor"
    />
  </svg>
);

const SingleScreenIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g opacity={0.7}>
      <path
        d="M5 7V17H19V7H5ZM3.5 20C3.1 20 2.75 19.85 2.45 19.55C2.15 19.25 2 18.9 2 18.5V5.5C2 5.1 2.15 4.75 2.45 4.45C2.75 4.15 3.1 4 3.5 4H20.5C20.9 4 21.25 4.15 21.55 4.45C21.85 4.75 22 5.1 22 5.5V18.5C22 18.9 21.85 19.25 21.55 19.55C21.25 19.85 20.9 20 20.5 20H3.5ZM3.5 18.5H20.5V5.5H3.5V18.5Z"
        fill="currentColor"
      />
    </g>
  </svg>
);

export const Panel1 = () => {
  return (
    <div
      style={{
        background: "var(--sb-font-color)",
        color: "var(--sb-reader-background)",
        display: "flex",
        "justify-content": "center",
        "align-items": "center",
        width: "105px",
        height: "65px",
        "border-radius": "5px",
      }}
    >
      <span style={{ fontSize: "10px" }}>1</span>
    </div>
  );
};
export const Panel2 = () => {
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: "1px" }}>
      <div
        style={{
          background: "var(--sb-font-color)",
          color: "var(--sb-reader-background)",
          display: "flex",
          "justify-content": "center",
          "align-items": "center",
          width: "60px",
          height: "65px",
          "border-radius": "3px 0px 0px 3px",
        }}
      >
        <span style={{ fontSize: "10px" }}>1</span>
      </div>
      <div
        style={{
          background: "var(--sb-font-color)",
          color: "var(--sb-reader-background)",
          display: "flex",
          "justify-content": "center",
          "align-items": "center",
          width: "40px",
          height: "65px",
          "border-radius": " 0px 3px 3px 0px",
        }}
      >
        <span style={{ fontSize: "10px" }}>2</span>
      </div>
    </div>
  );
};
export const Panel3 = () => {
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: "1px" }}>
      <div
        style={{
          background: "var(--sb-font-color)",
          color: "var(--sb-reader-background)",
          display: "flex",
          "justify-content": "center",
          "align-items": "center",
          width: "60px",
          height: "65px",
          "border-radius": "3px 0px 0px 3px",
        }}
      >
        <span style={{ fontSize: "10px" }}>1</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        <div
          style={{
            background: "var(--sb-font-color)",
            color: "var(--sb-reader-background)",
            display: "flex",
            "justify-content": "center",
            "align-items": "center",
            width: "40px",
            height: "32px",
            "border-radius": " 0px 3px 0px 0px",
          }}
        >
          <span style={{ fontSize: "10px" }}>2</span>
        </div>
        <div
          style={{
            background: "var(--sb-font-color)",
            color: "var(--sb-reader-background)",
            display: "flex",
            "justify-content": "center",
            "align-items": "center",
            width: "40px",
            height: "32px",
            "border-radius": " 0px 0px 3px 0px",
          }}
        >
          <span style={{ fontSize: "10px" }}>3</span>
        </div>
      </div>
    </div>
  );
};
export const Panel4 = () => {
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: "1px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        <div
          style={{
            background: "var(--sb-font-color)",
            color: "var(--sb-reader-background)",
            display: "flex",
            "justify-content": "center",
            "align-items": "center",
            width: "50px",
            height: "32px",
            "border-radius": " 3px 0px 0px 0px",
          }}
        >
          <span style={{ fontSize: "10px" }}>1</span>
        </div>
        <div
          style={{
            background: "var(--sb-font-color)",
            color: "var(--sb-reader-background)",
            display: "flex",
            "justify-content": "center",
            "align-items": "center",
            width: "50px",
            height: "32px",
            "border-radius": "  0px 0px 0px 3px",
          }}
        >
          <span style={{ fontSize: "10px" }}>2</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        <div
          style={{
            background: "var(--sb-font-color)",
            color: "var(--sb-reader-background)",
            display: "flex",
            "justify-content": "center",
            "align-items": "center",
            width: "50px",
            height: "32px",
            "border-radius": " 0px 3px 0px 0px",
          }}
        >
          <span style={{ fontSize: "10px" }}>3</span>
        </div>
        <div
          style={{
            background: "var(--sb-font-color)",
            color: "var(--sb-reader-background)",
            display: "flex",
            "justify-content": "center",
            "align-items": "center",
            width: "50px",
            height: "32px",
            "border-radius": " 0px 0px 3px 0px",
          }}
        >
          <span style={{ fontSize: "10px" }}>4</span>
        </div>
      </div>
    </div>
  );
};

export const Panel3Row = () => {
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: "1px" }}>
      <div
        style={{
          background: "var(--sb-font-color)",
          color: "var(--sb-reader-background)",
          display: "flex",
          "justify-content": "center",
          "align-items": "center",
          width: "35px",
          height: "65px",
          "border-radius": "3px 0px 0px 3px",
        }}
      >
        <span style={{ fontSize: "10px" }}>1</span>
      </div>
      <div
        style={{
          background: "var(--sb-font-color)",
          color: "var(--sb-reader-background)",
          display: "flex",
          "justify-content": "center",
          "align-items": "center",
          width: "33px",
          height: "65px",
          "border-radius": " 0px 0px 0px 0px",
        }}
      >
        <span style={{ fontSize: "10px" }}>2</span>
      </div>
      <div
        style={{
          background: "var(--sb-font-color)",
          color: "var(--sb-reader-background)",
          display: "flex",
          "justify-content": "center",
          "align-items": "center",
          width: "33px",
          height: "65px",
          "border-radius": " 0px 3px 3px 0px",
        }}
      >
        <span style={{ fontSize: "10px" }}>3</span>
      </div>
    </div>
  );
};

export const Panel4Row = () => {
  return (
    <div style={{ display: "flex", flexDirection: "row", gap: "1px" }}>
      <div
        style={{
          background: "var(--sb-font-color)",
          color: "var(--sb-reader-background)",
          display: "flex",
          "justify-content": "center",
          "align-items": "center",
          width: "25px",
          height: "65px",
          "border-radius": "3px 0px 0px 3px",
        }}
      >
        <span style={{ fontSize: "10px" }}>1</span>
      </div>
      <div
        style={{
          background: "var(--sb-font-color)",
          color: "var(--sb-reader-background)",
          display: "flex",
          "justify-content": "center",
          "align-items": "center",
          width: "25px",
          height: "65px",
          "border-radius": " 0px 0px 0px 0px",
        }}
      >
        <span style={{ fontSize: "10px" }}>2</span>
      </div>
      <div
        style={{
          background: "var(--sb-font-color)",
          color: "var(--sb-reader-background)",
          display: "flex",
          "justify-content": "center",
          "align-items": "center",
          width: "25px",
          height: "65px",
          "border-radius": " 0px 0px 0px 0px",
        }}
      >
        <span style={{ fontSize: "10px" }}>3</span>
      </div>
      <div
        style={{
          background: "var(--sb-font-color)",
          color: "var(--sb-reader-background)",
          display: "flex",
          "justify-content": "center",
          "align-items": "center",
          width: "25px",
          height: "65px",
          "border-radius": " 0px 3px 3px 0px",
        }}
      >
        <span style={{ fontSize: "10px" }}>4</span>
      </div>
    </div>
  );
};
export const ExtensionsIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M20.1879 11.3279H18.7251C18.697 11.3279 18.6701 11.3168 18.6503 11.297C18.6305 11.2771 18.6193 11.2502 18.6193 11.2222V7.13734C18.6193 6.59229 18.4028 6.06957 18.0174 5.68416C17.632 5.29875 17.1093 5.08223 16.5642 5.08223H12.4794C12.4514 5.08223 12.4245 5.07109 12.4046 5.05125C12.3848 5.03142 12.3737 5.00451 12.3737 4.97646V3.51366C12.3737 2.07837 11.2366 0.876823 9.80135 0.851967C9.4536 0.845857 9.10812 0.909063 8.78507 1.0379C8.46201 1.16673 8.16784 1.35861 7.91973 1.60234C7.67162 1.84607 7.47453 2.13677 7.33997 2.45749C7.2054 2.7782 7.13605 3.1225 7.13596 3.4703V4.97646C7.13596 5.00451 7.12482 5.03142 7.10498 5.05125C7.08515 5.07109 7.05825 5.08223 7.03019 5.08223H2.94539C2.3902 5.0839 1.85822 5.3052 1.46564 5.69778C1.07306 6.09036 0.851772 6.62234 0.850098 7.17753V10.8996C0.850098 10.9276 0.861241 10.9545 0.881077 10.9744C0.900912 10.9942 0.927815 11.0053 0.955867 11.0053H2.37899C3.93221 11.0053 5.21784 12.3528 5.23952 13.9061C5.26173 15.4858 3.9962 16.9285 2.4213 16.9285H0.955867C0.927815 16.9285 0.900912 16.9396 0.881077 16.9594C0.861241 16.9793 0.850098 17.0062 0.850098 17.0342V20.7563C0.851772 21.3115 1.07306 21.8434 1.46564 22.236C1.85822 22.6286 2.3902 22.8499 2.94539 22.8516H6.66741C6.69546 22.8516 6.72236 22.8404 6.7422 22.8206C6.76203 22.8007 6.77317 22.7738 6.77317 22.7458V21.6389C6.77317 20.0376 8.08207 18.6588 9.68183 18.6213C11.2737 18.5843 12.6963 19.6954 12.6963 21.2804V22.7458C12.6963 22.7738 12.7074 22.8007 12.7272 22.8206C12.7471 22.8404 12.774 22.8516 12.802 22.8516H16.5642C17.1093 22.8516 17.632 22.635 18.0174 22.2496C18.4028 21.8642 18.6193 21.3415 18.6193 20.7965V16.6714C18.6193 16.6434 18.6305 16.6165 18.6503 16.5966C18.6701 16.5768 18.697 16.5657 18.7251 16.5657H20.2313C21.6925 16.5657 22.8501 15.3668 22.8501 13.9003C22.8501 12.4338 21.6232 11.3279 20.1879 11.3279Z"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const ThemeIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    // fill="currentColor"
    className="coloredIcon"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M7 16C6.80222 16 6.60888 16.0586 6.44443 16.1685C6.27998 16.2784 6.15181 16.4346 6.07612 16.6173C6.00043 16.8 5.98063 17.0011 6.01921 17.1951C6.0578 17.3891 6.15304 17.5673 6.29289 17.7071C6.43275 17.847 6.61093 17.9422 6.80491 17.9808C6.99889 18.0194 7.19996 17.9996 7.38268 17.9239C7.56541 17.8482 7.72159 17.72 7.83147 17.5556C7.94135 17.3911 8 17.1978 8 17C8 16.7348 7.89464 16.4804 7.70711 16.2929C7.51957 16.1054 7.26522 16 7 16ZM19.06 12L20.29 10.77C20.8518 10.2075 21.1674 9.445 21.1674 8.65C21.1674 7.855 20.8518 7.0925 20.29 6.53L17.46 3.71C16.8975 3.1482 16.135 2.83264 15.34 2.83264C14.545 2.83264 13.7825 3.1482 13.22 3.71L12 4.94C11.9843 4.15479 11.6613 3.40706 11.1004 2.85736C10.5395 2.30766 9.78536 1.99984 9 2H5C4.20435 2 3.44129 2.31607 2.87868 2.87868C2.31607 3.44129 2 4.20435 2 5V19C2 19.7956 2.31607 20.5587 2.87868 21.1213C3.44129 21.6839 4.20435 22 5 22H19C19.7956 22 20.5587 21.6839 21.1213 21.1213C21.6839 20.5587 22 19.7956 22 19V15C22.0002 14.2146 21.6923 13.4605 21.1426 12.8996C20.5929 12.3387 19.8452 12.0157 19.06 12ZM10 19C10 19.2652 9.89464 19.5196 9.70711 19.7071C9.51957 19.8946 9.26522 20 9 20H5C4.73478 20 4.48043 19.8946 4.29289 19.7071C4.10536 19.5196 4 19.2652 4 19V5C4 4.73478 4.10536 4.48043 4.29289 4.29289C4.48043 4.10536 4.73478 4 5 4H9C9.26522 4 9.51957 4.10536 9.70711 4.29289C9.89464 4.48043 10 4.73478 10 5V19ZM12 7.76L14.64 5.12C14.8274 4.93375 15.0808 4.82921 15.345 4.82921C15.6092 4.82921 15.8626 4.93375 16.05 5.12L18.88 8C19.0662 8.18736 19.1708 8.44081 19.1708 8.705C19.1708 8.96919 19.0662 9.22264 18.88 9.41L16 12.29L12 16.24V7.76ZM20 19C20 19.2652 19.8946 19.5196 19.7071 19.7071C19.5196 19.8946 19.2652 20 19 20H11.82C11.9226 19.7036 11.9799 19.3935 11.99 19.08L17.07 14H19C19.2652 14 19.5196 14.1054 19.7071 14.2929C19.8946 14.4804 20 14.7348 20 15V19Z"
      fill="currentColor"
    />
  </svg>
);
export const SelectionUIIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    {/* Dashed selection box */}
    <rect
      x="3"
      y="3"
      width="14"
      height="14"
      rx="2"
      stroke="currentColor"
      strokeWidth="2"
      strokeDasharray="3 3"
    />

    {/* Solid selection cursor */}
    <path d="M11 12L21 16L15 17L17 22Z" fill="currentColor" />
  </svg>
);
const MenuIcon = ({
  name,
  size = 24,
  invert = false,
  className = "",
  style = {},
}: any) => {
  // Check if `name` looks like an image URL
  const isImage =
    typeof name === "string" && name.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i);

  const imageStyle = {
    width: isImage ? size : undefined,
    height: isImage ? size : undefined,
    filter: invert ? "invert(1)" : undefined,
    objectFit: "contain",
  };

  const iconStyle = {
    fontSize: isImage ? 16 : size,
    filter: invert ? "invert(1)" : undefined,
    ...style,
  };

  return isImage ? (
    <img src={name} alt="icon" style={imageStyle} className={className} />
  ) : (
    <span className="material-symbols-outlined" style={iconStyle}>
      {name}
    </span>
  );
};
export const MoreIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M4 6H20"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7 12H20"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 18H20"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const StartSessionIcon = (props: any) => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M7.50008 4.16797C10.7217 4.16797 13.3334 6.77964 13.3334 10.0013C13.3334 13.223 10.7217 15.8346 7.50008 15.8346C4.27842 15.8346 1.66675 13.223 1.66675 10.0013C1.66675 6.77964 4.27842 4.16797 7.50008 4.16797ZM13.3334 4.22819C16.1602 4.63262 18.3334 7.06263 18.3334 10.0013C18.3334 12.94 16.1602 15.3691 13.3334 15.7736V14.0841C15.2352 13.6981 16.6667 12.0171 16.6667 10.0013C16.6667 7.98548 15.2353 6.30368 13.3334 5.91764V4.22819Z"
      fill="currentColor"
    />
  </svg>
);
export const JoinSession = (props: any) => (
  <svg
    width={20}
    height={20}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g clipPath="url(#clip0_4878_806)">
      <path
        d="M16.25 16.25H3.75V3.75H10V2.5H3.75C3.41858 2.50033 3.10083 2.63213 2.86648 2.86648C2.63213 3.10083 2.50033 3.41858 2.5 3.75V16.25C2.50033 16.5814 2.63213 16.8992 2.86648 17.1335C3.10083 17.3679 3.41858 17.4997 3.75 17.5H16.25C16.5814 17.4997 16.8992 17.3679 17.1335 17.1335C17.3679 16.8992 17.4997 16.5814 17.5 16.25V10H16.25V16.25Z"
        fill="currentColor"
      />
      <path
        d="M16.25 16.25H3.75V3.75H10V2.5H3.75C3.41858 2.50033 3.10083 2.63213 2.86648 2.86648C2.63213 3.10083 2.50033 3.41858 2.5 3.75V16.25C2.50033 16.5814 2.63213 16.8992 2.86648 17.1335C3.10083 17.3679 3.41858 17.4997 3.75 17.5H16.25C16.5814 17.4997 16.8992 17.3679 17.1335 17.1335C17.3679 16.8992 17.4997 16.5814 17.5 16.25V10H16.25V16.25Z"
        fill="currentColor"
      />
      <path
        d="M16.25 3.75V1.25H15V3.75H12.5V5H15V7.5H16.25V5H18.75V3.75H16.25Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="clip0_4878_806">
        <rect width={20} height={20} fill="currentColor" />
      </clipPath>
    </defs>
  </svg>
);
const T = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      d="M4 7V4H20V7"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 20H15"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 4V20"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const Panal = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    {...props}
  >
    <rect width={24} height={24} fill="url(#pattern0_1_6904)" />
    <defs>
      <pattern
        id="pattern0_1_6904"
        patternContentUnits="objectBoundingBox"
        width={1}
        height={1}
      >
        <use xlinkHref="#image0_1_6904" transform="scale(0.00195312)" />
      </pattern>
      <image
        id="image0_1_6904"
        width={512}
        height={512}
        preserveAspectRatio="none"
        xlinkHref="data:image/png;base64,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"
      />
    </defs>
  </svg>
);
const Space = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    {...props}
  >
    <rect opacity={0.6} width={24} height={24} fill="url(#pattern0_88_6761)" />
    <defs>
      <pattern
        id="pattern0_88_6761"
        patternContentUnits="objectBoundingBox"
        width={1}
        height={1}
      >
        <use xlinkHref="#image0_88_6761" transform="scale(0.00195312)" />
      </pattern>
      <image
        id="image0_88_6761"
        width={512}
        height={512}
        preserveAspectRatio="none"
        xlinkHref="data:image/png;base64,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"
      />
    </defs>
  </svg>
);
const LoadSpace = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      d="M12 22C10.6167 22 9.31667 21.7375 8.1 21.2125C6.88333 20.6875 5.825 19.975 4.925 19.075C4.025 18.175 3.3125 17.1167 2.7875 15.9C2.2625 14.6833 2 13.3833 2 12C2 9.8 2.64167 7.82083 3.925 6.0625C5.20833 4.30417 6.9 3.1 9 2.45V4.6C7.48333 5.21667 6.27083 6.19583 5.3625 7.5375C4.45417 8.87917 4 10.3667 4 12C4 14.2333 4.775 16.125 6.325 17.675C7.875 19.225 9.76667 20 12 20C14.2333 20 16.125 19.225 17.675 17.675C19.225 16.125 20 14.2333 20 12C20 10.3667 19.5458 8.87917 18.6375 7.5375C17.7292 6.19583 16.5167 5.21667 15 4.6V2.45C17.1 3.1 18.7917 4.30417 20.075 6.0625C21.3583 7.82083 22 9.8 22 12C22 13.3833 21.7375 14.6833 21.2125 15.9C20.6875 17.1167 19.975 18.175 19.075 19.075C18.175 19.975 17.1167 20.6875 15.9 21.2125C14.6833 21.7375 13.3833 22 12 22ZM12 16L7 11L8.4 9.6L11 12.175V2H13V12.175L15.6 9.6L17 11L12 16Z"
      fill="currentColor"
    />
  </svg>
);
const FolderIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
  >
    <g clip-path="url(#clip0_1_2625)">
      <path
        d="M19.5 20.5002H4.5C3.84661 20.5082 3.21666 20.257 2.7481 19.8015C2.27953 19.3461 2.01053 18.7235 2 18.0702V5.93019C2.01053 5.27683 2.27953 4.65427 2.7481 4.19883C3.21666 3.74338 3.84661 3.49216 4.5 3.50019H9.1C9.24771 3.50116 9.39336 3.53485 9.5265 3.59882C9.65964 3.6628 9.77695 3.75547 9.87 3.87019L12.47 7.05019H19.47C19.796 7.04222 20.1204 7.09891 20.4244 7.21697C20.7285 7.33503 21.0061 7.51213 21.2413 7.73805C21.4765 7.96396 21.6647 8.23423 21.7949 8.53324C21.9251 8.83225 21.9948 9.15409 22 9.48019V18.0702C21.9895 18.7235 21.7205 19.3461 21.2519 19.8015C20.7833 20.257 20.1534 20.5082 19.5 20.5002Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="clip0_1_2625">
        <rect width="24" height="24" fill="currentColor" />
      </clipPath>
    </defs>
  </svg>
);
const OpenFolderIcon = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    {...props}
  >
    <path
      d="M22.3823 14.0979L19.8048 19.5943C19.6042 20.0221 19.317 20.3769 18.9717 20.6236C18.6265 20.8702 18.2354 21 17.8373 21H3.60245C2.94321 21 2.53247 20.1105 2.86463 19.4021L5.44222 13.9057C5.64282 13.4779 5.93003 13.1231 6.27525 12.8764C6.62046 12.6298 7.01162 12.5 7.40972 12.5H21.6446C22.3038 12.5 22.7145 13.3895 22.3823 14.0979ZM7.40972 11.0833H19.0833V8.95833C19.0833 7.78471 18.3185 6.83333 17.375 6.83333H11.6806L9.40278 4H3.70833C2.76484 4 2 4.95138 2 6.125V18.4343L4.45847 13.1919C5.06838 11.8913 6.19926 11.0833 7.40972 11.0833Z"
      fill="currentColor"
    />
  </svg>
);
const FormatLine = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="none"
    {...props}
  >
    <g clipPath="url(#clip0_1_8275)">
      <path
        d="M4.98433 4.5859C5.33695 4.5859 5.50935 4.16275 5.25859 3.91983L3.46414 2.11754C3.30742 1.96082 3.0645 1.96082 2.90778 2.11754L1.11332 3.91983C0.870406 4.16275 1.0428 4.5859 1.39542 4.5859H2.40627V12.4219H1.39542C1.0428 12.4219 0.870406 12.8451 1.12116 13.088L2.91561 14.8825C3.07234 15.0392 3.31525 15.0392 3.47197 14.8825L5.26643 13.088C5.50935 12.8451 5.33695 12.4219 4.98433 12.4219H3.97348V4.5859H4.98433ZM7.27246 4.5859H15.1085C15.5395 4.5859 15.8921 4.23327 15.8921 3.80229C15.8921 3.37131 15.5395 3.01869 15.1085 3.01869H7.27246C6.84147 3.01869 6.48885 3.37131 6.48885 3.80229C6.48885 4.23327 6.84147 4.5859 7.27246 4.5859ZM15.1085 12.4219H7.27246C6.84147 12.4219 6.48885 12.7746 6.48885 13.2055C6.48885 13.6365 6.84147 13.9892 7.27246 13.9892H15.1085C15.5395 13.9892 15.8921 13.6365 15.8921 13.2055C15.8921 12.7746 15.5395 12.4219 15.1085 12.4219ZM15.1085 7.72031H7.27246C6.84147 7.72031 6.48885 8.07294 6.48885 8.50392C6.48885 8.9349 6.84147 9.28752 7.27246 9.28752H15.1085C15.5395 9.28752 15.8921 8.9349 15.8921 8.50392C15.8921 8.07294 15.5395 7.72031 15.1085 7.72031Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="clip0_1_8275">
        <rect width={16} height={16} fill="currentColor" />
      </clipPath>
    </defs>
  </svg>
);
const ColorSelect = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="currentColor"
    style={{}}
    {...props}
  >
    <circle
      cx={8}
      cy={8}
      r={7.5}
      fill="currentColor"
      stroke="currentColor"
      style={{}}
    />
  </svg>
);
const MarginYIcon = () => (
  <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <path
      d="M12.25 11.6667C12.25 11.9888 11.9888 12.25 11.6667 12.25H2.33333C2.01117 12.25 1.75 11.9888 1.75 11.6667V2.33333C1.75 2.01117 2.01117 1.75 2.33333 1.75H11.6667C11.9888 1.75 12.25 2.01117 12.25 2.33333V11.6667ZM11.0833 6.41667V2.91667H7.58392V4.08333H8.75L7 5.83333L5.25 4.08333H6.41667V2.91667H2.91667V6.41667H4.08333V7.58333H2.91667V11.0833H6.41667V9.91667H5.25L7 8.16667L8.75 9.91667H7.58392V11.0833H11.0833V7.58333H9.91667V6.41667H11.0833ZM6.41667 7.58333H5.25V6.41667H6.41667V7.58333ZM8.75 7.58333H7.58333V6.41667H8.75V7.58333Z"
      fill="currentColor"
    />
  </svg>
);
const MarginXIcon = () => (
  <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <path
      d="M2.33333 12.25C2.01116 12.25 1.75 11.9888 1.75 11.6667L1.75 2.33333C1.75 2.01117 2.01116 1.75 2.33333 1.75L11.6667 1.75C11.9888 1.75 12.25 2.01117 12.25 2.33333L12.25 11.6667C12.25 11.9888 11.9888 12.25 11.6667 12.25L2.33333 12.25ZM7.58333 11.0833L11.0833 11.0833L11.0833 7.58392L9.91667 7.58392L9.91667 8.75L8.16667 7L9.91667 5.25L9.91667 6.41667L11.0833 6.41667L11.0833 2.91667L7.58333 2.91667L7.58333 4.08333L6.41667 4.08333L6.41667 2.91667L2.91667 2.91667L2.91667 6.41667L4.08333 6.41667L4.08333 5.25L5.83333 7L4.08333 8.75L4.08333 7.58392L2.91667 7.58392L2.91667 11.0833L6.41667 11.0833L6.41667 9.91667L7.58333 9.91667L7.58333 11.0833ZM6.41667 6.41667L6.41667 5.25L7.58333 5.25L7.58333 6.41667L6.41667 6.41667ZM6.41667 8.75L6.41667 7.58333L7.58333 7.58333L7.58333 8.75L6.41667 8.75Z"
      fill="currentColor"
    />
  </svg>
);
const CopyIcon = (props: any) => (
  <svg
    width={40}
    height={40}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M4.6665 3.778C4.6665 3.30644 4.85383 2.8542 5.18727 2.52076C5.52071 2.18732 5.97295 2 6.4445 2H12.2218C12.4553 2 12.6865 2.04599 12.9022 2.13534C13.118 2.22469 13.314 2.35566 13.4791 2.52076C13.6442 2.68587 13.7751 2.88187 13.8645 3.09759C13.9538 3.31331 13.9998 3.54451 13.9998 3.778V9.55533C13.9998 9.78882 13.9538 10.02 13.8645 10.2357C13.7751 10.4515 13.6442 10.6475 13.4791 10.8126C13.314 10.9777 13.118 11.1086 12.9022 11.198C12.6865 11.2873 12.4553 11.3333 12.2218 11.3333H6.4445C5.97295 11.3333 5.52071 11.146 5.18727 10.8126C4.85383 10.4791 4.6665 10.0269 4.6665 9.55533V3.778Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2.67467 4.83984C2.47023 4.95639 2.30018 5.12485 2.18172 5.32818C2.06325 5.53151 2.00057 5.76252 2 5.99784V12.6645C2 13.3978 2.6 13.9978 3.33333 13.9978H10C10.5 13.9978 10.772 13.7412 11 13.3312"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.3335 4.66797H10.6668"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.3335 6.66797H11.3335"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M7.3335 8.66797H9.3335"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ShareIcon = (props: any) => (
  <svg
    width={40}
    height={40}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M14.3196 6.94844L9.51246 2.14128C9.25093 1.87947 8.80406 1.99894 8.70809 2.35633C8.69719 2.39692 8.69166 2.43876 8.69164 2.48079V4.9054C7.13292 5.03879 5.41136 5.80193 3.99505 7.00312C2.28971 8.45007 1.22793 10.3146 1.005 12.2531C0.941261 12.8045 1.49834 13.2182 2.00775 12.9977C2.09844 12.9584 2.1801 12.9009 2.24765 12.8288C2.90863 12.1251 5.26053 9.90003 8.69164 9.70414V12.0951C8.69181 12.4652 9.09252 12.6962 9.4129 12.5111C9.44929 12.49 9.48276 12.4643 9.51246 12.4346L14.3196 7.62745C14.5068 7.43981 14.5068 7.13607 14.3196 6.94844ZM9.65307 10.9348V9.2108C9.65307 8.9453 9.43785 8.73007 9.17235 8.73009C7.48504 8.73009 5.8416 9.17054 4.28768 10.04C3.49627 10.4848 2.7589 11.0196 2.09021 11.6336C2.43873 10.2011 3.31724 8.83885 4.61697 7.73621C6.01225 6.55305 7.71518 5.84579 9.17235 5.84579C9.43785 5.84579 9.65307 5.63057 9.65307 5.36508V3.64172L13.2999 7.28794L9.65307 10.9348Z"
      fill="currentColor"
    />
  </svg>
);

const LocationIcon = (props: any) => (
  <svg
    width="16"
    height="20"
    viewBox="0 0 16 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M8.00225 9.75C8.4841 9.75 8.89585 9.5784 9.2375 9.23525C9.57915 8.8921 9.75 8.4796 9.75 7.99775C9.75 7.5159 9.5784 7.10415 9.23525 6.7625C8.8921 6.42085 8.4796 6.25 7.99775 6.25C7.5159 6.25 7.10415 6.4216 6.7625 6.76475C6.42085 7.1079 6.25 7.5204 6.25 8.00225C6.25 8.4841 6.4216 8.89585 6.76475 9.2375C7.1079 9.57915 7.5204 9.75 8.00225 9.75ZM8 20C5.31665 17.7167 3.3125 15.5958 1.9875 13.6375C0.6625 11.6791 0 9.86665 0 8.2C0 5.7 0.804165 3.70835 2.4125 2.225C4.02085 0.741665 5.88335 0 8 0C10.1166 0 11.9791 0.741665 13.5875 2.225C15.1958 3.70835 16 5.7 16 8.2C16 9.86665 15.3375 11.6791 14.0125 13.6375C12.6875 15.5958 10.6833 17.7167 8 20Z"
      fill="currentColor"
    />
  </svg>
);
const BibleIcon = (props: any) => (
  <svg
    width={24}
    height={24}
    viewBox="0 0 24 24"
    fill="none"
    className="coloredIcon"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    {...props}
  >
    <rect
      opacity={0.6}
      width={24}
      height={24}
      fill="url(#pattern0_4412_2655)"
    />
    <defs>
      <pattern
        id="pattern0_4412_2655"
        patternContentUnits="objectBoundingBox"
        width={1}
        height={1}
      >
        <use xlinkHref="#image0_4412_2655" transform="scale(0.00195312)" />
      </pattern>
      <image
        id="image0_4412_2655"
        width={512}
        height={512}
        preserveAspectRatio="none"
        xlinkHref="data:image/png;base64,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"
      />
    </defs>
  </svg>
);

export const MaterialIcon = ({ children, className, ...props }: any) => (
  <span className={`material-symbols-outlined ${className}`} {...props}>
    {children}
  </span>
);

const TickIcon = (props: any) => {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M5 10C7.7614 10 10 7.7614 10 5C10 2.23857 7.7614 0 5 0C2.23857 0 0 2.23857 0 5C0 7.7614 2.23857 10 5 10ZM7.72855 3.72856L4.5 6.9571L2.39645 4.85355L3.10356 4.14645L4.5 5.5429L7.02145 3.02144L7.72855 3.72856Z"
        fill="var(--sb-font-color)"
      />
    </svg>
  );
};

const FiltersIcon = (props: any) => {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clip-path="url(#clip0_5131_17531)">
        <path
          d="M5.28613 13H11.0718"
          stroke="var(--sb-font-color)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M5.28613 19.0664H16.8576"
          stroke="var(--sb-font-color)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M14.9287 13H20.7144"
          stroke="var(--sb-font-color)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M20.715 6.93359H9.14355"
          stroke="var(--sb-font-color)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M5.28613 6.93248C5.28613 8.16676 5.98042 8.86105 7.2147 8.86105C8.44899 8.86105 9.14328 8.16676 9.14328 6.93248C9.14328 5.69819 8.44899 5.00391 7.2147 5.00391C5.98042 5.00391 5.28613 5.69819 5.28613 6.93248Z"
          stroke="var(--sb-font-color)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M16.8574 19.0653C16.8574 20.2996 17.5517 20.9939 18.786 20.9939C20.0203 20.9939 20.7146 20.2997 20.7146 19.0654C20.7146 17.831 20.0203 17.1367 18.786 17.1367C17.5517 17.1367 16.8574 17.831 16.8574 19.0653Z"
          stroke="var(--sb-font-color)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M11.1016 12.9989C11.1016 14.2332 11.7958 14.9275 13.0301 14.9275C14.2644 14.9275 14.9587 14.2332 14.9587 12.9989C14.9587 11.7646 14.2644 11.0703 13.0301 11.0703C11.7958 11.0703 11.1016 11.7646 11.1016 12.9989Z"
          stroke="var(--sb-font-color)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_5131_17531">
          <rect
            width="18"
            height="18"
            fill="currentColor"
            transform="translate(4 4)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};

const SelectedIcon = (props: any) => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M6.66667 13.3333C2.98477 13.3333 0 10.3485 0 6.66667C0 2.98477 2.98477 0 6.66667 0C10.3485 0 13.3333 2.98477 13.3333 6.66667C13.3333 10.3485 10.3485 13.3333 6.66667 13.3333ZM6.66667 12C9.6122 12 12 9.6122 12 6.66667C12 3.72115 9.6122 1.33333 6.66667 1.33333C3.72115 1.33333 1.33333 3.72115 1.33333 6.66667C1.33333 9.6122 3.72115 12 6.66667 12ZM6.66667 10C4.82572 10 3.33333 8.5076 3.33333 6.66667C3.33333 4.82572 4.82572 3.33333 6.66667 3.33333C8.5076 3.33333 10 4.82572 10 6.66667C10 8.5076 8.5076 10 6.66667 10Z"
        fill="var(--sb-primary-color)"
      />
    </svg>
  );
};

const AddIcon = (props: any) => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clip-path="url(#clip0_5131_17546)">
        <path
          d="M10.3738 3.48957C10.3497 2.9384 10.3167 2.38767 10.2748 1.83757C10.2573 1.60469 10.1569 1.38582 9.99173 1.22068C9.82659 1.05554 9.60772 0.955096 9.37484 0.937569C6.88624 0.744769 4.38645 0.744769 1.89784 0.937569C1.66496 0.955096 1.44609 1.05554 1.28095 1.22068C1.11582 1.38582 1.01537 1.60469 0.997841 1.83757C0.805407 4.31651 0.805407 6.80663 0.997841 9.28557C1.01537 9.51845 1.11582 9.73732 1.28095 9.90246C1.44609 10.0676 1.66496 10.168 1.89784 10.1856C2.47784 10.2286 3.04784 10.2626 3.61384 10.2866"
          stroke="var(--sb-font-color)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M3.72924 11.9135C3.74677 12.1463 3.84722 12.3652 4.01236 12.5304C4.17749 12.6955 4.39637 12.7959 4.62924 12.8135C7.11784 13.0065 9.61765 13.0065 12.1062 12.8135C12.3391 12.7959 12.558 12.6955 12.7231 12.5304C12.8883 12.3652 12.9887 12.1463 13.0062 11.9135C13.1986 9.43486 13.1986 6.94508 13.0062 4.46647C12.9887 4.23359 12.8883 4.01472 12.7231 3.84958C12.558 3.68444 12.3391 3.584 12.1062 3.56647C9.61764 3.37368 7.11785 3.37368 4.62924 3.56647C4.39637 3.584 4.17749 3.68444 4.01236 3.84958C3.84722 4.01472 3.74677 4.23359 3.72924 4.46647C3.53687 6.94508 3.53687 9.43486 3.72924 11.9135Z"
          stroke="var(--sb-font-color)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M6.25977 8.19141H10.4758"
          stroke="var(--sb-font-color)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M8.36719 6.08203V10.298"
          stroke="var(--sb-font-color)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_5131_17546">
          <rect width="14" height="14" fill="var(--sb-font-color)" />
        </clipPath>
      </defs>
    </svg>
  );
};

const MinusIcon = (props: any) => {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clip-path="url(#clip0_5131_17546)">
        <path
          d="M10.3738 3.48957C10.3497 2.9384 10.3167 2.38767 10.2748 1.83757C10.2573 1.60469 10.1569 1.38582 9.99173 1.22068C9.82659 1.05554 9.60772 0.955096 9.37484 0.937569C6.88624 0.744769 4.38645 0.744769 1.89784 0.937569C1.66496 0.955096 1.44609 1.05554 1.28095 1.22068C1.11582 1.38582 1.01537 1.60469 0.997841 1.83757C0.805407 4.31651 0.805407 6.80663 0.997841 9.28557C1.01537 9.51845 1.11582 9.73732 1.28095 9.90246C1.44609 10.0676 1.66496 10.168 1.89784 10.1856C2.47784 10.2286 3.04784 10.2626 3.61384 10.2866"
          stroke="var(--sb-font-color)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M3.72924 11.9135C3.74677 12.1463 3.84722 12.3652 4.01236 12.5304C4.17749 12.6955 4.39637 12.7959 4.62924 12.8135C7.11784 13.0065 9.61765 13.0065 12.1062 12.8135C12.3391 12.7959 12.558 12.6955 12.7231 12.5304C12.8883 12.3652 12.9887 12.1463 13.0062 11.9135C13.1986 9.43486 13.1986 6.94508 13.0062 4.46647C12.9887 4.23359 12.8883 4.01472 12.7231 3.84958C12.558 3.68444 12.3391 3.584 12.1062 3.56647C9.61764 3.37368 7.11785 3.37368 4.62924 3.56647C4.39637 3.584 4.17749 3.68444 4.01236 3.84958C3.84722 4.01472 3.74677 4.23359 3.72924 4.46647C3.53687 6.94508 3.53687 9.43486 3.72924 11.9135Z"
          stroke="var(--sb-font-color)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <path
          d="M6.25977 8.19141H10.4758"
          stroke="var(--sb-font-color)"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_5131_17546">
          <rect width="14" height="14" fill="var(--sb-font-color)" />
        </clipPath>
      </defs>
    </svg>
  );
};

export {
  DualScreenIcon,
  ColorSelect,
  MenuDown,
  FormatLine,
  ThreeScreenIcon,
  T,
  QuadScreenIcon,
  SingleScreenIcon,
  MenuIcon,
  Space,
  LoadSpace,
  FolderIcon,
  OpenFolderIcon,
  ToolbarIcon,
  BibleIcon,
  Panal,
  AiIcon,
  AiChatIcon,
  UserAvatar,
  MarginYIcon,
  MarginXIcon,
  CopyIcon,
  ShareIcon,
  LocationIcon,
  Playlist,
  TickIcon,
  FiltersIcon,
  SelectedIcon,
  AddIcon,
  MinusIcon,
};
