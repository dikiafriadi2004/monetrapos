import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Company } from '../companies/company.entity';
import { Member } from '../members/member.entity';
import { Employee } from '../employees/employee.entity';
import { LoginDto, RegisterCompanyDto, RegisterMemberDto, AuthResponseDto } from './dto';
export declare class AuthService {
    private companyRepo;
    private memberRepo;
    private employeeRepo;
    private jwtService;
    private configService;
    constructor(companyRepo: Repository<Company>, memberRepo: Repository<Member>, employeeRepo: Repository<Employee>, jwtService: JwtService, configService: ConfigService);
    registerCompany(dto: RegisterCompanyDto): Promise<AuthResponseDto>;
    loginCompany(dto: LoginDto): Promise<AuthResponseDto>;
    registerMember(dto: RegisterMemberDto, companyId: string): Promise<AuthResponseDto>;
    loginMember(dto: LoginDto): Promise<AuthResponseDto>;
    loginEmployee(dto: LoginDto): Promise<AuthResponseDto>;
    refreshToken(refreshToken: string): Promise<AuthResponseDto>;
    private generateTokens;
}
