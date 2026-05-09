import { PharmaRepository } from '../domain/pharma.repository';
export declare class DrugsService {
    private repo;
    constructor(repo: PharmaRepository);
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
    getByName(name: string): {
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
    analogs(name: string): {
        drug: string | null;
        analogs: string[];
    };
    interactions(items: string[]): {
        a: string;
        b: string;
        risk: string;
        note: string;
    }[];
    contra(drug: string, age: number, context: string): {
        drug: null;
        warnings: string[];
        source?: undefined;
    } | {
        drug: string;
        warnings: string[];
        source: string;
    };
    dashboard(): {
        metrics: {
            label: string;
            value: string;
            note: string;
        }[];
        recentQueries: {
            name: string;
            subtitle: string;
            time: string;
        }[];
    };
}
