/**
 * Created by meganschoendorf on 6/3/16.
 */

import {fetchCred} from 'credstash-promise';
let dogapi = require('dogapi');


export default class DogClient {
    private tags: Array<string> = [];
    private prefix: string;
    private host: string = 'lambda';

    async initDogAPI(env: string, tags: Array<string>, prefix: string) {
        this.prefix = prefix;

        tags.forEach(a => this.tags.push(a));
        if (this.tags.indexOf('env:' + env) < 0) {
            this.tags.push('env:' + env);
        }

        let app_key = await fetchCred(env + ".datadog.appkey");
        let api_key = await fetchCred(env + ".datadog.apikey");

        if (app_key && api_key) {
            console.log('recieved data dog creds from credstash');
            dogapi.initialize({
                api_key: api_key,
                app_key: app_key
            });
            dogapi.metric.send(this.getFullMetric("load"), 1, { host: this.host, tags: this.tags, type: "count" }, this.datadogCallback);

        } else {
            throw new Error("Could not load data dog creds from credstash");
        }
    }

    sendCountOne(metric: string) {
        dogapi.metric.send(this.getFullMetric(metric), 1, {
            host: this.host,
            tags: this.tags,
            type: "count"
        }, this.datadogCallback);
    }

    sendCount(metric: string, count: number) {
        dogapi.metric.send(this.getFullMetric(metric), count, {
            host: this.host,
            tags: this.tags,
            type: "count"
        }, this.datadogCallback);
    }

    sendCountWithTags(metric: string, count: number, tags: Array<string>) {
        dogapi.metric.send(this.getFullMetric(metric), count, {
            host: this.host,
            tags: this.tags.concat(tags),
            type: "count"
        }, this.datadogCallback);
    }

    sendCountWithCallback(metric: string, callback: any, param: any) {
        dogapi.metric.send(this.getFullMetric(metric), 1, {
            host: this.host,
            tags: this.tags,
            type: "count"
        }, (err: any, res: any) => this.callbackHelper(err, res, callback, param));
    }

    private callbackHelper(err: Error, res: any, callback: any, param: any) {
        this.datadogCallback(err, res);
        callback(param);
    }

    private datadogCallback(err: Error, res: any) {
        if (err) {
            console.error("Error sending metrics to datadog:", err);
        }
    }

    private getFullMetric(metric: string): string {
        return this.prefix + "." + metric;
    }
}
