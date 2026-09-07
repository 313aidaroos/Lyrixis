export interface WordTiming {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
  lineIndex: number;
}

export interface TranscribedLine {
  text: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface TranscriptionResult {
  text: string;
  lines: TranscribedLine[];
  words: WordTiming[];
  language: string;
  languageConfidence: number;
  /** Real cost from provider usage (duration actually sent × published rate). Never a forecast. */
  costCents: number;
  provider: string;
  usage: {
    durationSeconds: number;
    centsPerMinute: number;
  };
}

export interface TranscriptionProvider {
  name: string;
  transcribe(input: {
    audioPath: string;
    languageHint?: string;
  }): Promise<TranscriptionResult>;
}

export interface AlignmentResult {
  words: WordTiming[];
  costCents: number;
  provider: string;
}

export interface AlignmentProvider {
  name: string;
  align(input: {
    audioPath: string;
    lines: string[];
  }): Promise<AlignmentResult>;
}

export interface LanguageResult {
  language: string;
  dialect?: string;
  confidence: number;
  dialectConfidence?: number;
  costCents: number;
  provider: string;
}

export interface LanguageProvider {
  name: string;
  detect(input: {
    audioPath: string;
    languageHint?: string;
    prior?: { language: string; confidence: number };
  }): Promise<LanguageResult>;
}

export interface TranslationProvider {
  name: string;
  translate(input: {
    lines: string[];
    targetLanguage: string;
  }): Promise<{ lines: string[]; costCents: number }>;
}

export interface Section {
  label: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface Region {
  startMs: number;
  endMs: number;
}

export interface AudioAnalysisProvider {
  name: string;
  analyze(input: {
    audioPath: string;
  }): Promise<{ sections: Section[]; vocalRegions: Region[]; costCents: number }>;
}
