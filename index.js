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

var xnat = {
	agentOptions : {
		rejectUnauthorized: false
	}
};

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

xnat.setAgentOptions = function(agentOptions){
	xnat.agentOptions = agentOptions
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
			auth:user,
			agentOptions: xnat.agentOptions
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
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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
		};		

		var options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "?" + qs.stringify(params),
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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

xnat.setSubject = function(projectid, subjectid, params){
	return new Promise(function(resolve, reject){
		if(_.isObject(params)){
			var options = {
				url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "?" + qs.stringify(params),
				method: 'PUT',
				jar: xnat.jar,
				agentOptions: xnat.agentOptions
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
		}else{
			reject("The parameters must be an object to set the subject's properties");
		}
	})	
}

xnat.setExperiment = function(projectid, subjectid, experimentid, params){
	return new Promise(function(resolve, reject){
		if(_.isObject(params)){
			var options = {
				url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid +"?" + qs.stringify(params),
				method: 'PUT',
				jar: xnat.jar,
				agentOptions: xnat.agentOptions
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
		}else{
			reject("The parameters must be an object to set the subject's properties");
		}
	})	
}

xnat.getSubjectData = function(projectid, subjectid){
	return new Promise(function(resolve, reject){

		var params = {			
			xsiType: "xnat:subjectData",
			format: "json"
		};		

		var options = {
			url: xnat.getXnatUrl() + "/data/projects/" + projectid + "/subjects/" + subjectid + "?" + qs.stringify(params),
			method: 'GET',
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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

xnat.getSubjectFiles = function(projectid, subjectid){
	return new Promise(function(resolve, reject){

		var params = {
			format: "json"
		};		

		var options = {
			url: xnat.getXnatUrl() + "/data/projects/" + projectid + "/subjects/" + subjectid + "/files?" + qs.stringify(params),
			method: 'GET',
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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

xnat.getSubjectExperiment = function(projectid, subjectid, experimentid){
	return xnat.getSubjectSession(projectid, subjectid, experimentid);
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
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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
			body: fs.readFileSync(filename),
			agentOptions: xnat.agentOptions
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
			body: fs.readFileSync(filename),
			agentOptions: xnat.agentOptions
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

xnat.copyResource = function(projectid, source_subjectid, source_experimentid, source_scanid, source_resourceid, source_filename, dest_subjectid, dest_experimentid, dest_scanid, dest_resourceid, dest_filename){
	return new Promise(function(resolve, reject){

		var params = {
			overwrite: "append"
		}
		
		var source_options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + source_subjectid + "/experiments/" + source_experimentid + "/scans/" + source_scanid + "/resources/" + source_resourceid + "/files/" + source_filename,
			method: "GET",
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
		}

		var dest_options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + dest_subjectid + "/experiments/" + dest_experimentid + "/scans/" + dest_scanid + "/resources/" + dest_resourceid + "/files/" + dest_filename + "?" + qs.stringify(params),
			method: "PUT",
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
		}

		var source_req = request(source_options)
		.pipe(request(dest_options, function(err, res, body){
			if(err){
				reject(err);
			}else{				
				if(res.statusCode === 200){
					console.log("File copied");
					resolve(body);
				}else{
					reject(body);
				}
			}
		}));

		source_req.on('response', function (res) {
			if(res.statusCode === 400){
				reject("File not found:" + source_options.url);
			}
		});
	})	
}

xnat.moveResource = function(projectid, source_subjectid, source_experimentid, source_scanid, source_resourceid, source_filename, dest_subjectid, dest_experimentid, dest_scanid, dest_resourceid, dest_filename){
	return xnat.copyResource(projectid, source_subjectid, source_experimentid, source_scanid, source_resourceid, source_filename, dest_subjectid, dest_experimentid, dest_scanid, dest_resourceid, dest_filename)
	.then(function(){
		return xnat.deleteResourceFile(projectid, source_subjectid, source_experimentid, source_scanid, source_resourceid, source_filename);
	})
}

xnat.deleteResourceFile = function(projectid, subjectid, experimentid, scanid, resourceid, filename){
	return new Promise(function(resolve, reject){
		var options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/resources/" + resourceid + "/files/" + filename,
			method: "DELETE",
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
		}

		request(options, function(err, res, body){
			if(err){
				reject(err);
			}else{				
				if(res.statusCode === 200){
					console.log("File deleted");
					resolve(body);
				}else{
					reject(body);
				}
			}
		});
	});
}

xnat.createResources = function(projectid, subjectid, experimentid, scanid, resourceName){
	return new Promise(function(resolve, reject){

		var options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/resources/" + resourceName,
			method: "PUT",
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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

xnat.getResourceFiles = function(projectid, subjectid, experimentid, scanid, resource){
	return new Promise(function(resolve, reject){

		var params = {
			format: "json"
		}

		var options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/resources/" + resource + "/files?" + qs.stringify(params),
			method: "GET",
			jar: xnat.jar,
			agentOptions: xnat.agentOptions,
			headers: {
				'content-type': 'application/json'
			}
		}

		request(options, function(err, res, body){
			if(err){
				reject(err);
			}else{				
				if(res.statusCode === 200){
					if(_.isObject(body)){
						resolve(body);
					}else{
						resolve(JSON.parse(body));
					}
				}else{
					reject(body);
				}
			}
		});
	})	
	
}

xnat.getResources = function(projectid, subjectid, experimentid, scanid){
	return new Promise(function(resolve, reject){

		var params = {
			format: "json"
		}

		var options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/resources?" + qs.stringify(params),
			method: "GET",
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
		}

		request(options, function(err, res, body){
			if(err){
				reject(err);
			}else{				
				if(res.statusCode === 200){
					if(_.isObject(body)){
						resolve(body);
					}else{
						resolve(JSON.parse(body));
					}
				}else{
					reject(body);
				}
			}
		});
	})	
	
}

xnat.uploadResourceFile = function(projectid, subjectid, experimentid, scanid, resourceid, filename){
	return new Promise(function(resolve, reject){

		var params = {
			inbody: true
		}

		var options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/" + scanid + "/resources/" + resourceid + "/files/" + path.basename(filename) + "?" + qs.stringify(params),
			method: "PUT",
			jar: xnat.jar,
			body: fs.readFileSync(filename),
			agentOptions: xnat.agentOptions
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
	});	
}

xnat.search = function(id){
	return new Promise(function(resolve, reject){

		var params = {
			format: "json",
			ID: id
		}

		var options = {
			url: xnat.getXnatUrl() + "/data/search/elements/xnat:subjectData?" + qs.stringify(params),
			method: "GET",
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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

xnat.deleteConvertedImage = function(projectid, subjectid, experimentid, scanid, filename){
	return new Promise(function(resolve, reject){

		var options = {
			url: xnat.getXnatUrl() + "/data/experiments/" + experimentid + "/scans/" + scanid + "/resources",
			method: "GET",
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
		}

		request(options, function(err, res, body){
			if(err){
				reject(err);
			}else{				
				if(res.statusCode === 200){

					var resultset = JSON.parse(body);
					var resultsetcontent = _.find(resultset.ResultSet.Result, function(result){
						return result.content == "RAW";
					});

					if(resultsetcontent && resultsetcontent.xnat_abstractresource_id){
						var options = {
							url: xnat.getXnatUrl() + "/data/experiments/" + experimentid + "/scans/" + scanid + "/resources/" + resultsetcontent.xnat_abstractresource_id + "/files/" + path.basename(filename),
							method: "DELETE",
							jar: xnat.jar,
							agentOptions: xnat.agentOptions
						}

						request(options, function(err, res, body){
							if(err){
								reject(err);
							}else{				
								if(res.statusCode === 200){
									console.log("File deleted");
									resolve(body);
								}else{
									reject(body);
								}
							}
						});
					}else{
						reject("No RAW content found in session", "/data/experiments/" + experimentid + "/scans/" + scanid + "/resources");
					}

					
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
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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

xnat.getScans = function(projectid, subjectid, experimentid){
	return new Promise(function(resolve, reject){

		var params = {
			format: "json"
		}

		var options = {
			url: xnat.getXnatUrl() + "/data/archive/projects/" + projectid + "/subjects/" + subjectid + "/experiments/" + experimentid + "/scans/?" + qs.stringify(params),
			method: "GET",
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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
			jar: xnat.jar,
			agentOptions: xnat.agentOptions
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
				jar: xnat.jar,
				agentOptions: xnat.agentOptions
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
			data: fs.readFileSync(labelfilename),
			agentOptions: xnat.agentOptions
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

xnat.deleteConverted = function(){
	require(path.join(__dirname, 'deleteConverted'))(xnat);
}

xnat.changeSubjectLabel = function(){
	require(path.join(__dirname, 'changeSubjectLabel'))(xnat);
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

xnat.start = function(){
	return xnat.setXnatUrlAndLogin();
}

_.extend(this, xnat);
