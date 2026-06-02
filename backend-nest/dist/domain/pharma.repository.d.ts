export declare class PharmaRepository {
    private norm;
    all(): {
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
    search(q: string): {
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
    byName(name: string): {
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
    } | undefined;
}
