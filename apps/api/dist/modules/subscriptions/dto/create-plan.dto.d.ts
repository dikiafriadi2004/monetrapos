export declare class CreatePlanDto {
    name: string;
    tier: string;
    description?: string;
    monthlyPrice: number;
    yearlyPrice: number;
    maxOutlets?: number;
    maxProducts?: number;
    isActive?: boolean;
    featureIds?: string[];
}
