/**
 * Created by meganschoendorf on 7/10/16.
 */

import DogClient from '../index';
import { Response } from "../index";
import { assert } from 'chai';
import { ENV_TEST } from "@stridespark/model-core";


let AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';

describe("basic test", function () {
    it("mocks correctly", async function () {
        let client = new DogClient();
        assert.equal(Response.MOCKED, await client.initDogAPI(ENV_TEST, ["tag:1"], "test.prefix", "testhost", true));
        assert.equal(Response.MOCKED, await client.sendCountOne("fake.metric"));
        assert.equal(Response.MOCKED, await client.sendCount("fake.metric", 2));
        assert.equal(Response.MOCKED, await client.sendCountWithTags("fake.metric", 5, ["tag:2"]));
        assert.equal(Response.MOCKED, await client.sendGauge("fake.gauge", 5));
    });

    it("real", async function () {
        this.timeout(10000);
        let client = new DogClient();
        assert.equal(Response.OK, await client.initDogAPI(ENV_TEST, ["tag:1"], "development.prefix", "testhost", false));
        assert.equal(Response.OK, await client.sendCountOne("fake.metric"));
        assert.equal(Response.OK, await client.sendCount("fake.metric", 2));
        assert.equal(Response.OK, await client.sendCountWithTags("fake.metric", 5, ["tag:2"]));
        assert.equal(Response.OK, await client.sendGauge("fake.gauge", 5));
    });
});
