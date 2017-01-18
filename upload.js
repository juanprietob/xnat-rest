const xnat = require("./index.js");
const fs = require('fs');
const Promise = require('bluebird');
const path = require('path');
const find = require('find');
const argv = require('minimist')(process.argv.slice(2));
const _ = require('underscore');

if(!argv["d"]){
	console.error("Please specify directory with -d");
	process.exit(1);
}

if(!argv["p"]){
	console.error("Please specify project id with -p");
	process.exit(1);
}

var projectid = argv["p"];
var directory = argv["d"];

var files = find.fileSync(/\.dcm$/, directory);

var user = {
    user: "jprieto",
    password: "2006BuitragoK-9!"
}

xnat.setXnatUrl('http://152.19.32.248:8080');

xnat.login(user)
.then(function(){
	return Promise.map(files, function(file){
		return xnat.dicomDump(file)
		.then(function(dcmData){
			var patientid = dcmData.dataset["00100020"].value;
			var sessionid = dcmData.dataset["00080020"].value;
			return xnat.uploadImage(projectid, patientid, sessionid, file);
		});
	}, {
		concurrency: 1
	});
})
.then(function(uploaded){
	return xnat.logout(user);
})
.catch(function(error){	
	console.error(error);
	return xnat.logout(user);
});