import posthog from 'https://esm.sh/posthog-js@1.266.2';

posthog.init('phc_rEUogfrnXkdTitOTrfWK2laEINF1QwNtGNQizzuMW0',
    {
        api_host: 'https://us.i.posthog.com',
        person_profiles: 'identified_only' // or 'always' to create profiles for anonymous users as well
    }
);