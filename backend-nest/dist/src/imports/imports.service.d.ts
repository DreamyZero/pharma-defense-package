export declare class ImportsService {
    private jobs;
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
    run(source: string): {
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
