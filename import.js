

	
const fs = require('fs');
const Promise = require('bluebird');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const _ = require('underscore');
const os = require('os');
const xnat = require("./index.js");


const help = function(){
	console.error("Import a file to xnat");
	console.error("Usage: node", process.argv[1],"-p <project id> --pid <patient id> --expid <experiment id> --sessid <session id> -f <converted dicom file>");
	console.error("Options:");
	console.error("-f <file to be uploaded>");
	console.error("-p <project id>, project id in XNAT to upload the files.");
	console.error("--pid <patient id>");
	console.error("--expid <experiment id>");
	console.error("--sessid <session id>");
}


if(!argv["p"] || !argv["f"] || !argv["pid"] || !argv["expid"] || !argv["sessid"] || argv["h"] || argv["help"]){
	help();
	process.exit(1);
}

var projectid = argv["p"];
var filename = argv["f"];
var patientid = argv["pid"];
var experimentid = argv["expid"];
var sessionid = argv["sessid"];

xnat.start()
.then(function(conf){
	return xnat.createResources(projectid, patientid, experimentid, sessionid, "NRRD")
	.catch(console.error)
	.then(function(){
		return xnat.uploadResourceFile(projectid, patientid, experimentid, sessionid, "NRRD", filename);
	})
	.catch(console.error);
})
.then(function(res){
	console.log(res);
	return xnat.logout();
})
.catch(function(error){	
	console.error(error);
	return xnat.logout();
});