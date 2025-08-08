import OpenAI from 'https://esm.run/openai'



whisper(thisBot, "assistantActions");
whisper(thisBot, "instructions");

// globalThis.openAIClient = OpenAI;
globalThis.OpenAI = OpenAI;