import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';
@Controller('users') @UseGuards(JwtAuthGuard)
export class UsersController { constructor(private readonly usersService:UsersService){} @Get('me') me(@Req() req:any){ return this.usersService.me(req.user.userId); } @Patch('me') update(@Req() req:any,@Body() dto:UpdateUserDto){ return this.usersService.update(req.user.userId,dto); } }
