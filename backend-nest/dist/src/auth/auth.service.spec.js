"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const auth_service_1 = require("./auth.service");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../database/prisma.service");
const common_1 = require("@nestjs/common");
const bcrypt = require("bcryptjs");
const mockPrisma = {
    user: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
};
const mockJwt = {
    sign: jest.fn().mockReturnValue('mock.jwt.token'),
};
describe('AuthService', () => {
    let service;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                auth_service_1.AuthService,
                { provide: prisma_service_1.PrismaService, useValue: mockPrisma },
                { provide: jwt_1.JwtService, useValue: mockJwt },
            ],
        }).compile();
        service = module.get(auth_service_1.AuthService);
        jest.clearAllMocks();
    });
    describe('register()', () => {
        it('успешно регистрирует нового пользователя и возвращает токен', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockPrisma.user.create.mockResolvedValue({
                id: 1,
                email: 'doctor@clinic.ru',
                role: 'DOCTOR',
            });
            const result = await service.register({
                fullName: 'Иван Петров',
                email: 'doctor@clinic.ru',
                password: 'SecurePass123!',
                organization: 'Поликлиника №1',
            });
            expect(result.access_token).toBe('mock.jwt.token');
            expect(result.role).toBe('DOCTOR');
            expect(result.userId).toBe(1);
        });
        it('хэширует пароль перед сохранением в базу данных', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockPrisma.user.create.mockImplementation(async ({ data }) => {
                expect(data.passwordHash).not.toBe('SecurePass123!');
                expect(data.passwordHash).toMatch(/^\$2[ab]\$/);
                return { id: 2, email: data.email, role: data.role };
            });
            await service.register({
                fullName: 'Тест',
                email: 'test@test.ru',
                password: 'SecurePass123!',
            });
        });
        it('выбрасывает ConflictException если email уже зарегистрирован', async () => {
            mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: 'exists@clinic.ru' });
            await expect(service.register({
                fullName: 'Дубликат',
                email: 'exists@clinic.ru',
                password: 'pass',
            })).rejects.toThrow(common_1.ConflictException);
        });
        it('по умолчанию присваивает роль DOCTOR если role не передан', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockPrisma.user.create.mockImplementation(async ({ data }) => {
                expect(data.role).toBe('DOCTOR');
                return { id: 3, email: data.email, role: data.role };
            });
            await service.register({
                fullName: 'Новый врач',
                email: 'newdoc@clinic.ru',
                password: 'pass123',
            });
        });
    });
    describe('login()', () => {
        it('успешно возвращает токен при корректных учётных данных', async () => {
            const passwordHash = await bcrypt.hash('correctPass', 10);
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 1,
                email: 'user@clinic.ru',
                passwordHash,
                role: 'PHARMACIST',
            });
            const result = await service.login({
                email: 'user@clinic.ru',
                password: 'correctPass',
            });
            expect(result.access_token).toBe('mock.jwt.token');
            expect(result.role).toBe('PHARMACIST');
        });
        it('выбрасывает UnauthorizedException если пользователь не найден', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);
            await expect(service.login({ email: 'ghost@clinic.ru', password: 'anyPass' })).rejects.toThrow(common_1.UnauthorizedException);
        });
        it('выбрасывает UnauthorizedException при неверном пароле', async () => {
            const passwordHash = await bcrypt.hash('realPass', 10);
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 1,
                email: 'user@clinic.ru',
                passwordHash,
                role: 'DOCTOR',
            });
            await expect(service.login({ email: 'user@clinic.ru', password: 'wrongPass' })).rejects.toThrow(common_1.UnauthorizedException);
        });
    });
    describe('profile()', () => {
        it('возвращает профиль пользователя без поля passwordHash', async () => {
            const profileData = {
                id: 1,
                fullName: 'Иван Петров',
                email: 'ivan@clinic.ru',
                role: 'DOCTOR',
                organization: 'Поликлиника №1',
                verified: true,
                createdAt: new Date(),
            };
            mockPrisma.user.findUnique.mockResolvedValue(profileData);
            const result = await service.profile(1);
            expect(result).toEqual(profileData);
            expect(result?.passwordHash).toBeUndefined();
        });
    });
});
//# sourceMappingURL=auth.service.spec.js.map