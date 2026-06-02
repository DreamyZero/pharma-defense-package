export declare const drugs: {
    id: number;
    name: string;
    substance: string;
    atc: string;
    group: string;
    indications: string[];
    contraindications: string[];
    sideEffects: string[];
    analogs: string[];
    synonyms: string[];
    interactions: {
        with: string;
        risk: string;
        note: string;
    }[];
}[];
