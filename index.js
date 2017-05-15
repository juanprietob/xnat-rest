const request = require('request');
const Promise = require('bluebird');
const _ = require('underscore');
const path = require('path');
const fs = require('fs');
const dicomjs = require('dicomjs');
const qs = require('querystring');
const find = require('find');
const os = require('os');
const prompt = require('prompt');

var xnat = {};

xnat.useDCMExtension = true;

xnat.useDCMExtensionOn = function(){
	xnat.useDCMExtension = true;
}

xnat.useDCMExtensionOff = function(){
	xnat.useDCMExtension = false;
}

xnat.setUseDCMExtension = function(usedcm){
	xnat.useDCMExtension = usedcm;
}

xnat.jar = request.jar();

xnat.setXnatUrl = function(url){
	xnat.url = url;
}

xnat.getXnatUrl = function(){
	return xnat.url;
}

xnat.login = function(user){
	return new Promise(function(resolve, reject){
		var options = {
			url: xnat.getXnatUrl() + "/data/JSESSION",
			auth:user
		}

		request(options, function(err, res, body){
			if(err){
				reject(err);
			}else{
				
				if(res.statusCode === 200){
					
					var cookie = request.cookie('JSESSIONID=' + body);
					xnat.jar.setCookie(cookie, xnat.getXnatUrl()); 

					resolve(body);
				}else{
					reject("Login failed. Please set server information again.");
				}
				
			}
		});
	})
}

xnat.dicomDump = function(filename){
	return new Promise(function(resolve, reject){
		try{

			dicomjs.parseFile(filename, function (err, dcmData) {
			    if (!err) {
			        resolve(dcmData);
			    } else {
			        reject({
			        	err: err,
			        	filename: filename
			        });
			    }
			});
		}catch(err){
			reject({
	        	err: err,
	        	filename: filename
	        });
		}
	});	
}

xnat.getProjects = function(){
	return new Promise(function(resolve, reject){
		var options = {
			url: xnat.getXnatUrl() + "/data/archive/projects" + "?format=json",
			jar: xnat.jar
		}

		request(options, function(err, res, body){
			if(err){				
				reject(err);
			}else{				
				if(res.statusCode === 200){
					resolve(JSON.parse(body));
				}else{
					reject(body);
				}
			}
		});
	})	
}

xnat.getSubjects = function(projectid, subjectid){
	return new Promise(function(resolve, reject){

		var params = {
			format: "json"
		}

		if(projectid){
			params.project = projectid;
		}

		if(subjectid){
			params.ID = subjectid;
		}

		var options = {
			url: xnat.getXnatUrl() + "/data/archive/subjects?" + qs.stringify(params),
			method: "GET",
			jar: xnat.jar
		}

		request(options, function(err, res, body){
			if(err){				
				reject(err);
			}else{				
				if(res.statusCode === 200){					
					resolve(JSON.parse(body).ResultSet.Result);
				}else{
					reject(body);
				}
			}
		});
	});	
}

xnat.getExperiments = function(projectid){	
	return new Promise(function(resolve, reject){

		var params = {
			format: "json"
		}

		if(projectid){
			params.project = projectid;
		}

		var options = {
			url: xnat.getXnatUrl() + "/data/archive/experiments?" + qs.stringify(params),
			method: "GET",
			jar: xnat.jar
		}

		request(options, function(err, res, body){
			if(err){				
				reject(err);
			}else{				
				if(res.statusCode === 200){					
					resolve(JSON.parse(body).ResultSet.Result);
				}else{
					reject(body);
				}
			}
		});
	});
}

xnat.getSubject = function(projectid, subjectid){
	return new Promise(function(resolve, reject){

		var params = {
			format: "json"
		}

		var options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "?" + qs.stringify(params),
			jar: xnat.jar
		}

		request(options, function(err, res, body){
			if(err){				
				reject(err);
			}else{				
				if(res.statusCode === 200){
					resolve(JSON.parse(body));
				}else{
					reject(body);
				}
			}
		});
	})	
}

xnat.getSubjectExperiments = function(projectid, subjectid){
	return new Promise(function(resolve, reject){

		var params = {
			format: "json"
		}

		var options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments?" + qs.stringify(params),
			jar: xnat.jar
		}

		request(options, function(err, res, body){
			if(err){				
				reject(err);
			}else{				
				if(res.statusCode === 200){
					resolve(JSON.parse(body));
				}else{
					reject(body);
				}
			}
		});
	})	
}

