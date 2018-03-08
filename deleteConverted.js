
module.exports = function(xnat){
	
	const fs = require('fs');
	const Promise = require('bluebird');
	const path = require('path');
	const argv = require('minimist')(process.argv.slice(2));
	const _ = require('underscore');
	const os = require('os');


	const help = function(){
		console.error("Delete a converted file such as .nrrd or .nii.gz in XNAT.");
		console.error("Usage: node", process.argv[1],"-f <converted filename> -p <project id> --pid <patient id> --expid <session id> --scanid <scan id>");
		console.error("Options:");
		console.error("--server <server url>, XNAT server url");
		console.error("--prompt , If set, forces prompt for login information again. It will use the previous server URL saved in the configuration file");
	}
	

	if(!argv["p"] || !argv["f"] || !argv["scanid"] || !argv["expid"] || argv["h"] || argv["help"]){
		help();
		process.exit(1);
	}

	var projectid = argv["p"];
	var convertedFile = argv["f"];
	var patientid = argv["pid"];
	var experimentid = argv["expid"];
	var scanid = argv["scanid"];

	var promptlogin = argv["prompt"];
	
	var checkSession = 0;
	if(argv["check"]){
		checkSession = argv["check"];
	}


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


		return xnat.getSubjectSession(projectid, patientid, experimentid);
	})
	.then(function(sessions){
		var allsessions = _.map(sessions.items, function(item){
			return _.map(item.children, function(child){
				return _.map(_.pluck(child.items, "data_fields"), function(data_field){
	                return {
	                    ID: data_field.ID, 
	                    image_session_ID: data_field.image_session_ID,
	                    series_description: data_field.series_description.trim()
	                }
	            });
			});
		});
		return _.flatten(allsessions);
	})
	.then(function(subjectsessions){

		var subjectsession = _.find(subjectsessions, function(sess){
			return scanid == sess.ID;
		});

		if(subjectsession === undefined){
			throw  "I did not find the series number, using series description only.";
		}
		console.log("Deleting converted file", projectid, patientid, subjectsession.image_session_ID, subjectsession.ID, convertedFile);
		return xnat.deleteConvertedImage(projectid, patientid, subjectsession.image_session_ID, subjectsession.ID, convertedFile);
		
	})
	.then(function(res){
		console.log(res);
		return xnat.logout();
	})
	.catch(function(error){	
		console.error(error);
		return xnat.logout();
	});
}