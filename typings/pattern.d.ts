declare module "virtual:@pattern/*" {
  const pattern:
    | {
        name: string;
      }
    | {
        aux: string;
      };

  export default pattern;
}
