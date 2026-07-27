declare module "*.svg" {
  const url: string;
  export default url;
}

declare module "*.svg?url" {
  const url: string;
  export default url;
}
