/// <reference path="../../../shared/types/env.d.ts" />
'use client';

import wordCsv from '@/shared/data/MultiLangSwadesh.csv?raw';
import familiesCsv from '@/shared/data/MultiLangFamilies.csv?raw';
import langCodesCsv from '@/shared/data/LanguageCodes.csv?raw';
import langStatsCsv from '@/shared/data/LangStats.csv?raw';
import regionsCsv from '@/shared/data/MultiLangRegions.csv?raw';
import familyRegionsCsv from '@/shared/data/LangFamilyRegions.csv?raw';
import scoreMessages from '@/shared/data/score-messages.json';

type ProcessedWordRecord = {
  language: string;
  nativeScript: string;
  transliteration: string;
  translation: string;
};
type FamilyRecord = { language: string; family: string };
type LanguageCodeRecord = { language: string; langCode: string };
type LanguageStatsRecord = {
  language: string;
  totalSpeakers: string;
  highestNumberSpeakers: string;
  countrySpeakers: string;
};
type RegionRecord = { language: string; region: string };
type FamilyRegionRecord = { family: string; region: string };

type ScoreMessages = Record<number, string>;
export type CachedData = {
  words: ProcessedWordRecord[];
  familiesMap: Map<string, FamilyRecord>;
  langCodesMap: Map<string, LanguageCodeRecord>;
  langStatsMap: Map<string, LanguageStatsRecord>;
  languagesByFamilyMap: Map<string, string[]>;
  ambiguousWordsMap: Map<string, Map<string, string[]>>;
  regionsByLanguage: Map<string, string>;
  languagesByRegion: Map<string, string[]>;
  regionsByFamily: Map<string, string[]>;
  familiesByRegion: Map<string, string[]>;
  allFamilies: string[];
  allLanguages: string[];
  allTranslations: string[];
  scoreMessages: ScoreMessages;
};

// Generic CSV parser for client-side text content.
const parseCsv = <T>(csvText: string, parser: (parts: string[]) => T | null): T[] => {
  return csvText
    .trim()
    .split('\r\n')
    .slice(1) // Skip header row.
    .map(line => {
      if (!line.trim()) return null;
      const parts = line.split(',');
      return parser(parts);
    })
    .filter((item): item is T => item !== null);
};

// Loads, processes, and caches all data required for the offline quiz.
export const processAndCacheData = async (): Promise<CachedData> => {
    try {
      const familiesData = parseCsv(familiesCsv, ([lang, fam]) => ({ language: lang.trim().replace(/_/g, ' '), family: fam.trim().replace(/_/g, ' ') }));
      const langCodesData = parseCsv(langCodesCsv, ([lang, code]) => ({ language: lang.trim().replace(/_/g, ' '), langCode: code.trim() }));
      const langStatsData = parseCsv(langStatsCsv, ([lang, total, highest, country]) => ({
        language: lang.trim().replace(/_/g, ' '),
        totalSpeakers: total.trim(),
        highestNumberSpeakers: highest.trim().replace(/_/g, ' '),
        countrySpeakers: country.trim(),
      }));
      const regionsData: RegionRecord[] = parseCsv(regionsCsv, ([lang, reg]) => ({ language: lang.trim().replace(/_/g, ' '), region: reg.trim().replace(/_/g, ' ') }));
      const familyRegionsData: FamilyRegionRecord[] = parseCsv(familyRegionsCsv, ([fam, reg]) => ({ family: fam.trim().replace(/_/g, ' '), region: reg.trim().replace(/_/g, ' ') }));

      const words: ProcessedWordRecord[] = [];
      const wordLines = wordCsv.trim().split('\r\n');
      const header = wordLines[0].split(',').map((h: string) => h.trim().replace(/_/g, ' '));
      for (const line of wordLines.slice(1)) {
        if (!line.trim()) continue;
        const row = line.split(',');
        const translation = row[0]?.trim().replace(/_/g, ' ');
        if (!translation) continue;
        for (let j = 1; j < header.length; j++) {
          const language = header[j]?.trim();
          const wordCell = row[j]?.trim();
          if (!language || !wordCell) continue;

          const match = wordCell.match(/(.+?)\s*\((.+)\)/);
          const [nativeScript, transliteration] = match ? [match[1].trim(), match[2].trim()] : [wordCell, wordCell];
          words.push({ language, nativeScript, transliteration, translation });
        }
      }

      const languagesByFamilyMap = new Map<string, string[]>();
      familiesData.forEach(record => {
        if (!languagesByFamilyMap.has(record.family)) languagesByFamilyMap.set(record.family, []);
        languagesByFamilyMap.get(record.family)!.push(record.language);
      });

      const ambiguousWordsMap = new Map<string, Map<string, string[]>>();
      words.forEach(word => {
        const transMap = ambiguousWordsMap.get(word.translation) ?? new Map<string, string[]>();
        const langList = transMap.get(word.transliteration) ?? [];
        langList.push(word.language);
        transMap.set(word.transliteration, langList);
        ambiguousWordsMap.set(word.translation, transMap);
      });

      const regionsByLanguage = new Map<string, string>();
      const languagesByRegion = new Map<string, string[]>();
      regionsData.forEach(record => {
        regionsByLanguage.set(record.language, record.region);
        if (!languagesByRegion.has(record.region)) languagesByRegion.set(record.region, []);
        languagesByRegion.get(record.region)!.push(record.language);
      });

      const regionsByFamily = new Map<string, string[]>();
      const familiesByRegion = new Map<string, string[]>();
      familyRegionsData.forEach(record => {
        if (!regionsByFamily.has(record.family)) regionsByFamily.set(record.family, []);
        regionsByFamily.get(record.family)!.push(record.region);

        if (!familiesByRegion.has(record.region)) familiesByRegion.set(record.region, []);
        familiesByRegion.get(record.region)!.push(record.family);
      });
      
      const processed: CachedData = {
        words,
        familiesMap: new Map(familiesData.map(f => [f.language, f])),
        langCodesMap: new Map(langCodesData.map(lc => [lc.language, lc])),
        langStatsMap: new Map(langStatsData.map(ls => [ls.language, ls])),
        scoreMessages,
        allFamilies: [...new Set(familiesData.map(f => f.family))],
        allLanguages: [...new Set(familiesData.map(f => f.language))],
        allTranslations: [...new Set(words.map(w => w.translation))],
        languagesByFamilyMap,
        ambiguousWordsMap,
        regionsByLanguage,
        languagesByRegion,
        regionsByFamily,
        familiesByRegion,
      };
      
      return processed;
    } catch (e) {
        console.error('Failed to process and cache data', e);
        throw new Error('Failed to load offline data');
    }
};