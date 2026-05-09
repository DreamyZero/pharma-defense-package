import { AuditService } from './audit.service';
export declare class AuditController {
    private readonly service;
    constructor(service: AuditService);
    list(): {
        time: string;
        user: string;
        action: string;
        entity: string;
        ip: string;
    }[];
}
