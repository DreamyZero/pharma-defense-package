"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ImportsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportsService = void 0;
const common_1 = require("@nestjs/common");
const fs_1 = require("fs");
const path_1 = require("path");
const prisma_service_1 = require("../database/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let ImportsService = ImportsService_1 = class ImportsService {
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
        this.logger = new common_1.Logger(ImportsService_1.name);
    }
    list() {
        return this.prisma.drugImport.findMany({
            take: 30,
            orderBy: { createdAt: 'desc' },
            include: { creator: { select: { email: true } } },
        });
    }
    async run(source, userId, ipAddress) {
        const job = await this.prisma.drugImport.create({
            data: {
                source,
                status: 'RUNNING',
                recordsProcessed: 0,
                recordsFailed: 0,
                startedAt: new Date(),
                createdBy: userId ?? null,
            },
        });
        const auditEntry = await this.audit.log({
            userId,
            action: 'ETL_RUN',
            entityType: 'DrugImport',
            entityId: String(job.id),
            newValues: { source, jobId: job.id },
            ipAddress,
        });
        await this.prisma.drugImport.update({
            where: { id: job.id },
            data: { auditId: auditEntry.id },
        });
        return { message: 'ETL import started', job: { ...job, auditId: auditEntry.id } };
    }
    getEtlStatus() {
        const statusPath = (0, path_1.join)(__dirname, '..', '..', '..', '..', 'etl', 'output', 'etl_status.json');
        try {
            const raw = (0, fs_1.readFileSync)(statusPath, 'utf-8');
            return JSON.parse(raw);
        }
        catch (err) {
            this.logger.warn(`etl_status.json не найден: ${err.message}`);
            return {
                status: 'never_run',
                error: 'etl_status.json не найден. Запустите: cd etl/src && python run_etl.py',
            };
        }
    }
};
exports.ImportsService = ImportsService;
exports.ImportsService = ImportsService = ImportsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], ImportsService);
//# sourceMappingURL=imports.service.js.map