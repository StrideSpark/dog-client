import { fetchCred } from 'credstash-promise';
import * as net from 'net';
import * as util from 'util';
import { Socket } from "net";
var reconnect = require('net-socket-reconnect')
var wavefrontClient: Socket;

let dogapi = require('dogapi');

export enum Response {
    OK,
    ERROR,
    MOCKED
}

export interface MockData {
    [index: string]: { [tag: string]: number }
}
//        const statsdHost = process.env.KUBERNETES_SERVICE_HOST != undefined ? 'datadog-statsd.default' : 'localhost';


const INVALID_FOR_POINTTAG_KEY = /[^A-Za-z0-9_\-\.]/g

export default class DogClient {
    private tags: Array<string> = [];
    private prefix: string;
    private host: string;
    private standardOptions: { [index: string]: any };
    private standardGaugeOptions: { [index: string]: any };
    private mock: boolean = false;
    private mockData: MockData = {};

    async initDogAPI(env: string, tags: Array<string>, prefix: string, host: string, mock: boolean): Promise<Response> {
        this.prefix = prefix;
        // this.host = host;
        this.host = process.env.HOSTNAME;

        tags.forEach(a => this.tags.push(a));
        if (this.tags.indexOf('env:' + env) < 0) {
            this.tags.push('env:' + env);
        }
        if (process.env.BUILD_NUM && process.env.BUILD_HASH) this.tags.push('build:' + process.env.BUILD_NUM + '_' + process.env.BUILD_HASH.slice(0, 7))


        // let wavefrontHost = process.env.KUBERNETES_SERVICE_HOST != undefined ? 'wavefront-proxy.kube-system' : process.env.WAVEFRONT_PROXY_HOST;


        this.standardOptions = {
            host: this.host,
            tags: this.tags,
            type: "count"
        };
        this.standardGaugeOptions = Object.assign({}, this.standardOptions, { type: 'gauge' });

        //mock means that nothing gets fired
        if (mock) {
            this.mock = true;
            return Response.MOCKED;
        }

        // if (!wavefrontClient && wavefrontHost) {
        //     wavefrontClient = reconnect({
        //         port: 2878,
        //         host: wavefrontHost,
        //         reconnectOnError: true,
        //         reconnectOnClose: true,
        //         reconnectOnEnd: true,
        //         reconnectInterval: 1000,
        //         reconnectTimes: 60,
        //         reconnectOnCreate: true,
        //     })
        //     wavefrontClient.on('reconnect', () => console.warn('trying to reconnect to wavefront-proxy'));
        //     wavefrontClient.on('error', (err: any) => console.error('error with wavefront-proxy', err));
        // }

        let keys: Array<string> = await Promise.all([
            fetchCred(env + ".datadog.appkey"),
            fetchCred(env + ".datadog.apikey")
        ]);

        let app_key: string = keys[0];
        let api_key: string = keys[1];

        if (app_key && api_key) {
            dogapi.initialize({
                api_key: api_key,
                app_key: app_key
            });
            return Response.OK;

        } else {
            console.error("Could not load data dog creds from credstash");
            return Response.ERROR;
        }
    }

    addPrefix(prefix: string) {
        this.prefix += '.' + prefix;
    }

    addTags(tags: string[]) {
        tags.forEach(tag => {
            if (this.tags.indexOf(tag) === -1) this.tags.push(tag);
        })
    }

    sendCountOne(metric: string): Promise<Response> {
        if (this.mock) {
            this._addToMockData(metric, 1, []);
            return Promise.resolve(Response.MOCKED);
        }
        return this._send(metric, 1, this.standardOptions);
    }

    sendCountOneWithTags(metric: string, tags: Array<string>): Promise<Response> {
        if (this.mock) {
            this._addToMockData(metric, 1, tags);
            return Promise.resolve(Response.MOCKED);
        }
        return this._send(metric, 1, { host: this.host, tags: this.tags.concat(tags), type: "count" });
    }

    sendCount(metric: string, count: number): Promise<Response> {
        if (this.mock) {
            this._addToMockData(metric, count, []);
            return Promise.resolve(Response.MOCKED);
        }
        return this._send(metric, count, this.standardOptions);
    }

    sendCountWithTags(metric: string, count: number, tags: Array<string>): Promise<Response> {
        if (this.mock) {
            this._addToMockData(metric, count, tags);
            return Promise.resolve(Response.MOCKED);
        }
        return this._send(metric, count, { host: this.host, tags: this.tags.concat(tags), type: "count" });
    }

    sendGauge(metric: string, value: number): Promise<Response> {
        if (this.mock) {
            this._addToMockData(metric, value, []);
            return Promise.resolve(Response.MOCKED);
        }
        return this._send(metric, value, this.standardGaugeOptions);
    }

    sendGaugeWithTags(metric: string, value: number, tags: Array<string>): Promise<Response> {
        if (this.mock) {
            this._addToMockData(metric, value, tags);
            return Promise.resolve(Response.MOCKED);
        }
        return this._send(metric, value, { host: this.host, tags: this.tags.concat(tags), type: "gauge" });
    }

    private _send(metric: string, count: number, options: any): Promise<Response> {
        this.writeToWavefront(metric, count, this.host, options && options.tags)
        return new Promise<Response>(
            (resolve, reject) =>
                dogapi.metric.send(this._getFullMetric(metric), count, options, (err: Error, resp: any) => {
                    if (err) {
                        console.error(err);
                        resolve(Response.ERROR);
                    }
                    else resolve(Response.OK);
                })
        );
    }

    private _getFullMetric(metric: string): string {
        return this.prefix + "." + metric;
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

    writeToWavefront(name: string, value: number, source: string, tags: string[]) {
        //Key - Valid characters are: a-z,A-Z, 0-9, hyphen ("-"), underscore ("_"), dot (".")
        const formattedTags = tags && tags.map(tag => tag.split(':')).map(splittag => `${splittag[0].replace(INVALID_FOR_POINTTAG_KEY, '_')}="${splittag[1]}"`).join(' ') || '';
        var metricLine = `"${this._getFullMetric(name)}" ${value} source="${source}" ${formattedTags}`;
        try {
            wavefrontClient && wavefrontClient.write(metricLine + '\n')
        } catch (err) {
            // gulp, dont break things if we cant write to wavefront
        }
    }

}
