/**
 * Created by meganschoendorf on 6/3/16.
 */

import {fetchCred} from 'credstash-promise';
let dogapi = require('dogapi');

export enum Response {
    OK,
    ERROR,
    MOCKED
}

export default class DogClient {
    private tags: Array<string> = [];
    private prefix: string;
    private host: string;
    private standardOptions: {[index : string] : any};
    private mock: boolean = false;

    async initDogAPI(env: string, tags: Array<string>, prefix: string, host: string, mock : boolean) : Promise<Response> {
        //mock means that nothing gets fired
        if (mock) {
            this.mock = true;
            return Response.MOCKED;
        }

        this.prefix = prefix;
        this.host = host;

        tags.forEach(a => this.tags.push(a));
        if (this.tags.indexOf('env:' + env) < 0) {
            this.tags.push('env:' + env);
        }

        this.standardOptions = {
            host: this.host,
            tags: this.tags,
            type: "count"
        };

        let keys : Array<string> = await Promise.all([
            fetchCred(env + ".datadog.appkey"),
            fetchCred(env + ".datadog.apikey")
        ]);

        let app_key : string = keys[0];
        let api_key : string = keys[1];

        if (app_key && api_key) {
            console.log('recieved data dog creds from credstash');
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

    sendCountOne(metric: string) : Promise<Response> {
        if (this.mock) {
            return Promise.resolve(Response.MOCKED);
        }
        return this.promisifySend(metric, 1, this.standardOptions);
    }

    sendCount(metric: string, count: number) : Promise<Response> {
        if (this.mock) {
            return Promise.resolve(Response.MOCKED);
        }
        return this.promisifySend(metric, count, this.standardOptions);
    }

    sendCountWithTags(metric: string, count: number, tags: Array<string>) : Promise<Response> {
        if (this.mock) {
            return Promise.resolve(Response.MOCKED);
        }
        return this.promisifySend(metric, count, {host: this.host, tags: this.tags.concat(tags), type: "count"});
    }
    
    private promisifySend(metric, count, options) : Promise<Response> {
        return new Promise<Response>(
            (resolve, reject) =>
                dogapi.metric.send(this.getFullMetric(metric), count, options, (err:Error, resp:any) => {
                    if (err) {
                        console.error(err);
                        resolve(Response.ERROR);
                    }
                    else resolve(Response.OK);
                })
        );
    }

    private getFullMetric(metric: string): string {
        return this.prefix + "." + metric;
    }
}
