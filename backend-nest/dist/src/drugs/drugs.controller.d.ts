import { DrugsService } from './drugs.service';
export declare class DrugsController {
    private readonly drugsService;
    constructor(drugsService: DrugsService);
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
    search(q?: string): {
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
    analogs(name: string): {
        drug: string | null;
        analogs: string[];
    };
    interactions(body: {
        items: string[];
    }): {
        a: string;
        b: string;
        risk: string;
        note: string;
    }[];
    contra(body: {
        drug: string;
        age: number;
        context: string;
    }): {
        drug: null;
        warnings: string[];
        source?: undefined;
    } | {
        drug: string;
        warnings: string[];
        source: string;
    };
}
