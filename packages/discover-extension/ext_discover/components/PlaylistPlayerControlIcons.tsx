export function PrevIcon({
  fill = "#939393",
  width = "32",
  height = "32",
}: {
  fill?: string;
  width?: string;
  height?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.33325 24V8H9.99992V24H7.33325ZM24.6666 24L12.6666 16L24.6666 8V24Z"
        fill={fill}
      />
    </svg>
  );
}

export function NextIcon({
  fill = "#939393",
  width = "18",
  height = "16",
}: {
  fill?: string;
  width?: string;
  height?: string;
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 18 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.9999 16V0H17.6666V16H14.9999ZM0.333252 16V0L12.3333 8L0.333252 16Z"
        fill={fill}
      />
    </svg>
  );
}
