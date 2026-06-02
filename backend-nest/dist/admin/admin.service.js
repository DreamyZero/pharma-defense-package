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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const prisma_service_1 = require("../database/prisma.service");
let AdminService = class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    users() {
        return this.prisma.user.findMany({
            select: { id: true, fullName: true, email: true, role: true, organization: true, verified: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    audit() {
        return this.prisma.auditLog.findMany({
            take: 50,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { email: true, fullName: true } } },
        });
    }
    etl() {
        return this.prisma.drugImport.findMany({
            take: 30,
            orderBy: { createdAt: 'desc' },
            include: { creator: { select: { email: true } } },
        });
    }
    async setRole(userId, role) {
        return this.prisma.user.update({
            where: { id: userId },
            data: { role: role },
            select: { id: true, email: true, role: true },
        });
    }
    async updateUser(userId, dto) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        if (dto.email && dto.email !== user.email) {
            const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
            if (exists)
                throw new common_1.ConflictException('Email уже занят');
        }
        const data = {};
        if (dto.email)
            data.email = dto.email;
        if (dto.password)
            data.passwordHash = await bcrypt.hash(dto.password, 10);
        if (!data.email && !data.passwordHash) {
            return this.users().then(list => list.find(u => u.id === userId));
        }
        return this.prisma.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                organization: true,
                verified: true,
                createdAt: true,
            },
        });
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map