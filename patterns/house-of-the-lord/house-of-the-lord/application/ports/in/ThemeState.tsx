export interface ThemeStatePort {
  getCss(): string;
  setCss(css: string): void;
}
