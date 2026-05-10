import { PrismaService } from '../database/prisma.service';
import { PharmaRepository } from '../domain/pharma.repository';
export declare class DrugsService {
    private repo;
    private prisma;
    constructor(repo: PharmaRepository, prisma: PrismaService);
    search(q: string): Promise<{
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
    }[] | ({
        substances: ({
            substance: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                latinName: string | null;
                description: string | null;
            };
        } & {
            substanceId: number;
            drugId: number;
            strengthValue: import("@prisma/client/runtime/library").Decimal | null;
            strengthUnit: string | null;
            isPrimary: boolean;
        })[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        dosageForm: string | null;
        manufacturer: string | null;
        atcCode: string | null;
        rxRequired: boolean;
        active: boolean;
    })[]>;
    getBySlug(slug: string): Promise<({
        interactionA: ({
            drugB: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                slug: string;
                dosageForm: string | null;
                manufacturer: string | null;
                atcCode: string | null;
                rxRequired: boolean;
                active: boolean;
            };
        } & {
            id: number;
            createdAt: Date;
            source: string | null;
            drugAId: number;
            drugBId: number;
            severity: import(".prisma/client").$Enums.InteractionSeverity;
            mechanism: string | null;
            clinicalEffect: string | null;
            recommendation: string | null;
        })[];
        interactionB: ({
            drugA: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                slug: string;
                dosageForm: string | null;
                manufacturer: string | null;
                atcCode: string | null;
                rxRequired: boolean;
                active: boolean;
            };
        } & {
            id: number;
            createdAt: Date;
            source: string | null;
            drugAId: number;
            drugBId: number;
            severity: import(".prisma/client").$Enums.InteractionSeverity;
            mechanism: string | null;
            clinicalEffect: string | null;
            recommendation: string | null;
        })[];
        substances: ({
            substance: {
                synonymLinks: {
                    id: number;
                    createdAt: Date;
                    substanceId: number;
                    synonym: string;
                }[];
            } & {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                latinName: string | null;
                description: string | null;
            };
        } & {
            substanceId: number;
            drugId: number;
            strengthValue: import("@prisma/client/runtime/library").Decimal | null;
            strengthUnit: string | null;
            isPrimary: boolean;
        })[];
        analogsFrom: ({
            targetDrug: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                slug: string;
                dosageForm: string | null;
                manufacturer: string | null;
                atcCode: string | null;
                rxRequired: boolean;
                active: boolean;
            };
        } & {
            id: number;
            createdAt: Date;
            sourceDrugId: number;
            targetDrugId: number;
            reason: string | null;
            confidence: number | null;
        })[];
        contraindications: {
            id: number;
            createdAt: Date;
            drugId: number;
            severity: string | null;
            minAge: number | null;
            condition: string;
            maxAge: number | null;
            context: string | null;
            note: string | null;
        }[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        slug: string;
        dosageForm: string | null;
        manufacturer: string | null;
        atcCode: string | null;
        rxRequired: boolean;
        active: boolean;
    }) | null>;
    analogs(name: string): Promise<{
        drug: string;
        analogs: {
            id: number;
            name: string;
            substances: string[];
            confidence: number | null;
            reason: string | null;
        }[];
    } | {
        drug: string | null;
        analogs: string[];
    }>;
    interactions(items: string[]): Promise<any[]>;
    contra(drug: string, age: number, context: string): Promise<{
        drug: string;
        warnings: string[];
        source: string;
    } | {
        drug: null;
        warnings: string[];
        source?: undefined;
    }>;
    dashboard(): Promise<{
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
}
