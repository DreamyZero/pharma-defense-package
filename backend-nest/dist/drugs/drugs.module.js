"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrugsModule = void 0;
const common_1 = require("@nestjs/common");
const drugs_controller_1 = require("./drugs.controller");
const drugs_service_1 = require("./drugs.service");
const pharma_repository_1 = require("../domain/pharma.repository");
const audit_module_1 = require("../audit/audit.module");
let DrugsModule = class DrugsModule {
};
exports.DrugsModule = DrugsModule;
exports.DrugsModule = DrugsModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule],
        controllers: [drugs_controller_1.DrugsController],
        providers: [drugs_service_1.DrugsService, pharma_repository_1.PharmaRepository],
    })
], DrugsModule);
//# sourceMappingURL=drugs.module.js.map