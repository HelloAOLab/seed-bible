declare module "virtual:@pattern/*" {
  const pattern:
    | {
        url: string;
      }
    | {
        aux: string;
      };

  export default pattern;
}
