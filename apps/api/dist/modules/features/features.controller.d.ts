import { FeaturesService } from './features.service';
import { CreateFeatureDto } from './dto/create-feature.dto';
import { UpdateFeatureDto } from './dto/update-feature.dto';
export declare class FeaturesController {
    private readonly featuresService;
    constructor(featuresService: FeaturesService);
    create(req: any, dto: CreateFeatureDto): Promise<import("./feature.entity").Feature>;
    findAll(req: any): Promise<import("./feature.entity").Feature[]>;
    findOne(req: any, id: string): Promise<import("./feature.entity").Feature>;
    update(req: any, id: string, dto: UpdateFeatureDto): Promise<import("./feature.entity").Feature>;
    remove(req: any, id: string): Promise<void>;
}
