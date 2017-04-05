/**
 * Created by meganschoendorf on 7/10/16.
 */

import DogClient from '../index';
import { Response } from "../index";
import { assert } from 'chai';

let AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';

describe("basic test", function () {
    it("mocks correctly", function () {
        let client = new DogClient();
        client.initDogAPI('test', ["tag:1"], "test.prefix", "testhost", true);

        //send a metric, make sure it is mocked and the mock data has the right stuff
        client.sendCountOne("fake.metric"), Response.MOCKED;
        assert.equal(client.getMetric('fake.metric', 'tag:1'), 1, '3');
        assert.equal(client.getMetric('fake.metric', 'env:test'), 1, '4');

        //and repeat...
        client.sendCount("fake.metric", 2);
        assert.equal(client.getMetric('fake.metric', 'tag:1'), 3);
        assert.equal(client.getMetric('fake.metric', 'env:test'), 3);

        //and repeat...
        client.sendCountWithTags("fake.metric", 5, ["tag:2"]);
        assert.equal(client.getMetric('fake.metric', 'tag:1'), 8);
        assert.equal(client.getMetric('fake.metric', 'env:test'), 8);
        assert.equal(client.getMetric('fake.metric', 'tag:2'), 5);

        //and do a gauge
        client.sendGauge("fake.gauge", 5);
        assert.equal(client.getMetric('fake.gauge', 'tag:1'), 5);
        assert.equal(client.getMetric('fake.gauge', 'env:test'), 5);

        //and clear:
        client.clearMockData();
        assert.equal(client.getMetric('fake.gauge', 'tag:1'), 0);
    });

    it("real", async function () {
        this.timeout(10000);
        let client = new DogClient();
        client.initDogAPI('test', ["tag:1"], "development.prefix", "testhost", false);
        client.sendCountOne("fake.metric");
        client.sendCount("fake.metric", 2);
        client.sendCountWithTags("fake.metric", 5, ["tag:2"]);
        client.sendGauge("fake.gauge", 5);

        await client.sendCountOneAndClose('error')
    });
});
