import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  drugImport: {
    findMany: jest.fn(),
  },
};

const mockAudit = {
  log: jest.fn().mockResolvedValue(undefined),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  describe('setRole()', () => {
    it('меняет роль и пишет аудит', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 5,
        email: 'user@test.ru',
        role: 'DOCTOR',
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 5,
        email: 'user@test.ru',
        role: 'ADMIN',
      });

      const result = await service.setRole(5, 'ADMIN', 1, '127.0.0.1');

      expect(result.role).toBe('ADMIN');
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          action: 'USER_ROLE_CHANGE',
          entityType: 'User',
          entityId: '5',
          ipAddress: '127.0.0.1',
        }),
      );
    });

    it('выбрасывает NotFoundException если пользователь не найден', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.setRole(99, 'ADMIN')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser()', () => {
    it('выбрасывает ConflictException при занятом email', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 1, email: 'old@test.ru' })
        .mockResolvedValueOnce({ id: 2, email: 'taken@test.ru' });

      await expect(
        service.updateUser(1, { email: 'taken@test.ru' }),
      ).rejects.toThrow(ConflictException);
    });

    it('обновляет пароль и логирует USER_UPDATE', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 3,
        email: 'doc@test.ru',
        passwordHash: 'hash',
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 3,
        fullName: 'Врач',
        email: 'doc@test.ru',
        role: 'DOCTOR',
        organization: null,
        verified: true,
        createdAt: new Date(),
      });

      await service.updateUser(3, { password: 'newPass123' }, 1, '10.0.0.2');

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 3 },
          data: expect.objectContaining({
            passwordHash: expect.stringMatching(/^\$2[ab]\$/),
          }),
        }),
      );
      expect(mockAudit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'USER_UPDATE',
          newValues: expect.objectContaining({ passwordChanged: true }),
        }),
      );
    });
  });

  describe('etl()', () => {
    it('возвращает последние импорты', async () => {
      const imports = [{ id: 1, fileName: 'drugs.csv' }];
      mockPrisma.drugImport.findMany.mockResolvedValue(imports);

      const result = await service.etl();
      expect(result).toEqual(imports);
      expect(mockPrisma.drugImport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 30 }),
      );
    });
  });
});
