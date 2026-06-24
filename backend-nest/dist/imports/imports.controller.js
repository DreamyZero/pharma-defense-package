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
const roles_decorator_1 = require("../auth/guards/roles.decorator");
const roles_guard_1 = require("../auth/guards/roles.guard");
const imports_service_1 = require("./imports.service");
let ImportsController = class ImportsController {
    constructor(importsService) {
        this.importsService = importsService;
    }
    list() {
        return this.importsService.list();
    }
    clear(req) {
        return this.importsService.clearImports(req.user?.userId, req.ip);
    }
    run(body, req) {
        return this.importsService.run(body.source || 'manual_demo_job', req.user?.userId, req.ip);
    }
    syncReport() {
        return this.importsService.syncFromFilesystem();
    }
    getStatus() {
        return this.importsService.getEtlStatus();
    }
    getReport() {
        return this.importsService.getEtlReport();
    }
    getReportHtml() {
        return this.importsService.getEtlReportHtml();
    }
    getReportCsv() {
        return this.importsService.getEtlReportCsv();
    }
};
exports.ImportsController = ImportsController;
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Список импортов (только ADMIN)' }),
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "list", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Очистить журнал импортов (только ADMIN)' }),
    (0, common_1.Delete)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "clear", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Запустить ETL импорт (только ADMIN)' }),
    (0, common_1.Post)('run'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "run", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Синхронизировать отчёт ETL из etl/output' }),
    (0, common_1.Post)('sync'),
    (0, common_1.HttpCode)(200),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "syncReport", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Статус последнего ETL (etl_status.json)' }),
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "getStatus", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'Сводный отчёт ETL (JSON)' }),
    (0, common_1.Get)('report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "getReport", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'HTML-отчёт ETL (demo_report.html)' }),
    (0, common_1.Get)('report/html'),
    (0, common_1.Header)('Content-Type', 'text/html; charset=utf-8'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "getReportHtml", null);
__decorate([
    (0, roles_decorator_1.Roles)('ADMIN'),
    (0, swagger_1.ApiOperation)({ summary: 'CSV-отчёт ETL (etl_report.csv)' }),
    (0, common_1.Get)('report/csv'),
    (0, common_1.Header)('Content-Type', 'text/csv; charset=utf-8'),
    (0, common_1.Header)('Content-Disposition', 'attachment; filename="etl_report.csv"'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ImportsController.prototype, "getReportCsv", null);
exports.ImportsController = ImportsController = __decorate([
    (0, swagger_1.ApiTags)('imports'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('imports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [imports_service_1.ImportsService])
], ImportsController);
//# sourceMappingURL=imports.controller.js.map