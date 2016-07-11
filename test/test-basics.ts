/**
 * Created by meganschoendorf on 7/10/16.
 */

import * as tap from 'tap';
import DogClient from '../index';
import {Response} from "../index";

let AWS = require('aws-sdk');
AWS.config.region = 'us-west-2';

tap.test("test mock", async function(t) {
    let client = new DogClient();
    t.equal(Response.MOCKED, await client.initDogAPI("test", ["tag:1"], "test.prefix", "testhost", true));
    t.equal(Response.MOCKED, await client.sendCountOne("fake.metric"));
    t.equal(Response.MOCKED, await client.sendCount("fake.metric", 2));
    t.equal(Response.MOCKED, await client.sendCountWithTags("fake.metric", 5, ["tag:2"]));
});

//Commented out because these actually hit two apis: credstash and dogapi.
// tap.test("test real", async function(t) {
//     let client = new DogClient();
//     t.equal(Response.OK, await client.initDogAPI("development", ["tag:1"], "development.prefix", "testhost"));
//     t.equal(Response.OK, await client.sendCountOne("fake.metric"));
//     t.equal(Response.OK, await client.sendCount("fake.metric", 2));
//     t.equal(Response.OK, await client.sendCountWithTags("fake.metric", 5, ["tag:2"]));
// });