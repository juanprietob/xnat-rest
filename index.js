var request = require('request');
var Promise = require('bluebird');
var _ = require('underscore');
var path = require('path');
var fs = require('fs');
var dicomjs = require('dicomjs');
var qs = require('querystring');
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
					reject(res);
				}
				
			}
		});
	})
}

xnat.dicomDump = function(filename){
	return new Promise(function(resolve, reject){
		dicomjs.parseFile(filename, function (err, dcmData) {
		    
		 
		    if (!err) {
		        resolve(dcmData);
		    } else {
		        console.log(err);
		    }
		});
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

		console.log(options)

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

xnat.logout = function(user){
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
}

_.extend(this, xnat);