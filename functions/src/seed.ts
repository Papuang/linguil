// Import necessary Firebase and Google Cloud modules.
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { GoogleGenAI } from "@google/genai";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { spawn } from "child_process";

// Import utility functions and custom error classes.
import { CsvRow, parseCsvFile, findRowInCsv, parseWord, shuffleArray, getRandomItem } from "./utils";
import { CsvParsingError, DataValidationError, TtsError as _TtsError } from "./error";

// Latin-only overrides.
const LATIN_ONLY = ["Amharic", "Vietnamese", "Javanese", "Tagalog", "Turkish", "Hungarian", "Hmong", "Yoruba", "Malay", "Sundanese", "Northern Uzbek", "Mongolian", "Burmese", "Odia"];
// Gemini Live API languages.
const GEMINI_SUPPORTED_LANGS = ["Amharic", "Hausa", "Persian", "Swahili", "Basque", "Igbo", "Lingala", "Yoruba", "Northern Uzbek", "Sindhi", "Saraiki", "Mongolian", "Burmese", "Odia", "Nepali"];
// Latin-only overrides for Gemini Live API languages.
const GEMINI_LATIN_ONLY = ["Hausa", "Swahili", "Yoruba", "Northern Uzbek"];

// Defines the structure for the cached language data.
let languageDataCache: {
    families: CsvRow[];
    swadesh: CsvRow[];
    regions: CsvRow[];
    familyRegions: CsvRow[];
    familiesByLanguage: Map<string, CsvRow>;
    languagesByFamily: Map<string, string[]>;
    regionsByLanguage: Map<string, string>;
    languagesByRegion: Map<string, string[]>;
    regionsByFamily: Map<string, string[]>;
    familiesByRegion: Map<string, string[]>;
    allFamilies: string[];
    allEnglishWords: string[];
} | null = null;

