"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportsService = void 0;
const common_1 = require("@nestjs/common");
let ImportsService = class ImportsService {
    constructor() {
        this.jobs = [
            { id: 1, source: 'grls_2025_05_01.xml', status: 'completed', recordsProcessed: 1250, recordsFailed: 3, startedAt: '2025-05-01T02:00:00', completedAt: '2025-05-01T02:08:00', errorLog: '' },
            { id: 2, source: 'instructions_2025_05_01.html', status: 'completed', recordsProcessed: 1241, recordsFailed: 7, startedAt: '2025-05-01T02:10:00', completedAt: '2025-05-01T02:19:00', errorLog: '' },
            { id: 3, source: 'nlp_synonyms_2025_05_01.job', status: 'running', recordsProcessed: 812, recordsFailed: 0, startedAt: '2025-05-01T02:20:00', completedAt: null, errorLog: '' }
        ];
    }
    list() { return this.jobs; }
    run(source) { const id = this.jobs.length + 1; const job = { id, source, status: 'running', recordsProcessed: 0, recordsFailed: 0, startedAt: new Date().toISOString(), completedAt: null, errorLog: '' }; this.jobs.unshift(job); return { message: 'ETL import started', job }; }
};
exports.ImportsService = ImportsService;
exports.ImportsService = ImportsService = __decorate([
    (0, common_1.Injectable)()
], ImportsService);
//# sourceMappingURL=imports.service.js.map