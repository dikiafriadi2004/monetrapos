import { Repository } from 'typeorm';
import { Feature } from './feature.entity';
import { CreateFeatureDto, UpdateFeatureDto } from './dto';
export declare class FeaturesService {
    private featureRepo;
    constructor(featureRepo: Repository<Feature>);
    create(companyId: string, dto: CreateFeatureDto): Promise<Feature>;
    findAll(companyId: string): Promise<Feature[]>;
    findOne(companyId: string, id: string): Promise<Feature>;
    update(companyId: string, id: string, dto: UpdateFeatureDto): Promise<Feature>;
    remove(companyId: string, id: string): Promise<void>;
}
