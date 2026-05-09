import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DrugsService } from './drugs.service';
@Controller()
export class DrugsController { constructor(private readonly drugsService:DrugsService){} @Get('dashboard') dashboard(){ return this.drugsService.dashboard(); } @UseGuards(JwtAuthGuard) @Get('drugs/search') search(@Query('q') q=''){ return this.drugsService.search(q); } @UseGuards(JwtAuthGuard) @Get('analogs/:name') analogs(@Param('name') name:string){ return this.drugsService.analogs(name); } @UseGuards(JwtAuthGuard) @Post('interactions/check') interactions(@Body() body:{items:string[]}){ return this.drugsService.interactions(body.items||[]); } @UseGuards(JwtAuthGuard) @Post('contra/check') contra(@Body() body:{drug:string;age:number;context:string}){ return this.drugsService.contra(body.drug,body.age,body.context); } }
