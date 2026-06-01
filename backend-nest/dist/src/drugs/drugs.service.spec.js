"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const drugs_service_1 = require("./drugs.service");
const prisma_service_1 = require("../database/prisma.service");
const pharma_repository_1 = require("../domain/pharma.repository");
const mockPrisma = {
    drug: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
    },
    substance: { count: jest.fn() },
    drugInteraction: {
        count: jest.fn(),
        findFirst: jest.fn(),
    },
};
const mockRepo = {
    search: jest.fn(),
};
describe('DrugsService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                drugs_service_1.DrugsService,
                { provide: prisma_service_1.PrismaService, useValue: mockPrisma },
                { provide: pharma_repository_1.PharmaRepository, useValue: mockRepo },
            ],
        }).compile();
        service = module.get(drugs_service_1.DrugsService);
        jest.clearAllMocks();
    });
    describe('search()', () => {
        it('возвращает пустой массив если запрос короче 2 символов', async () => {
            const result = await service.search('а');
            expect(result).toEqual([]);
            expect(mockPrisma.drug.findMany).not.toHaveBeenCalled();
        });
        it('возвращает результаты из Prisma если они есть', async () => {
            const dbResult = [{ id: 1, name: 'Аспирин', substances: [] }];
            mockPrisma.drug.findMany.mockResolvedValue(dbResult);
            const result = await service.search('аспирин');
            expect(result).toEqual(dbResult);
            expect(mockPrisma.drug.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
        });
        it('fallback на PharmaRepository если Prisma вернула пустой массив', async () => {
            mockPrisma.drug.findMany.mockResolvedValue([]);
            mockRepo.search.mockReturnValue([
                { id: 99, name: 'Аспирин', atc: 'B01AC06', group: 'НПВС', substance: 'Ацетилсалициловая кислота' },
            ]);
            const result = await service.search('аспирин');
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Аспирин');
            expect(result[0].slug).toBe('аспирин');
        });
        it('fallback на PharmaRepository если Prisma выбросила исключение', async () => {
            mockPrisma.drug.findMany.mockRejectedValue(new Error('DB error'));
            mockRepo.search.mockReturnValue([
                { id: 1, name: 'Парацетамол', atc: 'N02BE01', group: 'Анальгетики', substance: 'Парацетамол' },
            ]);
            const result = await service.search('парацетамол');
            expect(result).toHaveLength(1);
        });
    });
    describe('getBySlug()', () => {
        it('возвращает препарат из Prisma по slug', async () => {
            const dbDrug = {
                id: 1,
                name: 'Аспирин',
                slug: 'аспирин',
                substances: [],
                contraindications: [],
                analogsFrom: [],
                interactionA: [],
                interactionB: [],
            };
            mockPrisma.drug.findUnique.mockResolvedValue(dbDrug);
            const result = await service.getBySlug('аспирин');
            expect(result).toMatchObject({ name: 'Аспирин' });
        });
        it('возвращает null если препарат не найден ни в DB, ни в локальных данных', async () => {
            mockPrisma.drug.findUnique.mockResolvedValue(null);
            const result = await service.getBySlug('несуществующий-препарат-xyz');
            expect(result).toBeNull();
        });
    });
    describe('interactions()', () => {
        it('возвращает пустой массив если передан один препарат', async () => {
            const result = await service.interactions(['Аспирин']);
            expect(result).toEqual([]);
        });
        it('формирует пары и возвращает взаимодействие HIGH для Аспирин + Варфарин', async () => {
            mockPrisma.drug.findMany.mockResolvedValue([
                { id: 1, name: 'Аспирин' },
                { id: 2, name: 'Варфарин' },
            ]);
            mockPrisma.drugInteraction.findFirst.mockResolvedValue({
                severity: 'HIGH',
                mechanism: 'Усиление антикоагулянтного эффекта',
                clinicalEffect: 'Риск кровотечения',
                recommendation: 'Избегать совместного применения',
            });
            const result = await service.interactions(['Аспирин', 'Варфарин']);
            expect(result).toHaveLength(1);
            expect(result[0].risk).toBe('high');
            expect(result[0].a).toBe('Аспирин');
            expect(result[0].b).toBe('Варфарин');
        });
        it('fallback на локальные данные если Prisma выбросила исключение', async () => {
            mockPrisma.drug.findMany.mockRejectedValue(new Error('DB down'));
            const result = await service.interactions(['Аспирин', 'Ибупрофен']);
            expect(Array.isArray(result)).toBe(true);
        });
    });
    describe('contra()', () => {
        it('возвращает предупреждение при нарушении возрастного ограничения (minAge)', async () => {
            mockPrisma.drug.findFirst.mockResolvedValue({
                name: 'Аспирин',
                contraindications: [{ minAge: 18, maxAge: null, context: null, condition: 'детский возраст', note: null }],
            });
            const result = await service.contra('Аспирин', 12, '');
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0]).toMatch(/мин\. 18 лет/);
        });
        it('возвращает предупреждение при совпадении контекста pregnancy', async () => {
            mockPrisma.drug.findFirst.mockResolvedValue({
                name: 'Аспирин',
                contraindications: [{ minAge: null, maxAge: null, context: 'pregnancy', condition: 'беременность', note: 'Риск для плода' }],
            });
            const result = await service.contra('Аспирин', 28, 'pregnancy');
            expect(result.warnings).toHaveLength(1);
            expect(result.warnings[0]).toMatch(/беременность/i);
        });
        it('возвращает пустые предупреждения если противопоказаний нет', async () => {
            mockPrisma.drug.findFirst.mockResolvedValue({
                name: 'Парацетамол',
                contraindications: [],
            });
            const result = await service.contra('Парацетамол', 30, '');
            expect(result.warnings).toEqual([]);
        });
    });
    describe('dashboard()', () => {
        it('возвращает метрики с данными из Prisma', async () => {
            mockPrisma.drug.count.mockResolvedValue(14283);
            mockPrisma.substance.count.mockResolvedValue(3841);
            mockPrisma.drugInteraction.count.mockResolvedValue(28654);
            const result = await service.dashboard();
            expect(result.metrics).toHaveLength(4);
            expect(result.metrics[0].value).toBe(14283);
        });
        it('возвращает fallback-значения если Prisma недоступна', async () => {
            mockPrisma.drug.count.mockRejectedValue(new Error('DB error'));
            mockPrisma.substance.count.mockRejectedValue(new Error('DB error'));
            mockPrisma.drugInteraction.count.mockRejectedValue(new Error('DB error'));
            const result = await service.dashboard();
            expect(result.metrics[0].value).toBe('14 283');
        });
    });
});
//# sourceMappingURL=drugs.service.spec.js.map