xnat.getSubjectSession = function(projectid, subjectid, sessionid){
	return new Promise(function(resolve, reject){

		var params = {
			format: "json"
		}

		var url;
		if(sessionid){
			url = "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + sessionid + "?" + qs.stringify(params);
		}else{
			url = "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments?" + qs.stringify(params);
		}

		var options = {
			url: xnat.getXnatUrl() + url,
			jar: xnat.jar
		}

		request(options, function(err, res, body){
			if(err){				
				reject(err);
			}else{				
				if(res.statusCode === 200){
					resolve(JSON.parse(body));
				}else{
					reject(body);
				}
			}
		});
	})	
}

xnat.createSubject = function(projectid, subjectid) {
	return new Promise(function(resolve, reject){
		var options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid,
			method: "PUT",
			jar: xnat.jar
		}		
		request(options, function(err, res, body){
			if(err){
				reject(err);
			}else{
				if(res.statusCode === 200 || res.statusCode === 201){
					resolve(body);
				}else{
					reject(body);
				}
			}
		});
	});
}

xnat.uploadImage = function(projectid, subjectid, experimentid, filename){
	return new Promise(function(resolve, reject){		

		var params = {
			inbody: true,
			overwrite: "delete",
			dest: "/archive/projects/" + projectid,
			"import-handler" : "gradual-DICOM",
			SUBJECT_ID: subjectid,
			EXPT_LABEL: experimentid
		}

		var options = {
			url: xnat.getXnatUrl() + "/data/services/import?" + qs.stringify(params),
			method: "POST",
			jar: xnat.jar,
			body: fs.readFileSync(filename)
		}		

		request(options, function(err, res, body){
			if(err){
				reject(err);
			}else{				
				if(res.statusCode === 200){					
					resolve(body);
				}else{
					reject(body);
				}
			}
		});
	})	
}

xnat.uploadConvertedImage = function(projectid, subjectid, experimentid, scanid, filename){
	return new Promise(function(resolve, reject){

		var params = {
			inbody: true
		}

		var options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/files/" + path.basename(filename) + "?" + qs.stringify(params),
			method: "PUT",
			jar: xnat.jar,
			body: fs.readFileSync(filename)
		}

		request(options, function(err, res, body){
			if(err){
				reject(err);
			}else{				
				if(res.statusCode === 200){
					console.log("File imported");
					resolve(body);
				}else{
					reject(body);
				}
			}
		});
	})	
}

xnat.getScanFiles = function(projectid, subjectid, experimentid, scanid){
	return new Promise(function(resolve, reject){

		var params = {
			format: "json"
		}

		var options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/files?" + qs.stringify(params),
			method: "GET",
			jar: xnat.jar
		}

		request(options, function(err, res, body){
			if(err){
				reject(err);
			}else{				
				try{
					if(res.statusCode === 200){
						var images = JSON.parse(body);
						resolve(images.ResultSet.Result);
					}else{
						reject(body);
					}
				}catch(e){
					console.error("xnat.getScanFiles", e);
					reject(e);
				}
				
			}
		});
	});	
}

xnat.deleteFile = function(uri){
	return new Promise(function(resolve, reject){

		var options = {
			url: xnat.getXnatUrl() + uri,
			method: "DELETE",
			jar: xnat.jar
		}

		request(options, function(err, res, body){
			if(err){
				reject(err);
			}else{				
				try{
					if(res.statusCode === 200){
						console.log("File deleted")
						resolve(body);
					}else{
						reject(body);
					}
				}catch(e){
					console.error("xnat.getScanFiles", e);
					reject(e);
				}
				
			}
		});
	});
}

xnat.triggerPipelines = function(projectid, subjectid, experimentid){
	return new Promise(function(resolve, reject){		

		var params = {			
			triggerPipelines: true
		}

		var options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "?" + qs.stringify(params),
			method: "PUT",
			jar: xnat.jar
		}

		console.log(options);

		request(options, function(err, res, body){
			if(err){
				reject(err);
			}else{				
				if(res.statusCode === 200){					
					resolve(body);
				}else{
					reject(body);
				}
			}
		});
	})	
}

