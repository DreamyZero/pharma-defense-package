import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { PharmaRepository } from '../domain/pharma.repository';
export declare class DrugsService {
    private repo;
    private prisma;
    private readonly logger;
    constructor(repo: PharmaRepository, prisma: PrismaService);
    private localBySlug;
    private localByName;
    private enrichDrugDetail;
    private catalogInclude;
    private isCompleteCatalogDrug;
    catalog(): Promise<({
        substances: ({
            substance: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                latinName: string | null;
            };
        } & {
            drugId: number;
            substanceId: number;
            strengthValue: Prisma.Decimal | null;
            strengthUnit: string | null;
            isPrimary: boolean;
        })[];
        indications: {
            id: number;
            createdAt: Date;
            name: string;
            drugId: number;
        }[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        dosageForm: string | null;
        manufacturer: string | null;
        atcCode: string | null;
        pharmacologicalGroup: string | null;
        registrationNumber: string | null;
        rxRequired: boolean;
        description: string | null;
        instructionMeta: Prisma.JsonValue | null;
        active: boolean;
    })[] | {
        id: number;
        name: string;
        slug: string;
        atcCode: string;
        manufacturer: string;
        pharmacologicalGroup: string;
        dosageForm: string;
        substances: {
            substance: {
                name: string;
            };
        }[];
        indications: {
            name: string;
        }[];
    }[]>;
    search(q: string): Promise<({
        substances: ({
            substance: {
                id: number;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                latinName: string | null;
            };
        } & {
            drugId: number;
            substanceId: number;
            strengthValue: Prisma.Decimal | null;
            strengthUnit: string | null;
            isPrimary: boolean;
        })[];
        indications: {
            id: number;
            createdAt: Date;
            name: string;
            drugId: number;
        }[];
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        dosageForm: string | null;
        manufacturer: string | null;
        atcCode: string | null;
        pharmacologicalGroup: string | null;
        registrationNumber: string | null;
        rxRequired: boolean;
        description: string | null;
        instructionMeta: Prisma.JsonValue | null;
        active: boolean;
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
    interactions(items: string[]): Promise<any[]>;
    contra(drug: string, age: number, context: string): Promise<{
        drug: string;
        warnings: string[];
        source: string;
    } | {
        drug: null;
        warnings: never[];
        source?: undefined;
    }>;
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
}
