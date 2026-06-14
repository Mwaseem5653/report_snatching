/**
 * 📦 Application Cache Singleton
 * Holds application data in memory to prevent redundant queries during a login session.
 */

interface CacheStore {
    [key: string]: {
        data: any[];
        timestamp: number;
        filters: any; // Store as object
    };
}

class ApplicationCache {
    private static instance: ApplicationCache;
    private store: CacheStore = {};
    private lastUsedFilters: { [key: string]: any } = {};

    private constructor() {}

    public static getInstance(): ApplicationCache {
        if (!ApplicationCache.instance) {
            ApplicationCache.instance = new ApplicationCache();
        }
        return ApplicationCache.instance;
    }

    private sortObject(obj: any): any {
        if (obj === null || typeof obj !== 'object') return obj;
        return Object.keys(obj).sort().reduce((acc: any, key) => {
            acc[key] = this.sortObject(obj[key]);
            return acc;
        }, {});
    }

    public set(key: string, data: any[], filters: any) {
        const sortedFilters = this.sortObject(filters);
        this.store[key] = {
            data,
            timestamp: Date.now(),
            filters: sortedFilters
        };
        this.lastUsedFilters[key] = sortedFilters;
    }

    public get(key: string, currentFilters: any): any[] | null {
        const cached = this.store[key];
        if (!cached) return null;

        const sortedCurrent = this.sortObject(currentFilters);
        
        // Robust comparison
        if (JSON.stringify(cached.filters) !== JSON.stringify(sortedCurrent)) {
            return null;
        }

        return cached.data;
    }

    public getLastFilters(key: string): any | null {
        return this.lastUsedFilters[key] || null;
    }

    public clear(key: string) {
        delete this.store[key];
        delete this.lastUsedFilters[key];
    }
}

export const appCache = ApplicationCache.getInstance();
