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
exports.ImportsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const imports_service_1 = require("./imports.service");
let ImportsController = class ImportsController {
    constructor(importsService) {
        this.importsService = importsService;
    }
    list() {
        return this.importsService.list();
    }
    async run(body, req) {
        return this.importsService.run(body.source, req.user?.id);
    }
};
exports.ImportsController = ImportsController;
__decorate([
    (0, roles_guard_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Список импортов (только ADMIN)' }),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "list", null);
__decorate([
    (0, roles_guard_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Запустить ETL импорт (только ADMIN)' }),
    (0, common_1.Post)('run'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ImportsController.prototype, "run", null);
exports.ImportsController = ImportsController = __decorate([
    (0, swagger_1.ApiTags)('imports'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('imports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [imports_service_1.ImportsService])
], ImportsController);
//# sourceMappingURL=imports.controller.js.map