// Asynchronously loads, parses, and pre-computes core language data from CSV files.
async function getCoreLanguageData() {
  // Return the cached data if it's already been loaded to avoid redundant file I/O.
  if (languageDataCache) {
    logger.info("Using cached language data");
    return languageDataCache;
  }

  logger.info("Parsing and pre-computing language data from files...");
  const dataPath = path.join(__dirname, "..", "data");

  try {
    // Concurrently parse the language families and Swadesh list CSVs for efficiency.
    const [families, swadesh, regions, familyRegions] = await Promise.all([
      parseCsvFile(path.join(dataPath, "MultiLangFamilies.csv")),
      parseCsvFile(path.join(dataPath, "MultiLangSwadesh.csv")),
      parseCsvFile(path.join(dataPath, "MultiLangRegions.csv")),
      parseCsvFile(path.join(dataPath, "LangFamilyRegions.csv")),
    ]);

    // Create maps for efficient lookups: language name to family info, and family name to language list.
    const familiesByLanguage = new Map<string, CsvRow>();
    const languagesByFamily = new Map<string, string[]>();

    // Populate the lookup maps with data from the parsed families file.
    for (const family of families) {
      const lang = family.Language?.trim();
      const fam = family.Language_Family?.trim();
      if (lang) {
        familiesByLanguage.set(lang, family);
        if (fam) {
          if (!languagesByFamily.has(fam)) {
            languagesByFamily.set(fam, []);
          }
          languagesByFamily.get(fam)!.push(lang);
        }
      }
    }

    // Create maps for efficient lookups: language name to region, and region to language list.
    const regionsByLanguage = new Map<string, string>();
    const languagesByRegion = new Map<string, string[]>();

    for (const region of regions) {
      const lang = region.Language?.trim();
      const reg = region.Region?.trim();
      if (lang && reg) {
        regionsByLanguage.set(lang, reg);
        if (!languagesByRegion.has(reg)) {
          languagesByRegion.set(reg, []);
        }
            languagesByRegion.get(reg)!.push(lang);
      }
    }

    const regionsByFamily = new Map<string, string[]>();
    const familiesByRegion = new Map<string, string[]>();

    for (const familyRegion of familyRegions) {
      const fam = familyRegion.Language_Family?.trim();
      const reg = familyRegion.Region?.trim();
      if (fam && reg) {
        if (!regionsByFamily.has(fam)) {
          regionsByFamily.set(fam, []);
        }
            regionsByFamily.get(fam)!.push(reg);

            if (!familiesByRegion.has(reg)) {
              familiesByRegion.set(reg, []);
            }
            familiesByRegion.get(reg)!.push(fam);
      }
    }

    // Create convenient arrays of all unique family names and English words.
    const allFamilies = [...languagesByFamily.keys()];
    const allEnglishWords = [...new Set(swadesh.map(s => s.English_Word).filter(Boolean))];

    // Store the processed data in the cache.
    languageDataCache = { families, swadesh, regions, familyRegions, familiesByLanguage, languagesByFamily, allFamilies, allEnglishWords, regionsByLanguage, languagesByRegion, regionsByFamily, familiesByRegion };
    logger.info("Successfully parsed and cached language data");
    return languageDataCache;
  } catch (error) {
    // Throw a specific error if loading or parsing fails.
    throw new CsvParsingError(`Failed to load or parse core language data: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

// Convert raw PCM (24kHz, 16-bit, mono) to MP3.
async function convertPcmToMp3(pcmBuffer: Buffer): Promise<Buffer> {
  const tempPcmPath = path.join(os.tmpdir(), `temp-${Date.now()}.pcm`);
  const tempMp3Path = path.join(os.tmpdir(), `temp-${Date.now()}.mp3`);
  fs.writeFileSync(tempPcmPath, pcmBuffer);

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", [
      "-f", "s16le", 
      "-ar", "24000", 
      "-ac", "1", 
      "-i", tempPcmPath, 
      "-y", tempMp3Path
    ]);

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        const mp3Buffer = fs.readFileSync(tempMp3Path);
        fs.unlinkSync(tempPcmPath);
        fs.unlinkSync(tempMp3Path);
        resolve(mp3Buffer);
      } else {
        reject(new Error(`ffmpeg exited with code ${code}`));
      }
    });
  });
}

// Scheduled Cloud Function that runs daily to generate and save a new daily word challenge.
export const seedDailyWord = onSchedule(
  { schedule: "every day 00:00", timeoutSeconds: 540, memory: "512MiB", region: "europe-west2", secrets: ["GEMINI_API_KEY"] },
  async () => {
    // Initialize Firestore and Text-to-Speech clients.
    const db = getFirestore();
    const ttsClient = new TextToSpeechClient();
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const today = new Date();
    const docId = today.toISOString().slice(0, 10); // Use YYYY-MM-DD as the document ID.
    const dailyWordRef = db.collection("dailyWords").doc(docId);

    // Check if the daily word for today has already been generated.
    const docSnap = await dailyWordRef.get();
    if (docSnap.exists) {
      logger.info(`Daily word for ${docId} already exists. Exiting function.`);
      return;
    }

    logger.info(`Seeding daily word for ${docId}...`);

    try {
      // Load the necessary language data, using the cache if available.
      const { swadesh, familiesByLanguage, languagesByFamily, allFamilies, allEnglishWords, regionsByLanguage, languagesByRegion, familiesByRegion } = await getCoreLanguageData();
      if (!swadesh?.length) {
        throw new DataValidationError("CRITICAL: Swadesh data source is empty or failed to load");
      }

      const dataPath = path.join(__dirname, "..", "data");
      // Create a deterministic seed based on the current date for reproducible randomness.
      const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

      // Filter the Swadesh list to only include rows that have at least one translation.
      const validRows = swadesh.filter(r => Object.keys(r).some(k => k !== "English_Word" && r[k]));
      if (validRows.length === 0) throw new DataValidationError("CRITICAL: No valid rows in Swadesh list");

      // Select a random row and language column from the valid data using the daily seed.
      const row = getRandomItem(validRows, seed);
      if (!row) throw new DataValidationError("Failed to get a random row");

      const languageCol = getRandomItem(Object.keys(row).filter(k => k !== "English_Word" && row[k]), seed + 1);
      if (!languageCol) throw new DataValidationError("Failed to get a random language column");

      const languageName = languageCol.replace(/_/g, " ");

      logger.info(`Processing daily word for language: ${languageName}`);

      // Extract and parse the word, and get its English translation.
      const rawWord = row[languageCol];
      const parsedWord = parseWord(rawWord);
      const englishWord = row["English_Word"];

      // Find the language family for the selected language.
      const langInfo = familiesByLanguage.get(languageName);
      if (!langInfo || !langInfo.Language_Family) {
        throw new DataValidationError(`Data mismatch: Language info missing for '${languageName}'`);
      }
      const { Language_Family: languageFamily } = langInfo;

      const languageRegion = regionsByLanguage.get(languageName);
      const sameRegionFamilies = languageRegion ? familiesByRegion.get(languageRegion) || [] : [];
      const sameRegionLanguages = languageRegion ? languagesByRegion.get(languageRegion) || [] : [];


      // Find the language code and TTS voice info from the language codes CSV.
      const codeInfo = await findRowInCsv(path.join(dataPath, "LanguageCodes.csv"), c => !!c.Language && c.Language.trim() === languageName.trim());
      if (!codeInfo || !codeInfo.langCode) {
        throw new DataValidationError(`Data mismatch: Language code missing for '${languageName}'`);
      }
      const { langCode, googleTtsVoice } = codeInfo;

      // Attempt to generate Text-to-Speech audio if a native script and voice are available.
      let audioUrl = null;
      let audioContent: Buffer | null = null;

      // 1. Use Gemini Live API for specified languages.
      if (GEMINI_SUPPORTED_LANGS.includes(languageName)) {
        logger.info(`Using Gemini Live API for ${languageName}`);
        try {
          const wordToSay = GEMINI_LATIN_ONLY.includes(languageName) 
            ? parsedWord.transliteration 
            : (parsedWord.nativeScript || parsedWord.transliteration);
          
          // Use Yoruba for Igbo, Kinyarwanda for Lingala, Uzbek for Northern Uzbek, and Sindhi for Saraiki as they are unsupported by Gemini Live API.
          const effectiveLanguage = languageName ===
          "Igbo" ? "Yoruba" : languageName ===
          "Lingala" ? "Kinyarwanda" : languageName ===
          "Northern Uzbek" ? "Uzbek" : languageName ===
          "Saraiki" ? "Sindhi" : languageName;

          const chunks: Buffer[] = [];
          const session = await genAI.live.connect({
            model: "gemini-3.1-flash-live-preview",
            config: { responseModalities: ["AUDIO"] as any },
            callbacks: {
              onmessage: (message: any) => {
                const parts = message.serverContent?.modelTurn?.parts;
                if (parts) {
                  for (const part of parts) {
                    if (part.inlineData?.data) {
                      chunks.push(Buffer.from(part.inlineData.data, "base64"));
                    }
                  }
                }
              }
            }
          });

          session.sendRealtimeInput({
            text: `Say the word "${wordToSay}" in ${effectiveLanguage}. Output ONLY the audio of the word itself. No greeting, no explanation.`
          });

          await new Promise(resolve => setTimeout(resolve, 4000));
          session.close();

          if (chunks.length > 0) {
            const rawPcm = Buffer.concat(chunks);
            audioContent = await convertPcmToMp3(rawPcm);
            logger.info(`Gemini generated and converted audio for ${languageName}`);
          }
        } catch (err) {
          logger.error(`Gemini API failed for ${languageName}, trying TTS fallback.`, err);
        }
      }

      // 2. Fallback to Google Cloud TTS.
      if (!audioContent && googleTtsVoice) {
        try {
          const textToSynthesize = LATIN_ONLY.includes(languageName) ? parsedWord.transliteration : (parsedWord.nativeScript || parsedWord.transliteration);
          const ttsRequest = { 
            input: { text: textToSynthesize }, 
            voice: { name: googleTtsVoice, languageCode: langCode }, 
            audioConfig: { audioEncoding: "MP3" as const } 
          };
          const [ttsResponse] = await ttsClient.synthesizeSpeech(ttsRequest);
          if (ttsResponse.audioContent) {
            audioContent = Buffer.from(ttsResponse.audioContent);
          }
        } catch (ttsError) {
          // Wrap TTS errors in a custom error type for better diagnostics.
          throw new _TtsError(`Failed to generate TTS audio for "${parsedWord.nativeScript}" Error: ${ttsError instanceof Error ? ttsError.message : "Unknown TTS error"}`);
        }
      } else { logger.warn(`Skipping TTS generation: nativeScript: "${parsedWord.nativeScript}", googleTtsVoice: "${googleTtsVoice}"`); }

      // 3. Save the audio content.
      if (audioContent) {
        const bucket = getStorage().bucket();
        const fileName = `audio/${docId}/${parsedWord.transliteration || "audio"}.mp3`;
        const file = bucket.file(fileName);
        await file.save(audioContent, { metadata: { contentType: "audio/mpeg" }, public: true });
        audioUrl = file.publicUrl(); // Get the public URL of the saved audio file.
        logger.info(`Successfully stored audio at ${audioUrl}`);
      } else {
        throw new _TtsError(`TTS response for "${languageName}" did not contain audio content`);
      }

      // Generate distractor options for the language family quiz.
      const familyDistractors = shuffleArray(
        [...new Set(sameRegionFamilies.filter(f => f !== languageFamily))]
          .concat([...new Set(allFamilies.filter(f => f !== languageFamily))])
        , seed + 2).slice(0, 3);

      // Identify other languages that use the exact same word string.
      const duplicateWordLangs = Object.keys(row).filter(key => key !== "English_Word" && row[key] === rawWord).map(key => key.replace(/_/g, " "));
      // Get other languages from the same family.
      const sameFamilyLangs = languagesByFamily.get(languageFamily) || [];
      // Create distractors from the same family, excluding languages with the same word.
      const sameFamilyDistractors = sameFamilyLangs.filter(lang => !duplicateWordLangs.includes(lang) && lang !== languageName);
      // Create distractors from the same region, excluding languages with the same word.
      const sameRegionDistractors = sameRegionLanguages.filter(lang => !duplicateWordLangs.includes(lang) && lang !== languageName);

      // Create distractors from other families, excluding languages with the same word.
      const otherFamilyDistractors = allFamilies
        .filter(fam => fam !== languageFamily)
        .flatMap(fam => languagesByFamily.get(fam) || [])
        .filter(lang => !duplicateWordLangs.includes(lang) && lang !== languageName);

      // Combine and shuffle same-family and other-family distractors for the language quiz.
      const langDistractors = shuffleArray(
        [...new Set([...sameFamilyDistractors, ...sameRegionDistractors])]
        , seed + 3)
        .concat(shuffleArray([...new Set(otherFamilyDistractors)], seed + 3.1))
        .slice(0, 3);

      // Generate distractor options for the English translation quiz.
      const translationDistractors = shuffleArray(allEnglishWords.filter(w => w !== englishWord), seed + 4).slice(0, 3);

      // Validate that there are enough options for each quiz type to be meaningful.
      if ([...familyDistractors, languageFamily].length < 2 || [...langDistractors, languageName].length < 2 || [...translationDistractors, englishWord].length < 2) {
        throw new DataValidationError(`Insufficient distractors generated for language '${languageName}'`);
      }

      // Retrieve statistics for the chosen language, like speaker counts.
      const langStats = await findRowInCsv(path.join(dataPath, "LangStats.csv"), s => !!s.Language && s.Language.trim() === languageName.trim()) || {};

      // Set the final data for the daily word document in Firestore.
      await dailyWordRef.set({
        date: docId,
        word: { ...parsedWord, translation: englishWord, family: languageFamily, language: languageName, langCode: langCode },
        audioUrl,
        distractors: { family: familyDistractors, language: langDistractors, translation: translationDistractors },
        languageStats: { totalSpeakers: langStats["Total_Speakers"] || 0, countryWithMostSpeakers: langStats["Highest_Number_Speakers"] || "", speakersInCountry: langStats["Country_Speakers"] || 0 },
      });

      logger.info(`SUCCESS: Daily word for ${docId} has been seeded correctly`);
    } catch (error) {
      // Log any fatal errors that occurred during the seeding process.
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error(`FATAL ERROR in seedDailyWord: ${message}`, { fullError: error });
    }
  }
);