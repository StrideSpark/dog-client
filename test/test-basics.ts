/**
 * Created by meganschoendorf on 7/10/16.
 */

import DogClient from '../index';
import { Response } from "../index";
import { assert } from 'chai';

let AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';

describe("basic test", function () {
    it("mocks correctly", async function () {
        let client = new DogClient();
        assert.equal(await client.initDogAPI('test', ["tag:1"], "test.prefix", "testhost", true), Response.MOCKED, '1');

        //send a metric, make sure it is mocked and the mock data has the right stuff
        assert.equal(await client.sendCountOne("fake.metric"), Response.MOCKED, '2');
        assert.equal(client.getMetric('fake.metric', 'tag:1'), 1, '3');
        assert.equal(client.getMetric('fake.metric', 'env:test'), 1, '4');

        //and repeat...
        assert.equal(await client.sendCount("fake.metric", 2), Response.MOCKED);
        assert.equal(client.getMetric('fake.metric', 'tag:1'), 3);
        assert.equal(client.getMetric('fake.metric', 'env:test'), 3);

        //and repeat...
        assert.equal(await client.sendCountWithTags("fake.metric", 5, ["tag:2"]), Response.MOCKED);
        assert.equal(client.getMetric('fake.metric', 'tag:1'), 8);
        assert.equal(client.getMetric('fake.metric', 'env:test'), 8);
        assert.equal(client.getMetric('fake.metric', 'tag:2'), 5);

        //and do a gauge
        assert.equal(await client.sendGauge("fake.gauge", 5), Response.MOCKED);
        assert.equal(client.getMetric('fake.gauge', 'tag:1'), 5);
        assert.equal(client.getMetric('fake.gauge', 'env:test'), 5);

        //and clear:
        client.clearMockData();
        assert.equal(client.getMetric('fake.gauge', 'tag:1'), 0);
    });

    it("real", async function () {
        this.timeout(10000);
        let client = new DogClient();
        assert.equal(await client.initDogAPI('test', ["tag:_1"], "development.prefix", "testhost", false), Response.OK);
        assert.equal(await client.sendCountOne("fake.metric"), Response.OK);
        assert.equal(await client.sendCount("fake.me_tri-c*?", 2), Response.OK);
        assert.equal(await client.sendCountWithTags("fake.metric", 5, ["tag's:_2"]), Response.OK);
        assert.equal(await client.sendGauge("fake.gauge", 5), Response.OK);

        client = new DogClient();
        assert.equal(await client.initDogAPI('test', ["tag:1"], "development.prefix", "testhost", false), Response.OK);
        assert.equal(await client.sendCountOne("fake.metric"), Response.OK);
        assert.equal(await client.sendCount("fake.metric", 2), Response.OK);
        assert.equal(await client.sendCountWithTags("fake.metric", 5, ["tag:2"]), Response.OK);
        assert.equal(await client.sendGauge("fake.gauge", 5), Response.OK);

    });
});
