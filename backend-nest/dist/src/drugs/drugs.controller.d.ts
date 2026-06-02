import { DrugsService } from './drugs.service';
export declare class DrugsController {
    private readonly drugsService;
    constructor(drugsService: DrugsService);
    dashboard(): Promise<{
        isFallback: boolean;
        metrics: {
            label: string;
            value: string | number;
            note: string;
        }[];
        recentQueries: {
            name: string;
            subtitle: string;
            time: string;
        }[];
    }>;
    search(q?: string): Promise<({
        substances: ({
            substance: {
                id: number;
                name: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
                latinName: string | null;
            };
        } & {
            drugId: number;
            substanceId: number;
            strengthValue: import("@prisma/client/runtime/library").Decimal | null;
            strengthUnit: string | null;
            isPrimary: boolean;
        })[];
        indications: {
            id: number;
            name: string;
            createdAt: Date;
            drugId: number;
        }[];
    } & {
        slug: string;
        id: number;
        name: string;
        dosageForm: string | null;
        manufacturer: string | null;
        atcCode: string | null;
        pharmacologicalGroup: string | null;
        rxRequired: boolean;
        description: string | null;
        active: boolean;
        createdAt: Date;
        updatedAt: Date;
    })[] | {
        id: number;
        name: string;
        slug: string;
        atcCode: string;
        manufacturer: string;
        pharmacologicalGroup: string;
        substances: {
            substance: {
                name: string;
            };
        }[];
    }[]>;
    getBySlug(slug: string): Promise<any>;
    analogs(name: string): Promise<{
        drug: string;
        analogs: {
            id: number;
            name: string;
            substances: string[];
            confidence: number;
            reason: string;
        }[];
    }>;
    interactions(body: {
        items: string[];
    }): Promise<any[]>;
    contra(body: {
        drug: string;
        age: number;
        context: string;
    }): Promise<{
        drug: string;
        warnings: string[];
        source: string;
    } | {
        drug: null;
        warnings: never[];
        source?: undefined;
    }>;
}
