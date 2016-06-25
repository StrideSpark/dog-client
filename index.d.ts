export default class DogClient {
    private tags;
    private prefix;
    private host;
    initDogAPI(env: string, tags: Array<string>, prefix: string): Promise<void>;
    sendCountOne(metric: string): void;
    sendCount(metric: string, count: number): void;
    sendCountWithTags(metric: string, count: number, tags: Array<string>): void;
    sendCountWithCallback(metric: string, callback: any, param: any): void;
    private callbackHelper(err, res, callback, param);
    private datadogCallback(err, res);
    private getFullMetric(metric);
}
