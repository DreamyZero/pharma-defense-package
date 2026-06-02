import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../auth/roles.enum';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Профиль текущего пользователя' })
  @Get('me')
  me(@Req() req: any) {
    return this.usersService.me(req.user.userId);
  }

  @ApiOperation({ summary: 'Обновить профиль (врач / фармацевт)' })
  @UseGuards(RolesGuard)
  @Roles(Role.DOCTOR, Role.PHARMACIST)
  @Patch('me')
  update(@Req() req: any, @Body() dto: UpdateUserDto) {
    return this.usersService.update(req.user.userId, dto);
  }
}
