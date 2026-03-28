import { AuthService } from './auth.service';
import { LoginDto, RegisterCompanyDto, VerifyEmailDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterCompanyDto): Promise<{
        message: string;
        companyId: string;
        userId: string;
        verificationToken: string;
    }>;
    verifyEmail(dto: VerifyEmailDto): Promise<{
        message: string;
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../users/user.entity").UserRole;
            companyId: string;
        };
    }>;
    loginEmployee(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            type: string;
            storeId: string;
        };
    }>;
    forgotPassword(dto: ForgotPasswordDto): Promise<{
        message: string;
        resetToken?: undefined;
    } | {
        message: string;
        resetToken: string;
    }>;
    resetPassword(dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: import("../users/user.entity").UserRole;
            companyId: string;
        };
    }>;
}
