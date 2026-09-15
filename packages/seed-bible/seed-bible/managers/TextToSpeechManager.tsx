import { signal, type ReadonlySignal } from "@preact/signals";

/** One verse to speak, paired with the number that identifies it on screen. */
export interface SpeechVerse {
  number: number;
  text: string;
}

export interface SpeakOptions {
  /**
   * BCP-47 tag for the utterances (e.g. `"en"`). Null leaves the choice to the
   * browser. Note that `Translation.language` is ISO 639-3 ("eng"), which this
   * does *not* accept — map it with `bibleLanguageToUiLocale` first.
   */
  lang: string | null;

  /** Called once the queue finishes on its own. Never called by `stop()`. */
  onFinished?: () => void;
}

export interface TextToSpeechManager {
  /** Whether this browser can speak at all. Always false on the server. */
  isSupported: ReadonlySignal<boolean>;

  /**
   * Whether a voice able to read `lang` is installed.
   *
   * Having a speech synthesiser says nothing about which languages it can
   * actually read: a machine with only English voices cannot speak a Greek
   * translation, and asking it to would produce an English voice sounding out
   * Greek letters. Callers use this to decide whether to offer listening at
   * all.
   *
   * Reads the voice list reactively, so a `computed` built on it re-runs when
   * the browser finishes loading its voices (see `createTextToSpeechManager`).
   */
  canSpeakLanguage: (lang: string | null | undefined) => boolean;

  /** Whether a queue is currently being spoken. */
  isSpeaking: ReadonlySignal<boolean>;

  /** The verse number being spoken, or null when idle. */
  currentVerse: ReadonlySignal<number | null>;

  /** Speaks `verses` in order, replacing anything already in flight. */
  speak: (verses: readonly SpeechVerse[], options: SpeakOptions) => void;

  /** Stops immediately and clears the queue. Safe to call when idle. */
  stop: () => void;

  /**
   * Stops any speech and releases the listeners this manager put on shared
   * globals. Safe to call twice.
   */
  dispose: () => void;
}

const MAX_UTTERANCE_CHARACTERS = 160;

const SENTENCE_ENDINGS = new Set([
  ".",
  "!",
  "?",
  ";",
  ":",
  "।",
  "۔",
  "؟",
  "。",
  "！",
  "？",
]);

/**
 * Breaks `text` into pieces of at most `limit` characters, preferring to split
 * at a space.
 *
 * Falls back to cutting mid-run when there is no space to use, which is the
 * normal case for Chinese, Japanese and Thai — an unbroken line is still
 * better than one utterance long enough to be cut off entirely.
 */
function splitToLength(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];

  const pieces: string[] = [];
  let rest = text;
  while (rest.length > limit) {
    const candidate = rest.slice(0, limit + 1);
    const lastSpace = candidate.lastIndexOf(" ");
    // Never zero: a cut of zero would consume nothing and loop forever.
    const cut = lastSpace > 0 ? lastSpace : Math.max(1, limit);
    pieces.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) pieces.push(rest);
  return pieces;
}

/**
 * Splits a verse into the utterances it should be spoken as: one, for almost
 * every verse, and several for the few long enough to risk being cut off.
 *
 * Sentence boundaries are preferred, because a break there sounds like
 * punctuation rather than a fault. Only a sentence that is itself too long
 * gets broken at a word.
 *
 * Returns an empty array for text with nothing to say, so callers don't have
 * to filter blanks separately.
 */
