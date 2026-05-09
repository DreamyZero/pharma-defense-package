"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PharmaRepository = void 0;
const common_1 = require("@nestjs/common");
const pharma_data_1 = require("./pharma.data");
let PharmaRepository = class PharmaRepository {
    norm(v) { return v.trim().toLowerCase(); }
    all() { return pharma_data_1.drugs; }
    search(q) { const n = this.norm(q); return pharma_data_1.drugs.filter(d => this.norm(d.name).includes(n) || this.norm(d.substance).includes(n) || d.indications.some(i => this.norm(i).includes(n)) || d.synonyms.some(s => this.norm(s).includes(n)) || this.norm(d.group).includes(n)); }
    byName(name) { const n = this.norm(name); return pharma_data_1.drugs.find(d => this.norm(d.name) === n || this.norm(d.substance) === n || d.synonyms.some(s => this.norm(s) === n)); }
};
exports.PharmaRepository = PharmaRepository;
exports.PharmaRepository = PharmaRepository = __decorate([
    (0, common_1.Injectable)()
], PharmaRepository);
//# sourceMappingURL=pharma.repository.js.map