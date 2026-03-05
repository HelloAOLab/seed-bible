export class AnimateTagObject {
  then: any;
  options: any;
  tag: any;
  bot: any;

  constructor({ bot, tag = null, options, then = null }) {
    this.bot = bot;
    this.tag = tag;
    this.options = options;
    this.then = then;
  }
}
