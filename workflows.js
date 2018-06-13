

	
const fs = require('fs');
const Promise = require('bluebird');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const _ = require('underscore');
const os = require('os');
const xnat = require("./index.js");
const csvtojson = require("csvtojson");


const help = function(){
	console.error("Workflow operations");
	console.error("Usage: node", process.argv[1],"-csv <filename>");
	console.error("Options:");
	console.error("--csv <filename>, csv with column 'Workflow ID', you can get a file with the worflow ids if you go to your xnat instance at Administer->More->View All Workflows. You can export a spreadsheet with the Worflow Id");
	console.error("--status <Complete,Queued,Failed>, all the workflows will be changed to this status");
}


if(!argv["csv"] || argv["h"] || argv["help"]){
	help();
	process.exit(1);
}

var csvfilename = argv["csv"];
var status = argv["status"];
if(!status){
	status = "Complete";
}

const readCSV = function(filename){
    var self = this;
    return new Promise(function(resolve, reject){
        var objarr = [];
        csvtojson()
        .fromFile(filename)
        .on('json', function(jsonObj){
            objarr.push(jsonObj);
        })
        .on('end', function(){
            resolve(objarr);
        })
        .on('error', function(err){
            reject(err);
        })
    });
}

xnat.start()
.then(function(){
	return readCSV(csvfilename)
	.then(function(csv){
		return _.pluck(csv, "Workflow ID")
	});
})
.then(function(res){
	return Promise.map(res, function(workflowid){
		return xnat.changeWorkflowStatus(workflowid, status);
	})
})
.then(function(){
	return xnat.logout();
})
.catch(function(e){
	console.error(e);
	return xnat.logout();
})