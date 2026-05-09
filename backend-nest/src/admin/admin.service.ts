import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
@Injectable()
export class AdminService { constructor(private prisma:PrismaService){} users(){ return this.prisma.user.findMany({ select:{ id:true, fullName:true, email:true, role:true, organization:true, verified:true, createdAt:true } }); } audit(){ return this.prisma.auditLog.findMany({ take:50, orderBy:{ createdAt:'desc' } }); } etl(){ return [{ id:'ETL-102', source:'ГРЛС XML', status:'Выполнен', processed:'14 283', errors:0, time:'02:03' },{ id:'ETL-104', source:'NLP синонимы', status:'В процессе', processed:'9 124', errors:3, time:'02:58' }]; } }
