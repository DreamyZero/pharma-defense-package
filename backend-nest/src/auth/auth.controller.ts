import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'Вход в систему' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить профиль текущего пользователя' })
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@Req() req: any) {
    return this.authService.profile(req.user.userId);
  }
}