export function splitForSpeech(
  text: string,
  limit: number = MAX_UTTERANCE_CHARACTERS
): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.length <= limit) return [trimmed];

  const sentences: string[] = [];
  let sentence = "";
  for (const character of trimmed) {
    sentence += character;
    if (SENTENCE_ENDINGS.has(character)) {
      sentences.push(sentence.trim());
      sentence = "";
    }
  }
  if (sentence.trim()) sentences.push(sentence.trim());

  const chunks: string[] = [];
  let chunk = "";
  for (const piece of sentences.flatMap((s) => splitToLength(s, limit))) {
    if (!chunk) {
      chunk = piece;
    } else if (chunk.length + 1 + piece.length <= limit) {
      chunk = `${chunk} ${piece}`;
    } else {
      chunks.push(chunk);
      chunk = piece;
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

/**
 * How long a stop keeps insisting the engine fall silent, and how often it
 * checks. See {@link createTextToSpeechManager}'s `enforceSilence`.
 */
const SILENCE_ENFORCEMENT_MS = 2_000;
const SILENCE_CHECK_MS = 50;

/**
 * Guards on `window` rather than `navigator`: the server runs on Bun, which
 * defines a `navigator` of its own, so `typeof navigator === "undefined"` is
 * never true there. See the same reasoning in `app/ssrEnv.ts`.
 */
function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

function getUtteranceConstructor(): typeof SpeechSynthesisUtterance | null {
  if (typeof window === "undefined") return null;
  return window.SpeechSynthesisUtterance ?? null;
}

/**
 * The primary subtag of a language tag, lowercased: "en-GB", "en_US" and "en"
 * all reduce to "en".
 *
 * Voices name themselves with a region ("en-GB", "pt-BR") while a translation
 * only knows its language, so comparing the two has to happen at this level or
 * an American voice would never be considered able to read English.
 */
function baseLanguageTag(tag: string): string {
  return tag.toLowerCase().split(/[-_]/)[0] ?? "";
}

/**
 * Speaks scripture with the browser's own speech synthesiser.
 *
 * This exists so translations without recorded narration can still be listened
 * to — only BSB and AAB ship audio, which left every other translation silent.
 *
 * Callers hand over whole verses rather than a chapter's worth of prose, and
 * each one becomes its own utterance. That is what makes the reader's
 * verse-by-verse highlight possible: an utterance's `start` event *is* the
 * verse boundary, so no timing data has to be fetched the way recorded audio
 * needs it.
 */
export function createTextToSpeechManager(): TextToSpeechManager {
  const speech = getSpeechSynthesis();
  const Utterance = getUtteranceConstructor();

  const isSupported = signal(!!speech && !!Utterance);
  const isSpeaking = signal(false);
  const currentVerse = signal<number | null>(null);

  /**
   * The installed voices, as a signal rather than a `getVoices()` call at the
   * point of use.
   *
   * Browsers report an empty list from the first call and fill it in
   * asynchronously, announcing the result with `voiceschanged`. Since the
   * Listen button's visibility now depends on this list, a plain call would
   * decide "no voice for this language" before the answer existed and leave
   * the button hidden for good. Holding it in a signal instead means the
   * button appears the moment the voices arrive.
   */
  const voices = signal<SpeechSynthesisVoice[]>([]);

  const teardowns: (() => void)[] = [];

  const refreshVoices = () => {
    voices.value = speech?.getVoices() ?? [];
  };
  refreshVoices();
  if (speech) {
    speech.addEventListener("voiceschanged", refreshVoices);
    teardowns.push(() =>
      speech.removeEventListener("voiceschanged", refreshVoices)
    );
  }

  const canSpeakLanguage = (lang: string | null | undefined): boolean => {
    if (!speech || !Utterance || !lang) return false;
    const wanted = baseLanguageTag(lang);
    if (!wanted) return false;
    return voices.value.some(
      (voice) => !!voice.lang && baseLanguageTag(voice.lang) === wanted
    );
  };

  /**
   * The best installed voice for `lang`. Prefers an exact tag match ("en-GB"
   * for "en-GB") over any voice sharing its language ("en-US" for "en").
   *
   * Peeks rather than reads: `speak` is not a reactive computation, and
   * subscribing it to the voice list would be meaningless at best.
   */
  const pickVoice = (lang: string): SpeechSynthesisVoice | null => {
    const installed = voices.peek();
    const wanted = lang.toLowerCase();
    const exact = installed.find(
      (voice) => voice.lang?.toLowerCase() === wanted
    );
    if (exact) return exact;

    const base = baseLanguageTag(lang);
    return (
      installed.find(
        (voice) => voice.lang && baseLanguageTag(voice.lang) === base
      ) ?? null
    );
  };

  /**
   * Identifies the current run. `cancel()` still delivers `end`/`error` for
   * utterances that were already queued, so without this a stopped run's
   * callbacks would clear state belonging to the run that replaced it.
   */
  let runToken = 0;

  let silenceCheck: ReturnType<typeof setInterval> | null = null;

  const clearSilenceCheck = () => {
    if (silenceCheck !== null) {
      clearInterval(silenceCheck);
      silenceCheck = null;
    }
  };

  const reset = () => {
    clearSilenceCheck();
    isSpeaking.value = false;
    currentVerse.value = null;
  };

  /**
   * Holds the engine to a stop.
   *
   * A single `cancel()` is a request, not a guarantee. An utterance the engine
   * has already accepted can begin speaking after one, and a queue can survive
   * it — which is what a quick double-press produces: the second press stops,
   * and the chapter reads itself aloud with nothing left tracking it. Asking
   * once and trusting the answer is what made that reachable, so this keeps
   * asking until the engine itself reports that it is neither speaking nor
   * holding anything pending.
   *
   * Stands down the moment a new run legitimately starts, and gives up after
   * {@link SILENCE_ENFORCEMENT_MS} so a browser that never reports silence
   * can't leave this polling for the life of the page.
   */
  const enforceSilence = () => {
    if (!speech) return;
    clearSilenceCheck();
    if (!speech.speaking && !speech.pending) return;

    const deadline = Date.now() + SILENCE_ENFORCEMENT_MS;
    silenceCheck = setInterval(() => {
      // `isSpeaking` means a new run has taken over; cancelling now would cut
      // off the one the reader is actually listening to.
      if (isSpeaking.peek() || Date.now() >= deadline) {
        clearSilenceCheck();
        return;
      }
      if (speech.speaking || speech.pending) {
        speech.cancel();
      } else {
        clearSilenceCheck();
      }
    }, SILENCE_CHECK_MS);
  };

  const stop = () => {
    runToken++;
    reset();
    if (!speech) return;
    speech.cancel();
    enforceSilence();
  };

  const speak = (verses: readonly SpeechVerse[], options: SpeakOptions) => {
    if (!speech || !Utterance) return;

    stop();

    // One utterance per verse would hand the engine a long enough run of text
    // to be cut off on the few very long verses, so each verse contributes as
    // many utterances as it needs. Every piece still carries its verse number,
    // so the reader's highlight is unaffected by the extra breaks.
    const parts = verses.flatMap((verse) =>
      splitForSpeech(verse.text).map((text) => ({
        number: verse.number,
        text,
      }))
    );
    if (parts.length === 0) return;

    const token = ++runToken;
    const voice = options.lang ? pickVoice(options.lang) : null;

    isSpeaking.value = true;
    // A new run supersedes any stop still being enforced from a previous one.
    clearSilenceCheck();

    parts.forEach((part, index) => {
      const utterance = new Utterance(part.text);
      if (options.lang) utterance.lang = options.lang;
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        if (token !== runToken) {
          // A stopped run can still start speaking: `cancel()` doesn't reliably
          // reach an utterance the engine has already taken, which is exactly
          // what a quick double-press produces — the second press stops, the
          // engine speaks anyway, and nothing is left tracking it. Silence it
          // now that it has proved it survived.
          //
          // Guarded on nothing newer being meant to speak, so a press/stop/press
          // in quick succession cancels the abandoned run rather than the one
          // that replaced it.
          if (!isSpeaking.peek()) speech.cancel();
          return;
        }
        currentVerse.value = part.number;
      };

      utterance.onerror = () => {
        if (token !== runToken) return;
        stop();
      };

      if (index === parts.length - 1) {
        utterance.onend = () => {
          if (token !== runToken) return;
          reset();
          options.onFinished?.();
        };
      }

      speech.speak(utterance);
    });
  };

  if (typeof window !== "undefined" && speech) {
    const silenceOnPageHide = () => speech.cancel();
    window.addEventListener("pagehide", silenceOnPageHide);
    teardowns.push(() =>
      window.removeEventListener("pagehide", silenceOnPageHide)
    );
  }

  const dispose = () => {
    stop();
    for (const teardown of teardowns.splice(0)) {
      teardown();
    }
  };

  return {
    isSupported,
    canSpeakLanguage,
    isSpeaking,
    currentVerse,
    speak,
    stop,
    dispose,
  };
}
