
module.exports = function(xnat){
	
	const fs = require('fs');
	const Promise = require('bluebird');
	const path = require('path');
	const argv = require('minimist')(process.argv.slice(2));
	const _ = require('underscore');
	const os = require('os');


	const help = function(){
		console.error("Upload converted files from DICOM to XNAT.");
		console.error("Usage: node", process.argv[1],"-d <dicom directory> -f <converted dicom file> -p <project id>");
		console.error("Options:");
		console.error("-d <DICOM directory>, directory with DICOM files corresponding to the converted file");
		console.error("-f <converted dicom file>, The corresponding file either in .nrrd or .nii.gz format");
		console.error("-p <project id>, project id in XNAT to upload the files.");
		console.error("--check <int value>, wait a maximum number of minutes if the session exists before importing. Checks every minute for the session. default 0");
		console.error("--force , Force import of files. If the file exists in XNAT it will delete it first and import the new one.");
		console.error("--pid <patient id>, If patient id is specified, the patient id won't be extracted from the DICOM file.");
		console.error("--expid <experiment id>, If experiment id is specified, the session id won't be extracted from the DICOM file. This tag is equivalent to the Study Date but is used in xnat as experimentid");
		console.error("--server <server url>, XNAT server url");
		console.error("--prompt , If set, forces prompt for login information again. It will use the previous server URL saved in the configuration file");
	}
	

	if(!argv["d"] || !argv["p"] || !argv["f"] || argv["h"] || argv["help"]){
		help();
		process.exit(1);
	}

	var projectid = argv["p"];
	var convertedFile = argv["f"];
	var directory = argv["d"];
	var patientid = argv["pid"];
	var experimentid = argv["expid"];
	var promptlogin = argv["prompt"];
	var noext = argv["noext"];
	var forceImport = argv["force"];
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

	const testSubjectSessionRec = function(projectid, pid, expid, repeat){
		
		return xnat.getSubjectSession(projectid, pid)
		.then(function(sessions){
			if(sessions.ResultSet && sessions.ResultSet.Result){
				var allsessions = sessions.ResultSet.Result;
				var session = _.find(allsessions, function(sess){
					return sess.date.replace(/-/g,'') == expid;
				});

				if(session){
					return session;
				}else if(checkSession){
					var wait;
					if(repeat > 0){
						console.log("Waiting:", repeat,  "minute(s) left, the subject is not there yet");
						wait = Promise.delay(60000)
						.then(function(){
							repeat--;
							return testSubjectSessionRec(projectid, pid, expid, repeat);
						});
					}else{
						wait = Promise.resolve();
					}
					return wait;
				}
			}
			return Promise.reject("Session not found using acquisition date");
		});

	}

	const testSubjectRec = function(projectid, pid, repeat){
		
		return xnat.getSubjectSession(projectid, pid)
		.catch(function(e){
			var wait;
			if(repeat > 0){
				console.log("Waiting:", repeat,  "minute(s) left, the session is not there yet");
				wait = Promise.delay(60000)
				.then(function(){
					repeat--;
					return testSubjectRec(projectid, pid, repeat);
				});
			}else{
				wait = Promise.resolve();
			}
			return wait;
		});

	}

	
	xnat.useDCMExtensionOff();

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
		return xnat.findFiles(directory)
		.then(function(files){
			return Promise.any(_.map(files, function(file){
				return xnat.dicomDump(file);
			}));
		});
	})
	.then(function(dcmData){
			
		console.log("Importing converted file", convertedFile);
		var pid;

		if(patientid){
			pid = patientid;
		}else{
			pid = dcmData.dataset["00100020"].value;
			
			console.log("Replacing invalid characters in patient id (pid)");
			pid = pid.replace(/[ .:|&;$%@"<>()+,]/g, "_");
			console.log("The pid looks like this now:", pid);
			
		}

		var expid;
		if(experimentid){
			expid = experimentid;
		}else{
			//This dicom tag is the studydate but is used as experiment id
			expid = dcmData.dataset["00080020"].value;
		}

		var seriesdes = dcmData.dataset["0008103E"].value;
		seriesdes = seriesdes.trim();

		var seriesnum = dcmData.dataset["00200011"].value;

		var promGetSubjectSession;

		if(checkSession > 0){
			promGetSubjectSession = testSubjectRec(projectid, pid, checkSession);
		}else{
			promGetSubjectSession = xnat.getSubjectSession(projectid, pid);
		}
		
		return promGetSubjectSession
		.bind({})
		.then(function(sessions){
			this.expid = expid;
			this.pid = pid;

			if(sessions.ResultSet && sessions.ResultSet.Result){
				var allsessions = sessions.ResultSet.Result;
				var session = _.find(allsessions, function(sess){
					return sess.date.replace(/-/g,'') == expid;
				});

				if(session){
					this.expid = session.ID;
					return xnat.getSubjectSession(projectid, this.pid, session.ID);
				}else if(checkSession > 0){
					return testSubjectSessionRec(projectid, this.pid, this.expid, checkSession)
					.bind(this)
					.then(function(session){
						this.expid = session.ID;
						return xnat.getSubjectSession(projectid, this.pid, session.ID);
					});
				}
			}
			return Promise.reject("Session not found using acquisition date");
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
				return sess.series_description === seriesdes && seriesnum == sess.ID;
			});
			if(subjectsession === undefined){
				console.log("I did not find the series number, using series description only.");
				subjectsession = _.find(subjectsessions, function(sess){
					return sess.series_description === seriesdes;
				});
				if(subjectsession === undefined){
					return Promise.reject({
						error: "session not found",
						file: convertedFile,
						dicomDir: directory
					});
				}
			}
			
			this.subjectsessionid = subjectsession.ID;
			return xnat.getScanFiles(projectid, this.pid, this.expid, this.subjectsessionid);
			
		})
		.then(function(scanfiles){

			var convertedFileName = path.basename(convertedFile);
			var scan = _.find(scanfiles, function(sc){
				return convertedFileName == sc.Name;
			});
			var deleteFile;
			if(scan && forceImport){
				deleteFile = xnat.deleteFile(scan.URI);
			}else{
				deleteFile = Promise.resolve();
			}

			return deleteFile;

		})
		.then(function(){
			return xnat.createResources(projectid, this.pid, this.expid, this.subjectsessionid, "NRRD")
			.catch(function(err){
				console.error(err);
			});
		})
		.then(function(){
			return xnat.uploadResourceFile(projectid, this.pid, this.expid, this.subjectsessionid, "NRRD", convertedFile);
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
}