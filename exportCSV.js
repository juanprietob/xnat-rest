

	
const fs = require('fs');
const Promise = require('bluebird');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const _ = require('underscore');
const os = require('os');
const xnat = require("./index.js");
const json2csv = require('json2csv');


const help = function(){
	console.error("Export all scans and annotations from a project to a CSV file");
	console.error("Usage: node", process.argv[1],"-p <project id>");
	console.error("Options:");
	console.error("-p <project id>, project id in XNAT to upload the files.");
	console.error("--out <filename to write data in csv format, if not provided will print to console>");
	console.error("--nrrd <Export only images that are located in the NRRD resource>");
}


if(!argv["p"] || argv["h"] || argv["help"]){
	help();
	process.exit(1);
}

var projectid = argv["p"];
var outfilename = argv["out"];
var nrrd_resource = argv["nrrd"];

xnat.start()
.then(function(res){
	return xnat.getSubjects(projectid);
})
.then(function(res){
	
	return Promise.map(res, function(subject){
		return xnat.getSubjectExperiments(projectid, subject.ID)
		.then(function(experiments){
			return Promise.map(experiments.ResultSet.Result, function(exp){
				return xnat.getScans(projectid, subject.ID, exp.ID)
				.then(function(subjectExperiments){

					if(!nrrd_resource){
						return _.map(subjectExperiments, function(scans){
							return {
								subjectid: subject.ID,
								subject_label: subject.label,
								expid: exp.ID,
								exp_label: exp.label,
								scanid: scans.ID, 
								series_description: scans.series_description,
								quality: scans.quality, 
								note: scans.note
							}
						});	
					}else{
						return Promise.map(subjectExperiments, function(scans){
							return xnat.getScanFiles(projectid, subject.ID, exp.ID, scans.ID)
							.then(function(scanfiles){
								var scanfilesfound = _.map(scanfiles, function(sfile){

									return {
										subjectid: subject.ID,
										subject_label: subject.label,
										expid: exp.ID,
										exp_label: exp.label,
										scanid: scans.ID, 
										series_description: scans.series_description,
										quality: scans.quality, 
										note: scans.note, 
										name: sfile.Name,
										uri: sfile.URI,
										collection: sfile.collection,
										path: path.join(exp.label, 'SCANS', scans.ID, 'NRRD', sfile.Name)
									}
								});
								return _.filter(scanfilesfound, function(sfile){
									return (sfile.collection.indexOf("NRRD") != -1 && (sfile.name.indexOf(".nrrd") != -1 || sfile.name.indexOf(".nii.gz") != -1 || sfile.name.indexOf(".nii") != -1))
								});
							})
							.catch(function(e){
								console.error("getScanFiles", projectid, subject.ID, exp.ID, scans.ID);
								console.error(e);
								return null;
							});
						}, {
							concurrency: 1
						});
					}
				})
				.catch(function(e){
					console.error("getScans", projectid, subject.ID, exp.ID);
					console.error(e);
					return null;
				});
			}, {
				concurrency: 1
			});
		})
		.catch(function(e){
			console.error("getSubjectExperiments", projectid, subject.ID);
			console.error(e);
			return null;
		});
	}, {
		concurrency: 1
	})
	.then(function(allscans){
		allscans = _.compact(_.flatten(allscans));
		csvout = '';
		if(allscans.length > 0){
			var fields = _.keys(allscans[0]);
			csvout = json2csv({
				data: allscans,
				fields: fields
			});
		}
		if(outfilename){
			console.log("Writing:", outfilename);
			fs.writeFileSync(outfilename, csvout);
		}else{
			console.log(csvout);
		}
	})
	.catch(function(e){
		console.error("map ids");
		console.error(e);
		return null;
	});
})
.then(function(){
	return xnat.logout();
})
.catch(function(e){
	console.error(e);
	return xnat.logout();
})