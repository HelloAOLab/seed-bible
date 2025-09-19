console.warn('[app.error] Got Error!', that);
try {
    posthog.captureException(that.error.error, {
        bot: that.error.bot?.id,
        tag: that.error.tag,
        system: that.error.bot?.tags.system,
    });
} catch(err) {
    console.error('Error reporting the error to PostHog:', err);
}