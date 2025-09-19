const authBot = await os.requestAuthBotInBackground();
if (authBot) {
    console.log('[app.error] Identifying PostHog with auth bot ID:', authBot);
    posthog.identify(authBot.id);
}
