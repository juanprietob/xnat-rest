
module.exports = function(xnat){
	
	const fs = require('fs');
	const Promise = require('bluebird');
	const path = require('path');
	const argv = require('minimist')(process.argv.slice(2));
	const _ = require('underscore');
	const os = require('os');


	const help = function(){
		console.error("Upload a DICOM directory to XNAT.");
		console.error("Usage: node", process.argv[1],"-d <directory> -p <project id>");
		console.error("Options:");
		console.error("-d <DICOM directory>, directory with DICOM files.");
		console.error("-p <project id>, project id in XNAT to upload the files.");
		console.error("--pid <patient id>, If patient id is specified, the patient id won't be extracted from the DICOM file.");
		console.error("--sessid <session id>, If session id is specified, the session id won't be extracted from the DICOM file.");
		console.error("--server <server url>, XNAT server url");
		console.error("--prompt , If set, forces prompt for login information again. It will use the previous server URL saved in the configuration file");
		console.error("--noext , Find all files regardless of extension and test if it is a DICOM file. The DICOM files are imported to XNAT.");
	}

	if(!argv["d"] || !argv["p"] || argv["h"] || argv["help"]){
		help();
		process.exit(1);
	}

	var projectid = argv["p"];
	var directory = argv["d"];
	var patientid = argv["pid"];
	var sessionid = argv["sessid"];
	var promptlogin = argv["prompt"];
	var noext = argv["noext"];


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

	if(noext){
		xnat.useDCMExtensionOff();
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
		console.log("Find dicom files in directory:", directory);
		return xnat.findFiles(directory);
	})
	.then(function(files){
		return Promise.map(files, function(file){
			return xnat.dicomDump(file)
			.then(function(dcmData){
				console.log("Importing file", file);
				var pid;

				if(patientid){
					pid = patientid;
				}else{
					pid = dcmData.dataset["00100020"].value;
					pid = pid.replace(/[ .:|&;$%@"<>()+,]/g, "_");
				}

				var sessid;
				if(sessionid){
					sessid = sessionid;
				}else{
					//Create a unique session id. With the old one it might conflict with existing sessions. 
					sessid = pid + "-" + dcmData.dataset["00080020"].value;
				}
				return xnat.uploadImage(projectid, pid, sessid, file);
			})
			.catch(function(err){
	                        console.error(err);
	                        console.error("No problem trying to continue...");
	                });
		}, {
			concurrency: 1
		});
	})
	.then(function(uploaded){
		return xnat.logout();
	})
	.catch(function(error){	
		console.error(error);
		return xnat.logout();
	});
}