

	
const fs = require('fs');
const Promise = require('bluebird');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));
const _ = require('underscore');
const os = require('os');
const xnat = require("./index.js");


const help = function(){
	console.error("Change converted files from one location to another");
	console.error("Usage: node", process.argv[1],"-p <project id>");
	console.error("Options:");
	console.error("-p <project id>, project id in XNAT to upload the files.");
	console.error("--out_files <filename to write found files>");
	console.error("--in_files <filename to load input files instead of searching>");
	console.error("--prompt , If set, forces prompt for login information again. It will use the previous server URL saved in the configuration file");
}


if(!argv["p"] || argv["h"] || argv["help"]){
	help();
	process.exit(1);
}

var projectid = argv["p"];
var promptlogin = argv["prompt"];
var outfiles = argv["out_files"];
var infiles = argv["in_files"];


xnat.start()
.then(function(res){
	return xnat.getSubjects(projectid);
})
.then(function(res){
	if(!infiles){
		return Promise.map(_.pluck(res, "ID"), function(subjectid){
			return xnat.getSubjectExperiments(projectid, subjectid)
			.then(function(experiments){
				return Promise.map(experiments.ResultSet.Result, function(exp){
					return xnat.getScans(projectid, subjectid, exp.ID)
					.then(function(subjectExperiments){
						return Promise.map(subjectExperiments, function(scans){

							return xnat.getResources(projectid, subjectid, exp.ID, scans.ID)
							.then(function(resources){
								if(resources && resources.ResultSet && resources.ResultSet.Result){
									return _.filter(_.pluck(resources.ResultSet.Result, "label"), function(lab){
										return lab != "NRRD";
									});
								}else{
									return [];
								}
							})
							.then(function(resources){
								return Promise.map(resources, function(resource){
									return xnat.getResourceFiles(projectid, subjectid, exp.ID, scans.ID, resource);
								})
								.then(function(resourcefiles){
									return _.compact(_.flatten(_.pluck(_.compact(_.pluck(resourcefiles, "ResultSet")), "Result")));
								});
							})
							.then(function(scanfiles){
								return _.map(scanfiles, function(sfile){
									if(sfile.Name.indexOf(".nrrd") != -1 || sfile.Name.indexOf(".nii.gz") != -1 || sfile.Name.indexOf(".nii") != -1){
										return {
											subjectid: subjectid,
											experimentid: exp.ID,
											scanid: scans.ID, 
											resourceid: sfile.cat_ID, 
											name: sfile.Name,
											uri: sfile.URI
										}
									}
								});
							});
						});
					});
				})
			})
			.catch(function(e){
				console.error(e);
			})
		}, {
			concurrency: 1
		})
		.then(function(allexperiments){
			allexperiments = _.compact(_.flatten(allexperiments));
			if(outfiles){
				console.log("Writting file", outfiles);
				fs.writeFileSync(outfiles, JSON.stringify(allexperiments), null, 2);
			}
			return allexperiments;
		});
	}else{
		return JSON.parse(fs.readFileSync(infiles));
	}
})
.then(function(allconvertedfiles){
	uniqresource = _.uniq(_.map(allconvertedfiles, function(convfile){
		return {
			subjectid: convfile.subjectid,
		    experimentid: convfile.experimentid,
		    scanid: convfile.scanid
		}
	}), function(el, ind, l){
		return el.subjectid + el.experimentid + el.scanid;
	});

	return Promise.map(uniqresource, function(ur){
		return xnat.createResources(projectid, ur.subjectid, ur.experimentid, ur.scanid, "NRRD")
		.then(function(res){
			console.log("Resource created!", projectid, ur.subjectid, ur.experimentid, ur.scanid, "NRRD");
		})
		.catch(function(err){
			console.error(err);
		});
	}, {
			concurrency: 1
	})
	.then(function(){
		return Promise.map(allconvertedfiles, function(convfile){
			return xnat.moveResource(projectid, convfile.subjectid, convfile.experimentid, convfile.scanid, convfile.resourceid, convfile.name, convfile.subjectid, convfile.experimentid, convfile.scanid, "NRRD", convfile.name)
			.then(function(res){
				console.log("File Moved!", projectid, convfile.subjectid, convfile.experimentid, convfile.scanid, convfile.resourceid, convfile.name);
				return res;
			})
			.catch(function(err){
				console.error(err);
				return err;
			});
		}, {
			concurrency: 1
		})
	})
})
.then(function(res){
	console.log(res)
})
.then(function(){
	return xnat.logout();
})
.catch(function(e){
	console.error(e);
	return xnat.logout();
})