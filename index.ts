/**
 * Created by meganschoendorf on 6/3/16.
 */

import { fetchCred } from 'credstash-promise';
const HotShots = require('hot-shots');

/*
name: Stat name required
value: Stat value required except in increment/decrement where it defaults to 1/-1 respectively
sampleRate: Sends only a sample of data to StatsD default: 1
tags: The Array of tags to add to metrics default: []
callback: The callback to execute once the metric has been sent or buffered
*/

type statsdFunction = (
    /**
     * name: Stat name (required)
     */
    name: string,
    value: number,
    sampleRate?: number,
    tags?: string[],
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
            // globalTags: tags.concat('env:' + env),
        }) as StatsD;
        this.host = host;
        this.tags = tags.concat('env:' + env)
        //mock means that nothing gets fired
        if (mock) {
            this.mock = true;
            return Response.MOCKED;
        }

        // let keys: Array<string> = await Promise.all([
        //     fetchCred(env + ".datadog.appkey"),
        //     fetchCred(env + ".datadog.apikey")
        // ]);

        // let app_key: string = keys[0];
        // let api_key: string = keys[1];

        // if (app_key && api_key) {
        //     dogapi.initialize({
        //         api_key: api_key,
        //         app_key: app_key
        //     });
        return Response.OK;

        // } else {
        //     console.error("Could not load data dog creds from credstash");
        //     return Response.ERROR;
        // }
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
        this._client.increment(metric, 1, /*sampling rate*/undefined);
    }

    sendCountOneWithTags(metric: string, tags: Array<string>) {
        if (this.mock) {
            this._addToMockData(metric, 1, tags);
            return;
        }

        this._client.increment(metric, 1, /*sampling rate*/undefined, tags.concat(this.tags));
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
                this._client.increment(metric, 1, /*sampling rate*/undefined, tags, (err, bytes) => {
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
        this._client.increment(metric, count);
    }

    sendCountWithTags(metric: string, count: number, tags: Array<string>) {
        if (this.mock) {
            this._addToMockData(metric, count, tags);
            return;
        }
        this._client.increment(metric, count,  /*sampling rate*/undefined, tags.concat(this.tags));
    }

    sendGauge(metric: string, value: number) {
        if (this.mock) {
            this._addToMockData(metric, value, []);
            return;
        }
        this._client.gauge(metric, value);
    }

    sendGaugeWithTags(metric: string, value: number, tags: Array<string>) {
        if (this.mock) {
            this._addToMockData(metric, value, tags);
            return;
        }
        this._client.gauge(metric, value, undefined /*sample rate*/, tags.concat(this.tags));
    }

    histogram(metric: string, value: number, tags: Array<string>) {
        if (this.mock) {
            this._addToMockData(metric, value, tags);
            return;
        }
        this._client.histogram(metric, value, undefined /*sample rate*/, tags.concat(this.tags));
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
