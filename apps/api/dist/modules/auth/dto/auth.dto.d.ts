export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RegisterCompanyDto {
    name: string;
    email: string;
    password: string;
    phone?: string;
}
export declare class RegisterMemberDto {
    name: string;
    email: string;
    password: string;
    phone?: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
export declare class AuthResponseDto {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        name: string;
        email: string;
        type: string;
    };
}
