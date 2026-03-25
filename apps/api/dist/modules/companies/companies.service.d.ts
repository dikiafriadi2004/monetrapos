import { Repository } from 'typeorm';
import { Company } from './company.entity';
import { UpdateCompanyDto } from './dto/update-company.dto';
export declare class CompaniesService {
    private companyRepo;
    constructor(companyRepo: Repository<Company>);
    getProfile(companyId: string): Promise<Company>;
    updateProfile(companyId: string, dtos: UpdateCompanyDto): Promise<Company>;
}
