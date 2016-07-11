export default class DogClient {
    private tags;
    private prefix;
    private host;
    private mock;
    initDogAPI(env: string, tags: Array<string>, prefix: string, mock?: boolean): Promise<void>;
    sendCountOne(metric: string): Promise<any>;
    sendCount(metric: string, count: number): Promise<any>;
    sendCountWithTags(metric: string, count: number, tags: Array<string>): Promise<any>;
    sendCountWithCallback(metric: string, callback: any, param: any): Promise<any>;
    private callbackHelper(err, res, callback, param);
    private datadogCallback(err, res);
    private getFullMetric(metric);
}
