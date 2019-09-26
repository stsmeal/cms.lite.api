import { injectable, inject } from 'inversify';
import TYPES from '../constant/types';
import { MongoDBClient } from '../utils/mongodb/client';
import Ticket, { Ticket } from '../models/ticket';
import { Note } from '../models/note';
import Asset, { Asset } from '../models/asset';
import UserIdentity, { UserIdentity } from '../models/user-identity';
import User, { User } from '../models/user';
import Counter, { Counter } from '../models/counter';
import LaborCharge, { LaborCharge } from '../models/labor-charge';
import { Context } from '../context/context';


@injectable()
export class InventoryService {
    constructor(@inject(TYPES.Context) private context: Context){}
    public async getAssets() {
        return await this.context.Asset.find({}).populate('userCreated').populate('userUpdated');
    }
    
    public async getAsset(id: string){
        return await this.context.Asset.findById(id).populate({path: 'assets', model: this.context.Asset}).populate({path: 'laborCharges', model: this.context.LaborCharge, populate: {path: 'assignment', model: this.context.User}}).populate({path: 'assignments', model: this.context.User}).populate('userCreated').populate('userUpdated');
    }

    public async saveAsset(asset: Asset){
        if(!asset._id && !asset.number){
            let counter: Counter = await this.context.Counter.findOne({name: 'inventory'});
            if(!counter){
                asset.number = "1";
                await this.context.Counter.create({name: 'inventory', count: 1});
            } else {
                counter.count += 1;
                asset.number = counter.count.toString();
                await this.context.Counter.findOneAndUpdate({name: 'inventory'}, {count: counter.count});
            }
        }

        if(!asset._id){
            return await this.context.Asset.create(asset);
        } else {
            await this.context.Asset.findByIdAndUpdate(asset._id, asset);
            return await this.context.Asset.findById(asset._id).populate('userCreated').populate('userUpdated');
        }
    }

    public async deleteAsset(id: string){
        return await this.context.Asset.findByIdAndUpdate(id, {deleted: true});
    }

    public async quickSearch(searchText: string){
        let aggregate = (await this.context.Asset.aggregate([{
            $project: { fullname: { $concat: ["$number", " - ", "$description"]}}
        },{
            $match: { fullname: new RegExp(`^${searchText}`, 'i')}
        }]).limit(25)).map(a => a._id);

        let assets = await this.context.Asset.find({_id: {$in: aggregate}}).sort({number: 1, description: 1});

        return await assets;
    }
}