xnat.prearchive = function(){
	return new Promise(function(resolve, reject){
		"/data/prearchive/projects"
	})
}

xnat.logout = function(){
	if(xnat.jar){
		return new Promise(function(resolve, reject){
			var options = {
				url: xnat.getXnatUrl() + "/data/JSESSION",
				method: "DELETE",
				jar: xnat.jar
			}

			request(options, function(err, res, body){
				if(err){				
					reject(err);
				}else{				
					if(res.statusCode === 200){
						resolve(true);
					}else{
						reject(body);
					}
				}
			});
		});
	}else{
		return Promise.resolve(true);
	}
	
}

xnat.findFiles = function(directory){
	return new Promise(function(resolve, reject){
		if(xnat.useDCMExtension){
			console.log("Searching DICOM files with .dcm extension");
			var files = find.file(/\.dcm$/, directory, function(files){
				resolve(files)
			})
			.error(function(err){
				reject(err);
			});
		}else{
			console.log("Searching DICOM files");
			var files = find.file(directory, function(files){
				resolve(files)
			})
			.error(function(err){
				reject(err);
			});
		}
		
	})
}

xnat.promptUsernamePassword = function(){
    return new Promise(function(resolve, reject){
        var schema = {
            properties: {
                user: {
                    message: 'Username',
                    required: true
                },
                password: {                    
                    hidden: true,
                    required: true
                }
            }
        };
        prompt.start();
        prompt.get(schema, function (err, result) {
        	if(err){
        		reject(err);
        	}else{
        		resolve(result);
        	}
        });
    });
}

xnat.promptXnatUrl = function(){
	return new Promise(function(resolve, reject){
        var schema = {
            properties: {
                server: {
                    message: 'Xnat url',
                    required: true
                }
            }
        };
        prompt.start();
        prompt.get(schema, function (err, result) {
        	if(err){
        		reject(err);
        	}else{
        		resolve(result);
        	}
        });
    });
}

xnat.writeConfFile = function(conf){
    var confpath = path.join(os.homedir(), '.xnat.json');
    console.log("Writting configuration file with to:", confpath);
    console.log("You won't need to type the server information next time.");
    console.log("If you have authentication problems in the future or change password, please type the server url again. You will be prompted to write your username and password again.");

    fs.writeFileSync(confpath, JSON.stringify(conf));
}

xnat.setScanQualityLabels = function(projectid, labelfilename){
	return new Promise(function(resolve, reject){

		var params = {
			inbody: true
		}
		var options = {
			url: xnat.getXnatUrl() + "/REST/projects/" + projectid + "/config/scan-quality/labels?" + qs.stringify(params),
			method: "PUT",
			jar: xnat.jar,
			data: fs.readFileSync(labelfilename)
		}

		request(options, function(err, res, body){
			if(err){
				reject(err);
			}else{
				if(res.statusCode === 200){					
					resolve(body);
				}else{
					reject(body);
				}
			}
		});
	});
}


xnat.upload = function(){
	require(path.join(__dirname, 'upload'))(xnat);
}

xnat.importConverted = function(){
	require(path.join(__dirname, 'importConverted'))(xnat);
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

xnat.setXnatUrlAndLogin = function(server, promptlogin){

	var loginprom = undefined;
	if(server){

	    var conf = {};
	    conf.server = server;

	    loginprom = xnat.promptUsernamePassword()
	    .then(function(user){
	    	conf.user = user;
	        xnat.writeConfFile(conf);
	        return conf;
	    });
	}else{
	    loginprom = getConfigFile()
	    .catch(function(err){
	    	console.error(err);
	    	return xnat.promptXnatUrl()
	    	.then(function(conf){
	    		if(!promptlogin){
	    			return xnat.promptUsernamePassword()
	    			.then(function(user){
				    	conf.user = user;
				        xnat.writeConfFile(conf);
				        return conf;
				    });
	    		}else{
	    			return conf;
	    		}
	    	});
	    })
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

	return loginprom
	.then(function(conf){
		console.log("Setting server url to ", conf.server);
		xnat.setXnatUrl(conf.server);
		console.log("Login to xnat.", conf.server);
		return xnat.login(conf.user);
	});
	
}

_.extend(this, xnat);