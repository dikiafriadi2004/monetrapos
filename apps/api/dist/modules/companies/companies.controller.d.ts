import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
export declare class CompaniesController {
    private readonly companiesService;
    constructor(companiesService: CompaniesService);
    getProfile(req: any): Promise<import("./company.entity").Company>;
    updateProfile(req: any, dto: UpdateCompanyDto): Promise<import("./company.entity").Company>;
}
