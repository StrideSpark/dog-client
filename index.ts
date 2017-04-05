import { fetchCred } from 'credstash-promise';
const HotShots = require('hot-shots');

type statsdFunction = (
    /**
     * name: Stat name (required)
     */
    name: string,

    /**
     * value: Stat value required except in increment/decrement where it defaults to 1/-1 respectively
     */
    value: number,

    /**
     * sampleRate: Sends only a sample of data to StatsD default: 1
     */
    sampleRate?: number,

    /**
     * tags: The Array of tags to add to metrics default: []
     */
    tags?: string[],

    /**
     * callback: The callback to execute once the metric has been sent or buffered
     */
    cb?: (err: any, bytes: number) => void
) => void;

declare interface StatsD {
    increment: statsdFunction
    decrement: statsdFunction
    gauge: statsdFunction
    histogram: statsdFunction
    close: (cb?: (err: any) => void) => void
}


export enum Response {
    OK,
    ERROR,
    MOCKED
}

export interface MockData {
    [index: string]: { [tag: string]: number }
}

const DEFAULT_SAMPLE_RATE = 1;
export default class DogClient {
    private tags: Array<string> = [];
    private host: string;
    private mock: boolean = false;
    private mockData: MockData = {}
    private _client: StatsD;

    initDogAPI(env: string, tags: Array<string>, prefix: string, host: string, mock: boolean) {
        const statsdHost = process.env.KUBERNETES_SERVICE_HOST != undefined ? 'datadog-statsd.default' : 'localhost';
        this.tags = tags;
        this._client = new HotShots({
            host: statsdHost,
            prefix: prefix.slice(-1) === '.' ? prefix : prefix + '.',
            // not using globaltags because of mock data:
            // globalTags: tags.concat('env:' + env),
        }) as StatsD;
        this.host = host;
        this.tags = tags.concat('env:' + env)
        if (process.env.BUILD_NUM && process.env.BUILD_HASH) this.tags = tags.concat('build:' + process.env.BUILD_NUM + '_' + process.env.BUILD_HASH)

        //mock means that nothing gets fired
        if (mock) {
            this.mock = true;
            return Response.MOCKED;
        }

        return Response.OK;
    }

    addTags(tags: string[]) {
        tags.forEach(tag => {
            if (this.tags.indexOf(tag) === -1) this.tags.push(tag);
        })
    }

    sendCountOne(metric: string) {
        if (this.mock) {
            this._addToMockData(metric, 1, []);
            return;
        }
        this._client.increment(metric, 1, DEFAULT_SAMPLE_RATE, this.tags);
    }

    sendCountOneWithTags(metric: string, tags: Array<string>) {
        if (this.mock) {
            this._addToMockData(metric, 1, tags);
            return;
        }

        this._client.increment(metric, 1, DEFAULT_SAMPLE_RATE, tags.concat(this.tags));
    }

    /**
     * this is specifically for recording failures while exiting
     * @param metric
     * @param tags
     */
    async sendCountOneAndClose(metric: string, tags: Array<string> = []) {
        if (this.mock) {
            this._addToMockData(metric, 1, tags);
            return 0;
        }

        return new Promise<number>(
            (resolve, reject) => {
                this._client.increment(metric, 1, DEFAULT_SAMPLE_RATE, tags.concat(this.tags), (err, bytes) => {
                    if (err) reject(err);
                    this._client.close(err => {
                        if (err) { console.error(err, 'failed to close statsd') }
                        resolve(bytes);
                    })
                });
            });
    }

    sendCount(metric: string, count: number) {
        if (this.mock) {
            this._addToMockData(metric, count, []);
            return;
        }
        this._client.increment(metric, count, DEFAULT_SAMPLE_RATE, this.tags);
    }

    sendCountWithTags(metric: string, count: number, tags: Array<string>) {
        if (this.mock) {
            this._addToMockData(metric, count, tags);
            return;
        }
        this._client.increment(metric, count, DEFAULT_SAMPLE_RATE, tags.concat(this.tags));
    }

    sendGauge(metric: string, value: number) {
        if (this.mock) {
            this._addToMockData(metric, value, []);
            return;
        }
        this._client.gauge(metric, value, DEFAULT_SAMPLE_RATE, this.tags);
    }

    sendGaugeWithTags(metric: string, value: number, tags: Array<string>) {
        if (this.mock) {
            this._addToMockData(metric, value, tags);
            return;
        }
        this._client.gauge(metric, value, DEFAULT_SAMPLE_RATE, tags.concat(this.tags));
    }

    histogram(metric: string, value: number, tags: Array<string>) {
        if (this.mock) {
            this._addToMockData(metric, value, tags);
            return;
        }
        this._client.histogram(metric, value, DEFAULT_SAMPLE_RATE, tags.concat(this.tags));
    }

    private _addToMockData(metric: string, count: number, tags: Array<string>) {
        tags = tags.concat(this.tags);
        if (this.mockData[metric]) {
            tags.forEach(tag => {
                if (this.mockData[metric][tag]) {
                    this.mockData[metric][tag] += count;
                } else {
                    this.mockData[metric][tag] = count;
                }
            })
        } else {
            this.mockData[metric] = {};
            tags.forEach(tag => this.mockData[metric][tag] = count);
        }
    }

    getMetric(metric: string, tag: string) {
        if (!this.mockData[metric]) return 0;
        if (!this.mockData[metric][tag]) return 0;
        return this.mockData[metric][tag];
    }

    clearMockData() {
        this.mockData = {};
    }
}
