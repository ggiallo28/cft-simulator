"use strict";

var _ = require('lodash');
var fs = require('fs');
var simulator = require('./processors-pipeline');

exports.handler =  async function(event, context) {
  var resultObj = simulator.process(JSON.stringify(event), null);
  console.log(JSON.stringify(resultObj));
  return resultObj
}