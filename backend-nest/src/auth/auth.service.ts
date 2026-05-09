import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
@Injectable()
export class AuthService {
  constructor(private prisma:PrismaService, private jwt:JwtService){}
  async register(dto:RegisterDto){ const passwordHash = await bcrypt.hash(dto.password,10); const user = await this.prisma.user.create({ data:{ fullName:dto.fullName, email:dto.email, passwordHash, organization:dto.organization, role:dto.role || 'DOCTOR' } }); return this.sign(user.id,user.email,user.role); }
  async login(dto:LoginDto){ const user = await this.prisma.user.findUnique({ where:{ email:dto.email } }); if(!user || !(await bcrypt.compare(dto.password,user.passwordHash))) throw new UnauthorizedException('Invalid credentials'); return this.sign(user.id,user.email,user.role); }
  private sign(id:number,email:string,role:string){ return { access_token: this.jwt.sign({ sub:id, email, role }) }; }
}
