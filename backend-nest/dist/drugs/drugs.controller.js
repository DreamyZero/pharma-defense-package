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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrugsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_decorator_1 = require("../auth/guards/roles.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
const drugs_service_1 = require("./drugs.service");
let DrugsController = class DrugsController {
    constructor(drugsService) {
        this.drugsService = drugsService;
    }
    dashboard() {
        return this.drugsService.dashboard();
    }
    catalog(req) {
        return this.drugsService.catalog();
    }
    search(q = '', req) {
        return this.drugsService.search(q, req.user?.userId, req.ip);
    }
    getBySlug(slug, req) {
        return this.drugsService.getBySlug(slug, req.user?.userId, req.ip);
    }
    analogs(name, req) {
        return this.drugsService.analogs(name, req.user?.userId, req.ip);
    }
    interactions(body, req) {
        return this.drugsService.interactions(body.items || [], req.user?.userId, req.ip);
    }
    contra(body, req) {
        return this.drugsService.contra(body.drug, body.age, body.context, req.user?.userId, req.ip);
    }
};
exports.DrugsController = DrugsController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Метрики дашборда' }),
    (0, common_1.Get)('dashboard'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], DrugsController.prototype, "dashboard", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Каталог препаратов (PHARMACIST, DOCTOR, ADMIN)' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('PHARMACIST', 'DOCTOR', 'ADMIN'),
    (0, common_1.Get)('drugs/catalog'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], DrugsController.prototype, "catalog", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Поиск препаратов по названию или веществу (PHARMACIST, DOCTOR, ADMIN)' }),
    (0, swagger_1.ApiQuery)({ name: 'q', required: true, example: 'аспирин' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('PHARMACIST', 'DOCTOR', 'ADMIN'),
    (0, common_1.Get)('drugs/search'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DrugsController.prototype, "search", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Детальная карточка препарата по slug (PHARMACIST, DOCTOR, ADMIN)' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('PHARMACIST', 'DOCTOR', 'ADMIN'),
    (0, common_1.Get)('drugs/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DrugsController.prototype, "getBySlug", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Аналоги препарата (PHARMACIST, DOCTOR, ADMIN)' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('PHARMACIST', 'DOCTOR', 'ADMIN'),
    (0, common_1.Get)('analogs/:name'),
    __param(0, (0, common_1.Param)('name')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DrugsController.prototype, "analogs", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Проверка взаимодействий списка препаратов (DOCTOR, ADMIN)' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DOCTOR', 'ADMIN'),
    (0, common_1.Post)('interactions/check'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DrugsController.prototype, "interactions", null);
__decorate([
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Проверка противопоказаний (DOCTOR, ADMIN)' }),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('DOCTOR', 'ADMIN'),
    (0, common_1.Post)('contra/check'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], DrugsController.prototype, "contra", null);
exports.DrugsController = DrugsController = __decorate([
    (0, swagger_1.ApiTags)('drugs'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [drugs_service_1.DrugsService])
], DrugsController);
//# sourceMappingURL=drugs.controller.js.map