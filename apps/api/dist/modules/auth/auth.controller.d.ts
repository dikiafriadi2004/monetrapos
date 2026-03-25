import { AuthService } from './auth.service';
import { LoginDto, RegisterCompanyDto, RegisterMemberDto, RefreshTokenDto } from './dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    registerCompany(dto: RegisterCompanyDto): Promise<import("./dto").AuthResponseDto>;
    loginCompany(dto: LoginDto): Promise<import("./dto").AuthResponseDto>;
    registerMember(dto: RegisterMemberDto, req: any): Promise<import("./dto").AuthResponseDto>;
    loginMember(dto: LoginDto): Promise<import("./dto").AuthResponseDto>;
    loginEmployee(dto: LoginDto): Promise<import("./dto").AuthResponseDto>;
    refreshToken(dto: RefreshTokenDto): Promise<import("./dto").AuthResponseDto>;
}
