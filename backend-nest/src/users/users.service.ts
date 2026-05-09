import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
@Injectable()
export class UsersService { constructor(private prisma:PrismaService){} me(id:number){ return this.prisma.user.findUnique({ where:{ id }, select:{ id:true, fullName:true, email:true, role:true, organization:true, verified:true, createdAt:true } }); } update(id:number,dto:UpdateUserDto){ return this.prisma.user.update({ where:{ id }, data:dto, select:{ id:true, fullName:true, email:true, role:true, organization:true, verified:true } }); } }
