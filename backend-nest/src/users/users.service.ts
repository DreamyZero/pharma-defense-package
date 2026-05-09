import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async me(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, fullName: true, email: true, role: true, organization: true, verified: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, fullName: true, email: true, role: true, organization: true, verified: true },
    });
  }
}
