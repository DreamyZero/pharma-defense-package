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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const prisma_service_1 = require("../database/prisma.service");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async me(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: { id: true, fullName: true, email: true, role: true, organization: true, verified: true, createdAt: true },
        });
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        return user;
    }
    async update(id, dto) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user)
            throw new common_1.NotFoundException('Пользователь не найден');
        if (dto.email && dto.email !== user.email) {
            const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
            if (exists)
                throw new common_1.ConflictException('Email уже занят');
        }
        const data = {};
        if (dto.fullName !== undefined)
            data.fullName = dto.fullName;
        if (dto.organization !== undefined)
            data.organization = dto.organization;
        if (dto.email)
            data.email = dto.email;
        if (dto.password)
            data.passwordHash = await bcrypt.hash(dto.password, 10);
        return this.prisma.user.update({
            where: { id },
            data,
            select: { id: true, fullName: true, email: true, role: true, organization: true, verified: true, createdAt: true },
        });
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map