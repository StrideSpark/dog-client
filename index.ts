const HotShots = require('hot-shots');

/**
 * Gauges a stat by a specified amount
 * @param stat {String|Array} The stat(s) to send
 * @param value The value to send
 * @param sampleRate {Number=} The Number of times to sample (0 to 1). Optional.
 * @param tags {Array=} The Array of tags to add to metrics. Optional.
 * @param callback {Function=} Callback when message is done being delivered. Optional.
 */
type statsdFunction = (
    name: string,
    value: number,
    sampleRate?: number,
    tags?: string[],
    cb?: (err: any, bytes: number) => void
) => void;

const enum CheckStatus {
    OK = 0,
    WARNING = 1,
    CRITICAL = 2,
    UNKNOWN = 3,
}

declare interface StatsD {
    increment: statsdFunction
    decrement: statsdFunction
    gauge: statsdFunction
    histogram: statsdFunction
    close(cb?: (err: any) => void): void

    /**
     * Send on an event
     * @param title {String} The title of the event
     * @param text {String} The description of the event.  Optional- title is used if not given.
     * @param options
     *   @option date_happened {Date} Assign a timestamp to the event. Default is now.
     *   @option hostname {String} Assign a hostname to the event.
     *   @option aggregation_key {String} Assign an aggregation key to the event, to group it with some others.
     *   @option priority {String} Can be ‘normal’ or ‘low’. Default is 'normal'.
     *   @option source_type_name {String} Assign a source type to the event.
     *   @option alert_type {String} Can be ‘error’, ‘warning’, ‘info’ or ‘success’. Default is 'info'.
     * @param tags {Array=} The Array of tags to add to metrics. Optional.
     * @param callback {Function=} Callback when message is done being delivered. Optional.
     */
    event(
        title: string,
        text: string,
        options?: {
            date_happened?: Date,
            hostname: string,
            aggregation_key: string,
            priority: string,
            source_type_name: string,
            alert_type: 'error' | 'warning' | 'info' | 'success',
        },
        tags?: string[],
        callback?: (err: any, res: any) => void,
    ): void


    /**
     * Send a service check
     * @param name {String} The name of the service check
     * @param status {Number=} The status of the service check (0 to 3).
     * @param options
     *   @option date_happened {Date} Assign a timestamp to the event. Default is now.
     *   @option hostname {String} Assign a hostname to the check.
     *   @option message {String} Assign a message to the check.
     * @param tags {Array=} The Array of tags to add to the check. Optional.
     * @param callback {Function=} Callback when message is done being delivered. Optional.
     */
    check(
        name: string,
        status: CheckStatus,
        options?: {
            date_happened?: Date,
            hostname: string,
            message: string,
        },
        tags?: string[],
        callback?: (err: any, res: any) => void,
    ): void
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

    /**
     * Send on an event
     * @param title {String} The title of the event
     * @param text {String} The description of the event.  Optional- title is used if not given.
     * @param options
     *   @option date_happened {Date} Assign a timestamp to the event. Default is now.
     *   @option hostname {String} Assign a hostname to the event.
     *   @option aggregation_key {String} Assign an aggregation key to the event, to group it with some others.
     *   @option priority {String} Can be ‘normal’ or ‘low’. Default is 'normal'.
     *   @option source_type_name {String} Assign a source type to the event.
     *   @option alert_type {String} Can be ‘error’, ‘warning’, ‘info’ or ‘success’. Default is 'info'.
     * @param tags {Array=} The Array of tags to add to metrics. Optional.
     * @param callback {Function=} Callback when message is done being delivered. Optional.
     */
    async event(
        title: string,
        text: string,
        options?: {
            date_happened?: Date,
            hostname: string,
            aggregation_key: string,
            priority: string,
            source_type_name: string,
            alert_type: 'error' | 'warning' | 'info' | 'success',
        },
        tags?: string[]
    ) {
        return new Promise<any>(
            (resolve, reject) => this._client.event(title, text, options, tags, (err: any, res: any) => {
                if (err) reject(err);
                resolve(res);
            })
        );
    }


    /**
     * Send a service check
     * @param name {String} The name of the service check
     * @param status {Number=} The status of the service check (0 to 3).
     * @param options
     *   @option date_happened {Date} Assign a timestamp to the event. Default is now.
     *   @option hostname {String} Assign a hostname to the check.
     *   @option message {String} Assign a message to the check.
     * @param tags {Array=} The Array of tags to add to the check. Optional.
     * @param callback {Function=} Callback when message is done being delivered. Optional.
     */
    async check(
        name: string,
        status: CheckStatus,
        options?: {
            date_happened?: Date,
            hostname: string,
            message: string,
        },
        tags?: string[]
    ) {
        return new Promise<any>(
            (resolve, reject) => this._client.check(name, status, options, tags, (err: any, res: any) => {
                if (err) reject(err);
                resolve(res);
            })
        );
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
