export declare enum Response {
    OK = 0,
    ERROR = 1,
    MOCKED = 2,
}
export default class DogClient {
    private tags;
    private prefix;
    private host;
    private standardOptions;
    private mock;
    initDogAPI(env: string, tags: Array<string>, prefix: string, host: string, mock?: boolean): Promise<Response>;
    sendCountOne(metric: string): Promise<Response>;
    sendCount(metric: string, count: number): Promise<Response>;
    sendCountWithTags(metric: string, count: number, tags: Array<string>): Promise<Response>;
    private promisifySend(metric, count, options);
    private getFullMetric(metric);
}
