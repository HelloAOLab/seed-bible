console.warn('[app.error] Got Error!', that);
try {
    posthog.captureException(that.error.error, {
        bot: that.error.bot?.id,
        tag: that.error.tag,
        system: that.error.bot?.tags.system,
        pattern: configBot.tags.pattern,
        patternVersion: configBot.tags.pattern ? getBot(
            byTag('aoArtifact', true),
            byTag('origin_ao', configBot.tags.pattern),
            byTag('origin_version')
        )?.tags?.origin_version : undefined,
    });
} catch(err) {
    console.error('Error reporting the error to PostHog:', err);
}