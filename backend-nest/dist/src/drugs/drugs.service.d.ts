import { PrismaService } from '../database/prisma.service';
import { PharmaRepository } from '../domain/pharma.repository';
export declare class DrugsService {
    private repo;
    private prisma;
    constructor(repo: PharmaRepository, prisma: PrismaService);
    private localBySlug;
    private localByName;
    private enrichDrugDetail;
    search(q: string): Promise<({
        substances: ({
            substance: {
                name: string;
                id: number;
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
    } & {
        name: string;
        id: number;
        slug: string;
        dosageForm: string | null;
        manufacturer: string | null;
        atcCode: string | null;
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
            id: any;
            name: any;
            substances: any;
            confidence: number;
            reason: any;
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
