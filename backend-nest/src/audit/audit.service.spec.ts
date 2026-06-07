import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../database/prisma.service';

const mockPrisma = {
  auditLog: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
};

describe('AuditService', () => {
  let service: AuditService;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
  });

  describe('list()', () => {
    it('возвращает журнал в формате для UI', async () => {
      const createdAt = new Date('2026-06-01T10:00:00.000Z');
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          createdAt,
          action: 'USER_LOGIN',
          entityType: 'User',
          entityId: '1',
          ipAddress: '127.0.0.1',
          user: { id: 1, email: 'admin@pharma.ru', fullName: 'Админ' },
        },
      ]);

      const result = await service.list(50);

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, orderBy: { createdAt: 'desc' } }),
      );
      expect(result).toEqual([
        {
          time: createdAt.toISOString(),
          user: 'admin@pharma.ru',
          action: 'USER_LOGIN',
          entity: 'User:1',
          ip: '127.0.0.1',
        },
      ]);
    });

    it('подставляет прочерк если пользователь не привязан', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          createdAt: new Date(),
          action: 'DRUG_SEARCH',
          entityType: null,
          entityId: null,
          ipAddress: null,
          user: null,
        },
      ]);

      const [row] = await service.list();
      expect(row.user).toBe('—');
      expect(row.entity).toBe('—');
      expect(row.ip).toBe('—');
    });
  });

  describe('log()', () => {
    it('создаёт запись в auditLog', async () => {
      const payload = {
        userId: 2,
        action: 'USER_REGISTER',
        entityType: 'User',
        entityId: '2',
        newValues: { email: 'doc@test.ru' },
        ipAddress: '10.0.0.1',
      };
      mockPrisma.auditLog.create.mockResolvedValue({ id: 1, ...payload });

      await service.log(payload);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({ data: payload });
    });

    it('пробрасывает ошибку Prisma', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('DB error'));

      await expect(service.log({ action: 'FAIL' })).rejects.toThrow('DB error');
    });
  });

  describe('logSafe()', () => {
    it('не прерывает сценарий при ошибке записи', async () => {
      mockPrisma.auditLog.create.mockRejectedValue(new Error('DB error'));

      await expect(
        service.logSafe({ action: 'DRUG_SEARCH', entityType: 'Drug' }),
      ).resolves.toBeUndefined();
    });
  });
});
