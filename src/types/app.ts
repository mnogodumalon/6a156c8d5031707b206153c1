// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Reise {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    reiseziel?: string;
    reisebeginn?: string; // Format: YYYY-MM-DD oder ISO String
    reiseende?: string; // Format: YYYY-MM-DD oder ISO String
    anzahl_reisende?: number;
    gesamtbudget?: number;
    waehrung?: LookupValue;
    notizen?: string;
  };
}

export interface Kategorie {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kategoriename?: string;
    kategorie_beschreibung?: string;
    kategorie_icon?: LookupValue;
  };
}

export interface Budgetposten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    reise?: string; // applookup -> URL zu 'Reise' Record
    kategorie?: string; // applookup -> URL zu 'Kategorie' Record
    geplanter_betrag?: number;
    prioritaet?: LookupValue;
    budgetposten_notiz?: string;
  };
}

export interface Ausgabe {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    ausgabe_kategorie?: string; // applookup -> URL zu 'Kategorie' Record
    ausgabe_betrag?: number;
    ausgabe_datum?: string; // Format: YYYY-MM-DD oder ISO String
    ausgabe_beschreibung?: string;
    zahlungsmethode?: LookupValue;
    beleg?: string;
    ausgabe_notiz?: string;
    ausgabe_reise?: string; // applookup -> URL zu 'Reise' Record
  };
}

export const APP_IDS = {
  REISE: '6a156c72cca2612665962e67',
  KATEGORIE: '6a156c77458df5384d2f2876',
  BUDGETPOSTEN: '6a156c78ee9b9e72eca1f82e',
  AUSGABE: '6a156c7a28f199a3c226f897',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'reise': {
    waehrung: [{ key: "usd", label: "US-Dollar ($)" }, { key: "gbp", label: "Britisches Pfund (£)" }, { key: "chf", label: "Schweizer Franken (CHF)" }, { key: "jpy", label: "Japanischer Yen (¥)" }, { key: "sonstige", label: "Sonstige" }, { key: "eur", label: "Euro (€)" }],
  },
  'kategorie': {
    kategorie_icon: [{ key: "unterkunft", label: "🏨 Unterkunft" }, { key: "flug", label: "✈️ Flug" }, { key: "essen", label: "🍽️ Essen & Trinken" }, { key: "transport", label: "🚌 Transport" }, { key: "aktivitaeten", label: "🎭 Aktivitäten & Freizeit" }, { key: "shopping", label: "🛍️ Shopping" }, { key: "gesundheit", label: "💊 Gesundheit" }, { key: "sonstiges", label: "📋 Sonstiges" }],
  },
  'budgetposten': {
    prioritaet: [{ key: "hoch", label: "Hoch" }, { key: "mittel", label: "Mittel" }, { key: "niedrig", label: "Niedrig" }],
  },
  'ausgabe': {
    zahlungsmethode: [{ key: "kreditkarte", label: "Kreditkarte" }, { key: "ec_karte", label: "EC-Karte" }, { key: "paypal", label: "PayPal" }, { key: "sonstige", label: "Sonstige" }, { key: "bargeld", label: "Bargeld" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'reise': {
    'reiseziel': 'string/text',
    'reisebeginn': 'date/date',
    'reiseende': 'date/date',
    'anzahl_reisende': 'number',
    'gesamtbudget': 'number',
    'waehrung': 'lookup/select',
    'notizen': 'string/textarea',
  },
  'kategorie': {
    'kategoriename': 'string/text',
    'kategorie_beschreibung': 'string/textarea',
    'kategorie_icon': 'lookup/select',
  },
  'budgetposten': {
    'reise': 'applookup/select',
    'kategorie': 'applookup/select',
    'geplanter_betrag': 'number',
    'prioritaet': 'lookup/radio',
    'budgetposten_notiz': 'string/textarea',
  },
  'ausgabe': {
    'ausgabe_kategorie': 'applookup/select',
    'ausgabe_betrag': 'number',
    'ausgabe_datum': 'date/date',
    'ausgabe_beschreibung': 'string/text',
    'zahlungsmethode': 'lookup/select',
    'beleg': 'file',
    'ausgabe_notiz': 'string/textarea',
    'ausgabe_reise': 'applookup/select',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateReise = StripLookup<Reise['fields']>;
export type CreateKategorie = StripLookup<Kategorie['fields']>;
export type CreateBudgetposten = StripLookup<Budgetposten['fields']>;
export type CreateAusgabe = StripLookup<Ausgabe['fields']>;