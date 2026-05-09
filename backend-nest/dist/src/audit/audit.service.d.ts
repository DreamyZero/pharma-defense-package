export declare class AuditService {
    private rows;
    list(): {
        time: string;
        user: string;
        action: string;
        entity: string;
        ip: string;
    }[];
}
