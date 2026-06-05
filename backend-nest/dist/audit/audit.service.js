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
var AuditService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma.service");
let AuditService = AuditService_1 = class AuditService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(AuditService_1.name);
    }
    async list(take = 100) {
        const rows = await this.prisma.auditLog.findMany({
            take,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { id: true, email: true, fullName: true } } },
        });
        return rows.map(row => ({
            time: row.createdAt.toISOString(),
            user: row.user?.email ?? row.user?.fullName ?? '—',
            action: row.action,
            entity: [row.entityType, row.entityId].filter(Boolean).join(':') || '—',
            ip: row.ipAddress ?? '—',
        }));
    }
    async log(data) {
        try {
            return await this.prisma.auditLog.create({ data });
        }
        catch (err) {
            this.logger.error(`Не удалось записать аудит (${data.action}): ${err.message}`, err.stack);
            throw err;
        }
    }
    async logSafe(data) {
        try {
            await this.log(data);
        }
        catch {
        }
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = AuditService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map