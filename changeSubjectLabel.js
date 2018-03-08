
module.exports = function(xnat){
	
	const fs = require('fs');
	const Promise = require('bluebird');
	const path = require('path');
	const argv = require('minimist')(process.argv.slice(2));
	const _ = require('underscore');
	const os = require('os');
	const csvtojson = require('csvtojson');


	const help = function(){
		console.error("Upload a DICOM directory to XNAT.");
		console.error("Usage: node", process.argv[1],"-p <project id>");
		console.error("Options:");
		console.error("-s <subject id or current subject label>");
		console.error("-e <experiment id or current experiment label (you need to set the -s flag as well)>");
		console.error("-l <label to modify the user>");
		console.error("--csv <csv file with columns 'subject_ID,label' or 'subject_ID,experiment_ID,label'>")
		console.error("--prompt , If set, forces prompt for login information again. It will use the previous server URL saved in the configuration file");
		console.error("--server <server url>, XNAT server url");
	}




	if( !argv["p"] || argv["h"] || argv["help"] || !(argv["csv"] || (argv["l"] && argv["s"]))){
		help();
		process.exit(1);
	}

	var projectid = argv["p"];
	var subjectid = argv["s"];
	var experimentid = argv["e"];
	var label = argv["l"];
	var promptlogin = argv["prompt"];
	var csvfilename = argv["csv"];

	const getConfigFile = function () {
	    return new Promise(function(resolve, reject){
	        try {
	            // Try to load the user's personal configuration file
	            var conf = path.join(os.homedir(), '.xnat.json');
	            resolve(require(conf));
	        } catch (e) {            
	            reject(e);
	        }
	    });
	};

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

	var loginprom = undefined;
	if(argv["server"]){

	    var conf = {};
	    conf.server = argv["server"];

	    loginprom = xnat.promptUsernamePassword()
	    .then(function(user){
	    	conf.user = user;
	        xnat.writeConfFile(conf);
	        return conf;
	    });
	}else{
	    loginprom = getConfigFile()
	    .then(function(conf){
	    	if(promptlogin){
	    		return xnat.promptUsernamePassword()
			    .then(function(user){
			    	conf.user = user;
			        xnat.writeConfFile(conf);
			        return conf;
			    });
	    	}else{
	    		return conf;
	    	}
	    })
	    .catch(function(e){
	        throw "Config file not found. Use -h or --help to learn how to use this program";
	    });
	}

	loginprom
	.then(function(conf){
		console.log("Setting server url to ", conf.server);
		xnat.setXnatUrl(conf.server);
		console.log("Login to xnat.", conf.server);
		return xnat.login(conf.user);
	})
	.then(function(){
		if(subjectid && label && experimentid){
			var params = {
				label: label
			}
		 	return xnat.setExperiment(projectid, subjectid, experimentid, params);
		}else if(subjectid && label){
			var params = {
				label: label
			}
		 	return xnat.setSubject(projectid, subjectid, params);
		}else if(csvfilename){
			return readCSV(csvfilename)
			.then(function(data){
				return Promise.map(data, function(d){
					if(d.label && d.subject_ID && d.experiment_ID){
						var params = {
							label: d.label
						}
						console.log("Renaming experiment:", d.experiment_ID, "to", d.label)
						return xnat.setExperiment(projectid, d.subject_ID, d.experiment_ID, params)
						.then(function(res){
							console.log(res);
						})
						.catch(function(err){
							console.error(err);
						});
					}else if(d.label && d.subject_ID){
						var params = {
							label: d.label
						}
						console.log("Renaming subject:", d.subject_ID, "to", d.label)
						return xnat.setSubject(projectid, d.subject_ID, params)
						.then(function(res){
							console.log(res);
						})
						.catch(function(err){
							console.error(err);
						});
					}else{
						return Promise.reject("No subject_ID and/or label in csv data. Check the column names.");
					}
					
				}, {
					concurrency: 1
				})
			});
		}
		
	})
	.then(function(uploaded){
		return xnat.logout();
	})
	.catch(function(error){	
		console.error(error);
		return xnat.logout();
	});
}