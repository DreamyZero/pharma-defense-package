import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';

const mockAudit = {
  log: jest.fn().mockResolvedValue(undefined),
};

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
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
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
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_REGISTER', entityType: 'User' }),
      );
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

      await expect(
        service.register({
          fullName: 'Дубликат',
          email: 'exists@clinic.ru',
          password: 'pass',
        }),
      ).rejects.toThrow(ConflictException);
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
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'USER_LOGIN', userId: 1 }),
      );
    });

    it('выбрасывает UnauthorizedException если пользователь не найден', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'ghost@clinic.ru', password: 'anyPass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('выбрасывает UnauthorizedException при неверном пароле', async () => {
      const passwordHash = await bcrypt.hash('realPass', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'user@clinic.ru',
        passwordHash,
        role: 'DOCTOR',
      });

      await expect(
        service.login({ email: 'user@clinic.ru', password: 'wrongPass' }),
      ).rejects.toThrow(UnauthorizedException);
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
      expect((result as any)?.passwordHash).toBeUndefined();
    });
  });
});
