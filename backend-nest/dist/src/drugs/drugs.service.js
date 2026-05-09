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
exports.DrugsService = void 0;
const common_1 = require("@nestjs/common");
const pharma_repository_1 = require("../domain/pharma.repository");
let DrugsService = class DrugsService {
    constructor(repo) {
        this.repo = repo;
    }
    search(q) { return this.repo.search(q); }
    getByName(name) { return this.repo.byName(name); }
    analogs(name) { const drug = this.repo.byName(name); return { drug: drug?.name || null, analogs: drug?.analogs || [] }; }
    interactions(items) { return items.flatMap((a, i) => items.slice(i + 1).map(b => { const da = this.repo.byName(a); const db = this.repo.byName(b); const hit = da?.interactions.find((x) => x.with === db?.name) || db?.interactions.find((x) => x.with === da?.name); return { a: da?.name || a, b: db?.name || b, risk: hit?.risk || 'low', note: hit?.note || 'Значимое взаимодействие не найдено' }; })); }
    contra(drug, age, context) { const item = this.repo.byName(drug); const warnings = []; if (!item)
        return { drug: null, warnings }; if (age < 18 && item.contraindications.includes('детский возраст'))
        warnings.push('Противопоказан в детском возрасте'); if (context === 'pregnancy' && item.contraindications.includes('беременность'))
        warnings.push('Противопоказан при беременности'); if (context === 'renal' && item.contraindications.includes('почечная недостаточность'))
        warnings.push('Требует осторожности при почечной недостаточности'); if (context === 'ulcer' && item.contraindications.includes('язвенная болезнь'))
        warnings.push('Есть риск осложнений при язвенной болезни'); return { drug: item.name, warnings, source: 'repository' }; }
    dashboard() { return { metrics: [{ label: 'Препаратов в базе', value: '14 283', note: '+247 за месяц' }, { label: 'Действующих веществ', value: '3 841', note: 'Синонимов: 9 124' }, { label: 'Взаимодействий в графе', value: '28 654', note: 'HIGH: 4 201' }, { label: 'Покрытие ГРЛС', value: '98%', note: 'Обновлено: 01.05.2025' }], recentQueries: [{ name: 'Аспирин', subtitle: 'Ацетилсалициловая кислота · C01EB02', time: '12:34' }, { name: 'Метформин', subtitle: 'Метформина гидрохлорид · A10BA02', time: '11:20' }, { name: 'Лизиноприл', subtitle: 'Лизиноприл · C09AA03', time: '10:05' }] }; }
};
exports.DrugsService = DrugsService;
exports.DrugsService = DrugsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pharma_repository_1.PharmaRepository])
], DrugsService);
//# sourceMappingURL=drugs.service.js.map