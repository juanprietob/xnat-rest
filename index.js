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

xnat.uploadImage = function(projectid, subjectid, sessionid, filename){
	return new Promise(function(resolve, reject){		

		var params = {
			inbody: true,
			dest: "/archive/projects/" + projectid,
			"import-handler" : "gradual-DICOM",
			SUBJECT_ID: subjectid,
			EXPT_LABEL: sessionid
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
		console.log("Searching DICOM files with .dcm extension");
		var files = find.file(/\.dcm$/, directory, function(files){
			resolve(files)
		})
		.error(function(err){
			reject(err);
		});
	})
}

xnat.getUsernamePassword = function(){
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

xnat.writeConfFile = function(conf){
    var confpath = path.join(os.homedir(), '.xnat.json');
    console.log("Writting configuration file with to:", confpath);
    console.log("You won't need to type the server information next time.");
    console.log("If you have authentication problems in the future or change password, please type the server url again. You will be prompted to write your username and password again.");

    fs.writeFileSync(confpath, JSON.stringify(conf));
}

xnat.upload = function(){
	require(path.join(__dirname, 'upload'))(xnat);
}

_.extend(this, xnat);