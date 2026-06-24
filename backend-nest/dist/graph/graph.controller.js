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
exports.GraphController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const graph_service_1 = require("./graph.service");
let GraphController = class GraphController {
    constructor(graphService) {
        this.graphService = graphService;
    }
    fullGraph(limit = '30') {
        return this.graphService.getFullGraph(parseInt(limit, 10));
    }
    drugGraph(id) {
        return this.graphService.getDrugGraph(id);
    }
    interactionGraph(body) {
        return this.graphService.getInteractionGraph(body.drugs || []);
    }
    sync() {
        return this.graphService.syncFromPostgres();
    }
};
exports.GraphController = GraphController;
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Полный граф знаний (препараты, вещества, группы)' }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, example: 30 }),
    (0, common_1.Get)('full'),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GraphController.prototype, "fullGraph", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Граф соседей препарата (id, slug или название)' }),
    (0, common_1.Get)('drug/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GraphController.prototype, "drugGraph", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Граф взаимодействий для набора препаратов' }),
    (0, common_1.Post)('interactions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GraphController.prototype, "interactionGraph", null);
__decorate([
    (0, swagger_1.ApiOperation)({ summary: 'Синхронизировать Neo4j из PostgreSQL (только ADMIN)' }),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_guard_1.Roles)('ADMIN'),
    (0, common_1.Post)('sync'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GraphController.prototype, "sync", null);
exports.GraphController = GraphController = __decorate([
    (0, swagger_1.ApiTags)('graph'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('graph'),
    __metadata("design:paramtypes", [graph_service_1.GraphService])
], GraphController);
//# sourceMappingURL=graph.controller.js.map