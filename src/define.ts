const NodeCache = require( "node-cache" );

interface CacheAsideInterface {
    getOrSet: Function,
    nodeCache: Function
}

export class CacheAside implements CacheAsideInterface {
    private promiseMap: Map< string, Promise<Array<any>>>
    private cache = new NodeCache({
        /* 
        * Keep original promise object, not clone to new one for handling => saving memory
        * However, if there are N keys (N > 1) containing an object as their value, and the value of any key is changed, 
        * the other key will be changed too
        */
        useClones: false, 
        
    })
    private static instance: CacheAsideInterface;

    constructor() {
        this.promiseMap = new Map()
    }

    public static getInstance(): CacheAsideInterface {
        if (!CacheAside.instance) {
            CacheAside.instance = new CacheAside();
        }

        return CacheAside.instance;
    }

    async getFromCache(key:string) {
        return this.cache.get(key)
    }

    async setToCache(key:string, value:string, TTL?:number) {
        if(TTL)
            return this.cache.set(key, value, TTL)
        return this.cache.set(key, value)
    }

    existOnMap(key:string) {
        return this.promiseMap.has(key)
    }

    getFromMap(key:string) {
        return this.promiseMap.get(key)
    }

    setToMap(key:string, promises:Promise<any>) {
        return this.promiseMap.set(key, promises)
    }

    deleteFromMap(key:string) {
        return this.promiseMap.delete(key)
    }

    /**
     * 
     * @param key: Key to find on cache and on map 
     * @param callback: Callback function to get data if the data isn't on cache 
     * @returns 
     */
    async getOrSet(key:string, callback:Function, TTL?: number) {
        let data = await this.getFromCache(key)
        if(!data) {
            if(this.existOnMap(key)) {
                return this.getFromMap(key)
            }

            try {
                const promises = callback()
                this.setToMap(key, promises)
                data = await promises
                await this.setToCache(key, JSON.stringify(data), TTL)
            } catch (error) {
                throw new Error(error)
            } finally {
                this.deleteFromMap(key)
            }
        }
        else {
            return JSON.parse(data)
        }
        return data
    }

    /**
     * To use node-cache package
     * @returns
     */
    nodeCache() {
        return this.cache
    }
}