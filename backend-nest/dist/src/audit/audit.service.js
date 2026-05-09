"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
let AuditService = class AuditService {
    constructor() {
        this.rows = [
            { time: '2025-05-01T02:00:00', user: 'admin@pharma.local', action: 'IMPORT_START', entity: 'DrugImport', ip: '127.0.0.1' },
            { time: '2025-05-01T02:08:00', user: 'admin@pharma.local', action: 'IMPORT_COMPLETE', entity: 'DrugImport', ip: '127.0.0.1' },
            { time: '2025-05-01T11:30:00', user: 'doctor@pharma.local', action: 'SEARCH', entity: 'Drug', ip: '127.0.0.1' }
        ];
    }
    list() { return this.rows; }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)()
], AuditService);
//# sourceMappingURL=audit.service.js.map