import { ImportsService } from './imports.service';
export declare class ImportsController {
    private readonly service;
    constructor(service: ImportsService);
    list(): ({
        id: number;
        source: string;
        status: string;
        recordsProcessed: number;
        recordsFailed: number;
        startedAt: string;
        completedAt: string;
        errorLog: string;
    } | {
        id: number;
        source: string;
        status: string;
        recordsProcessed: number;
        recordsFailed: number;
        startedAt: string;
        completedAt: null;
        errorLog: string;
    })[];
    run(body: {
        source: string;
    }): {
        message: string;
        job: {
            id: number;
            source: string;
            status: string;
            recordsProcessed: number;
            recordsFailed: number;
            startedAt: string;
            completedAt: null;
            errorLog: string;
        };
    };
}
