import posthog from 'https://esm.sh/posthog-js@1.266.2';

posthog.captureException(that.error, {
    bot: that.bot.id,
    tag: that.bot.tag,
    system: that.bot.tags.system,
});